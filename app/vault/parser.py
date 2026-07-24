"""
Parse Eagle vault on disk: library metadata.json (folder tree) and
images/*.info/metadata.json (items). Build in-memory cache for API.
"""
import colorsys
import hashlib
import json
import math
import threading
import time
from pathlib import Path
from typing import Any
from urllib.parse import urlparse

from app.config import VAULT_ROOT
from app.vault.models import FolderNode, ItemInfo, SmartFolderNode

# 应用版本（单一来源 = pyproject.toml），用于前端展示；解析失败回退 "dev"。
try:
    from importlib.metadata import version as _pkg_version
    APP_VERSION = _pkg_version("eagle-viewer")
except Exception:  # pragma: no cover - 仅未安装包时触发
    APP_VERSION = "dev"

# In-memory cache (filled on first request or startup)
_folder_tree: list[FolderNode] = []
_folder_by_id: dict[str, FolderNode] = {}  # folder_id -> node (for path lookup)
_items_by_id: dict[str, ItemInfo] = {}
_items_by_folder: dict[str, list[ItemInfo]] = {}  # folder_id -> items
_items_by_tag: dict[str, list[ItemInfo]] = {}
_tag_summary: list[dict] = []
_folder_counts: dict[str, int] = {}
_locked_folder_ids: set[str] = set()
_smart_folder_tree: list[SmartFolderNode] = []
_smart_folder_by_id: dict[str, SmartFolderNode] = {}
_last_load_stats: dict[str, Any] = {}
_loaded = False
_load_lock = threading.RLock()


def _source_revision(deep: bool = False) -> str:
    """Return a read-only fingerprint of the mounted Eagle library.

    The shallow form is intentionally cheap enough for foreground polling. The
    deep form also includes every item metadata file and is used less often to
    catch tag, note, and palette edits that do not add a new ``.info`` folder.
    """
    root = Path(VAULT_ROOT)
    images_dir = root / "images"
    digest = hashlib.sha256()

    def add_stat(label: str, path: Path) -> None:
        try:
            stat = path.stat()
            value = f"{label}\0{stat.st_mtime_ns}\0{stat.st_size}\n"
        except OSError:
            value = f"{label}\0missing\n"
        digest.update(value.encode("utf-8", errors="surrogatepass"))

    add_stat("library", root / "metadata.json")
    add_stat("images", images_dir)
    if deep and images_dir.is_dir():
        try:
            info_dirs = sorted(
                (entry for entry in images_dir.iterdir() if entry.is_dir() and entry.name.endswith(".info")),
                key=lambda entry: entry.name,
            )
        except OSError:
            info_dirs = []
        for info_dir in info_dirs:
            add_stat(info_dir.name, info_dir / "metadata.json")
    return digest.hexdigest()[:24]

# Used only for preferring image/video as thumbnail; main file can be any type
PREFERRED_MEDIA_EXTENSIONS = {
    ".bmp", ".gif", ".heic", ".heif", ".ico", ".jpeg", ".jpg", ".png",
    ".svg", ".tif", ".tiff", ".webp", ".avif", ".jfif", ".jxl",
    ".mp4", ".webm", ".mov", ".m4v", ".mp3", ".wav", ".m4a", ".aac", ".flac", ".ogg",
    ".pdf", ".txt", ".doc", ".docx", ".xls", ".xlsx", ".ppt", ".pptx",
    ".psd", ".ai", ".sketch", ".fig", ".xd", ".ttf", ".otf", ".woff", ".woff2",
}

# Type filter: image, video, document, audio, other (ext lowercase without dot)
IMAGE_EXTS = {"bmp", "gif", "heic", "heif", "ico", "jpeg", "jpg", "png", "svg", "tif", "tiff", "webp", "avif", "jfif", "jxl"}
VIDEO_EXTS = {"mp4", "webm", "mov", "m4v", "avi", "mkv", "flv", "wmv"}
AUDIO_EXTS = {"mp3", "wav", "m4a", "aac", "flac", "ogg", "wma"}
DOCUMENT_EXTS = {"pdf", "txt", "doc", "docx", "xls", "xlsx", "ppt", "pptx", "xmind", "mindnode", "graffle", "numbers", "psd", "ai", "sketch", "fig", "xd", "ttf", "otf", "woff", "woff2"}
VALID_TYPE_FILTERS = {"all", "image", "video", "document", "audio", "other"}
VALID_SORT_FIELDS = {"mtime", "btime", "name", "size", "ext"}
VALID_SORT_DIR = {"asc", "desc"}


def _load_library_metadata() -> dict[str, Any]:
    path = Path(VAULT_ROOT) / "metadata.json"
    if not path.exists():
        return {"folders": []}
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def _normalize_folders_data(lib: dict[str, Any]) -> list[dict]:
    """Extract folder tree as list of root nodes. Handles array, { children: [] }, single root, or { "0": f0, "1": f1 }."""
    raw = lib.get("folders")
    if isinstance(raw, list):
        return raw
    if isinstance(raw, dict):
        if "children" in raw and isinstance(raw["children"], list):
            return raw["children"]
        if "id" in raw and "children" not in raw:
            return [raw]
        vals = [v for v in raw.values() if isinstance(v, dict) and v.get("id") is not None]
        if vals:
            return vals
    return []


def _collect_locked_folder_ids(folders_data: list[dict]) -> set[str]:
    """Return password-protected folder IDs and every descendant ID."""
    locked: set[str] = set()
    if not folders_data:
        return locked
    is_flat = any("parent" in entry for entry in folders_data)
    if is_flat:
        by_id = {str(entry.get("id")): entry for entry in folders_data if entry.get("id") is not None}
        locked.update(folder_id for folder_id, entry in by_id.items() if entry.get("password"))
        changed = True
        while changed:
            changed = False
            for folder_id, entry in by_id.items():
                parent_id = str(entry.get("parent")) if entry.get("parent") is not None else ""
                if folder_id not in locked and parent_id in locked:
                    locked.add(folder_id)
                    changed = True
        return locked

    def visit(entry: dict, inherited_locked: bool = False) -> None:
        folder_id = str(entry.get("id")) if entry.get("id") is not None else ""
        entry_locked = inherited_locked or bool(entry.get("password"))
        if entry_locked and folder_id:
            locked.add(folder_id)
        for child in entry.get("children", []):
            if isinstance(child, dict):
                visit(child, entry_locked)

    for entry in folders_data:
        visit(entry)
    return locked


def _build_folder_node(data: dict[str, Any], locked_folder_ids: set[str], parent_id: str | None = None) -> FolderNode:
    """Build one node from nested format (has 'children' array). Sets parent so path from root works."""
    node_id = str(data["id"]) if data.get("id") is not None else ""
    node = FolderNode(
        id=node_id,
        name=data.get("name", ""),
        description=data.get("description", ""),
        parent=str(data["parent"]) if data.get("parent") is not None else (str(parent_id) if parent_id else None),
        locked=node_id in locked_folder_ids,
        children=[],
    )
    if node.locked:
        return node
    for child in data.get("children", []):
        child_node = _build_folder_node(child, locked_folder_ids, parent_id=node.id)
        node.children.append(child_node)
    return node


def _build_folder_tree_from_flat(folders_data: list[dict], locked_folder_ids: set[str]) -> list[FolderNode]:
    """Build tree from flat list where each folder has optional 'parent' id."""
    if not folders_data:
        return []
    nodes: dict[str, FolderNode] = {}
    for f in folders_data:
        nid = str(f["id"]) if f.get("id") is not None else ""
        pid = f.get("parent")
        n = FolderNode(
            id=nid,
            name=f.get("name", ""),
            description=f.get("description", ""),
            parent=str(pid) if pid is not None else None,
            locked=nid in locked_folder_ids,
            children=[],
        )
        nodes[n.id] = n
    roots: list[FolderNode] = []
    for n in nodes.values():
        if n.parent is None or n.parent == "" or n.parent not in nodes:
            roots.append(n)
        elif not nodes[n.parent].locked:
            nodes[n.parent].children.append(n)
    return roots


def _build_folder_tree(folders_data: list[dict], locked_folder_ids: set[str]) -> list[FolderNode]:
    """Build folder tree. Supports both nested (children) and flat (parent) format."""
    if not folders_data:
        return []
    first = folders_data[0]
    # If any folder has 'parent' key, treat as flat list
    if "parent" in first or any("parent" in f for f in folders_data):
        return _build_folder_tree_from_flat(folders_data, locked_folder_ids)
    roots: list[FolderNode] = []
    for f in folders_data:
        roots.append(_build_folder_node(f, locked_folder_ids, parent_id=None))
    return roots


def _normalize_smart_folders_data(lib: dict[str, Any]) -> list[dict]:
    raw = lib.get("smartFolders")
    if isinstance(raw, list):
        return [entry for entry in raw if isinstance(entry, dict)]
    if isinstance(raw, dict):
        if isinstance(raw.get("children"), list):
            return [entry for entry in raw["children"] if isinstance(entry, dict)]
        return [entry for entry in raw.values() if isinstance(entry, dict)]
    return []


def _build_smart_folder_node(data: dict[str, Any]) -> SmartFolderNode:
    conditions = data.get("conditions") if isinstance(data.get("conditions"), list) else []
    return SmartFolderNode(
        id=str(data.get("id") or ""),
        name=str(data.get("name") or ""),
        description=str(data.get("description") or ""),
        conditions=[entry for entry in conditions if isinstance(entry, dict)],
        children=[_build_smart_folder_node(child) for child in data.get("children", []) if isinstance(child, dict)],
    )


def _build_smart_folder_tree(lib: dict[str, Any]) -> list[SmartFolderNode]:
    return [_build_smart_folder_node(entry) for entry in _normalize_smart_folders_data(lib) if entry.get("id")]


def _collect_smart_folder_by_id(nodes: list[SmartFolderNode], out: dict[str, SmartFolderNode]) -> None:
    for node in nodes:
        if node.id:
            out[node.id] = node
        _collect_smart_folder_by_id(node.children, out)


def _find_main_file(info_dir: Path, meta: dict) -> tuple[str, str]:
    """Return (main_file_path, thumbnail_path). Any file except metadata/thumbnail is valid as main."""
    main_path = ""
    main_candidate_media = ""  # prefer image/video for "main" if multiple
    thumb_path = ""
    for f in sorted(info_dir.iterdir(), key=lambda p: p.name.lower()):
        if f.is_dir():
            continue
        name_lower = f.name.lower()
        if name_lower == "metadata.json":
            continue
        if "thumbnail" in name_lower:
            thumb_path = str(f.resolve())
            continue
        resolved = str(f.resolve())
        if not main_path:
            main_path = resolved
        if f.suffix.lower() in PREFERRED_MEDIA_EXTENSIONS and not main_candidate_media:
            main_candidate_media = resolved
    # Prefer a known media file as main when present (for preview); else use first file
    if main_candidate_media:
        main_path = main_candidate_media
    return main_path, thumb_path


def _normalize_item_folder_ids(raw_folders: Any) -> list[str]:
    """Normalize item metadata 'folders' to list of folder id strings. Handles array, dict, or single value."""
    if raw_folders is None:
        return []
    if isinstance(raw_folders, list):
        return [str(x) for x in raw_folders if x is not None]
    if isinstance(raw_folders, dict):
        # e.g. {"0": "id1", "1": "id2"} -> use values
        return [str(v) for v in raw_folders.values() if v is not None]
    return [str(raw_folders)]


def _normalize_palettes(value: Any) -> list[dict]:
    """Keep Eagle palette colors and ratios while discarding UI-only metadata."""
    if not isinstance(value, list):
        return []
    out = []
    for entry in value[:16]:
        if not isinstance(entry, dict):
            continue
        color = entry.get("color")
        if not isinstance(color, list) or len(color) != 3:
            continue
        try:
            rgb = [min(255, max(0, int(channel))) for channel in color]
            ratio = max(0.0, float(entry.get("ratio") or 0))
        except (TypeError, ValueError):
            continue
        out.append({"color": rgb, "ratio": ratio})
    return out


def _normalize_source_domain(value: str) -> str:
    raw = (value or "").strip().lower()
    if not raw:
        return ""
    candidate = raw if "://" in raw else f"https://{raw}"
    host = urlparse(candidate).hostname or raw.split("/", 1)[0]
    if host.startswith("www."):
        host = host[4:]
    return host[:255]


def _nonnegative_float(value: Any) -> float:
    try:
        return max(0.0, float(value or 0))
    except (TypeError, ValueError):
        return 0.0


def _load_items(locked_folder_ids: set[str]) -> tuple[dict[str, ItemInfo], dict[str, list[ItemInfo]], dict[str, int]]:
    images_dir = Path(VAULT_ROOT) / "images"
    by_id: dict[str, ItemInfo] = {}
    by_folder: dict[str, list[ItemInfo]] = {}
    stats = {
        "info_dirs": 0,
        "loaded_items": 0,
        "skipped_missing_metadata": 0,
        "skipped_bad_metadata": 0,
        "skipped_deleted": 0,
        "skipped_locked_items": 0,
        "skipped_missing_file": 0,
    }

    if not images_dir.exists():
        return by_id, by_folder, stats

    for subdir in images_dir.iterdir():
        if not subdir.is_dir() or not subdir.name.endswith(".info"):
            continue
        stats["info_dirs"] += 1
        meta_path = subdir / "metadata.json"
        if not meta_path.exists():
            stats["skipped_missing_metadata"] += 1
            continue
        try:
            with open(meta_path, "r", encoding="utf-8") as f:
                meta = json.load(f)
        except (json.JSONDecodeError, OSError):
            stats["skipped_bad_metadata"] += 1
            continue
        if not isinstance(meta, dict) or "id" not in meta:
            stats["skipped_bad_metadata"] += 1
            continue
        if meta.get("isDeleted"):
            stats["skipped_deleted"] += 1
            continue

        raw_folders = meta.get("folders", [])
        folder_ids = _normalize_item_folder_ids(raw_folders)
        if any(folder_id in locked_folder_ids for folder_id in folder_ids):
            stats["skipped_locked_items"] += 1
            continue

        main_path, thumb_path = _find_main_file(subdir, meta)
        if not main_path:
            stats["skipped_missing_file"] += 1
            continue
        item = ItemInfo(
            id=meta["id"],
            name=meta.get("name", ""),
            ext=meta.get("ext", ""),
            folders=folder_ids,
            width=meta.get("width", 0),
            height=meta.get("height", 0),
            size=meta.get("size", 0),
            tags=meta.get("tags", []),
            url=meta.get("url", ""),
            annotation=meta.get("annotation", ""),
            palettes=_normalize_palettes(meta.get("palettes")),
            duration=_nonnegative_float(meta.get("duration")),
            bpm=_nonnegative_float(meta.get("bpm")),
            btime=meta.get("btime", meta.get("creationTime", 0)),
            mtime=meta.get("modificationTime", meta.get("mtime", 0)),
            main_file_path=main_path,
            thumbnail_path=thumb_path,
        )
        by_id[item.id] = item
        stats["loaded_items"] += 1
        for fid in folder_ids:
            by_folder.setdefault(fid, []).append(item)

    return by_id, by_folder, stats


def _build_tag_index(items_by_id: dict[str, ItemInfo]) -> tuple[dict[str, list[ItemInfo]], list[dict]]:
    by_tag: dict[str, list[ItemInfo]] = {}
    counts: dict[str, int] = {}
    for item in items_by_id.values():
        for tag in item.tags or []:
            if not tag:
                continue
            by_tag.setdefault(tag, []).append(item)
            counts[tag] = counts.get(tag, 0) + 1
    summary = [
        {"name": name, "count": count}
        for name, count in sorted(counts.items(), key=lambda pair: (-pair[1], pair[0].lower()))
    ]
    return by_tag, summary


def _collect_folder_by_id(nodes: list[FolderNode], out: dict) -> None:
    for n in nodes:
        if n.id:
            out[n.id] = n
            # Index by int too when id is numeric (Eagle may use number in JSON)
            try:
                if str(int(n.id)) == n.id:
                    out[int(n.id)] = n
            except (ValueError, TypeError):
                pass
        _collect_folder_by_id(n.children, out)


def _find_node_in_tree(nodes: list[FolderNode], folder_id: str) -> FolderNode | None:
    """Find folder node by id by walking the tree (fallback when not in _folder_by_id)."""
    fid = str(folder_id).strip() if folder_id is not None else ""
    if not fid:
        return None
    for n in nodes:
        if str(n.id).strip() == fid:
            return n
        found = _find_node_in_tree(n.children, folder_id)
        if found:
            return found
    return None


def _path_from_node(node: FolderNode) -> str:
    """Build path string from node to root using parent chain."""
    parts: list[str] = []
    while node:
        parts.append(node.name or "(未命名)")
        if not node.parent:
            break
        parent = _folder_by_id.get(str(node.parent))
        if not parent:
            break
        node = parent
    parts.reverse()
    return " / ".join(parts)


def _get_folder_path(folder_id: str) -> str:
    """Return path string like 'Root / Sub / Leaf' for the folder."""
    fid = str(folder_id).strip() if folder_id is not None else ""
    if not fid:
        return ""
    node = _folder_by_id.get(fid)
    if not node:
        # Try int key in case library/item use numeric id
        try:
            if str(int(fid)) == fid:
                node = _folder_by_id.get(int(fid))
        except (ValueError, TypeError):
            pass
    if not node:
        node = _find_node_in_tree(_folder_tree, fid)
        if node and fid and fid not in _folder_by_id:
            _folder_by_id[fid] = node
    if not node:
        return ""
    return _path_from_node(node)


def get_folder_path(folder_id: str) -> str:
    ensure_loaded()
    return _get_folder_path(folder_id)


def get_folder_paths_for_item(item: ItemInfo) -> list[str]:
    """Return list of folder path strings (root to leaf) for each folder this item belongs to."""
    ensure_loaded()
    paths: list[str] = []
    for fid in item.folders or []:
        p = _get_folder_path(fid)
        if p and p not in paths:
            paths.append(p)
    return paths


def get_subfolders(folder_id: str) -> list[dict]:
    """Return direct children of the folder: [{id, name}, ...]."""
    ensure_loaded()
    fid = str(folder_id) if folder_id is not None else ""
    node = _folder_by_id.get(fid)
    if not node or node.locked:
        return []
    return [{"id": c.id, "name": c.name or "(未命名)", "locked": c.locked} for c in node.children]


def _compute_folder_counts(
    nodes: list[FolderNode],
    items_by_folder: dict[str, list[ItemInfo]],
) -> dict[str, int]:
    counts: dict[str, int] = {}

    def walk(node: FolderNode) -> int:
        total = len(items_by_folder.get(node.id, []))
        for child in node.children:
            total += walk(child)
        counts[node.id] = total
        return total

    for node in nodes:
        walk(node)
    return counts


def load_vault() -> None:
    """Load vault from disk and populate global cache."""
    global _folder_tree, _folder_by_id, _smart_folder_tree, _smart_folder_by_id, _items_by_id, _items_by_folder, _items_by_tag, _tag_summary, _folder_counts, _locked_folder_ids, _last_load_stats, _loaded
    started = time.time()
    lib = _load_library_metadata()
    folders_data = _normalize_folders_data(lib)
    locked_folder_ids = _collect_locked_folder_ids(folders_data)
    folder_tree = _build_folder_tree(folders_data, locked_folder_ids)
    folder_by_id: dict[str, FolderNode] = {}
    _collect_folder_by_id(folder_tree, folder_by_id)
    smart_folder_tree = _build_smart_folder_tree(lib)
    smart_folder_by_id: dict[str, SmartFolderNode] = {}
    _collect_smart_folder_by_id(smart_folder_tree, smart_folder_by_id)
    items_by_id, items_by_folder, load_stats = _load_items(locked_folder_ids)
    items_by_tag, tag_summary = _build_tag_index(items_by_id)
    folder_counts = _compute_folder_counts(folder_tree, items_by_folder)
    elapsed_ms = int((time.time() - started) * 1000)
    cache_stats = {
        "folders": len(folder_by_id),
        "items": len(items_by_id),
        "tags": len(items_by_tag),
        "smartFolders": len(smart_folder_by_id),
        "lockedFolders": len(locked_folder_ids),
    }

    with _load_lock:
        _folder_tree = folder_tree
        _folder_by_id = folder_by_id
        _smart_folder_tree = smart_folder_tree
        _smart_folder_by_id = smart_folder_by_id
        _items_by_id = items_by_id
        _items_by_folder = items_by_folder
        _items_by_tag = items_by_tag
        _tag_summary = tag_summary
        _folder_counts = folder_counts
        _locked_folder_ids = locked_folder_ids
        _last_load_stats = {
            **cache_stats,
            **load_stats,
            "loadDurationMs": elapsed_ms,
            "loadedAt": int(time.time() * 1000),
            "vaultRoot": str(VAULT_ROOT),
            "sourceRevision": _source_revision(deep=True),
            "sourceShallowRevision": _source_revision(deep=False),
        }
        _loaded = True


def ensure_loaded() -> None:
    if _loaded:
        return
    with _load_lock:
        if not _loaded:
            load_vault()


def get_cache_stats() -> dict[str, int]:
    ensure_loaded()
    return dict(_last_load_stats)


def get_library_status(deep: bool = False) -> dict[str, Any]:
    """Report whether the mounted library changed since the last index load."""
    ensure_loaded()
    cached_key = "sourceRevision" if deep else "sourceShallowRevision"
    observed_revision = _source_revision(deep=deep)
    cached_revision = str(_last_load_stats.get(cached_key) or "")
    return {
        "ok": True,
        "changed": bool(cached_revision and observed_revision != cached_revision),
        "mode": "deep" if deep else "shallow",
        "revision": cached_revision,
        "observedRevision": observed_revision,
        "version": APP_VERSION,
        "loadedAt": int(_last_load_stats.get("loadedAt") or 0),
        "stats": {
            "folders": int(_last_load_stats.get("folders") or 0),
            "items": int(_last_load_stats.get("items") or 0),
            "tags": int(_last_load_stats.get("tags") or 0),
        },
    }


def get_duplicate_groups(limit: int = 50) -> list[dict]:
    ensure_loaded()
    groups: dict[tuple[int, int, int, str], list[ItemInfo]] = {}
    for item in _items_by_id.values():
        key = (item.size or 0, item.width or 0, item.height or 0, (item.ext or "").lower())
        if not key[0]:
            continue
        groups.setdefault(key, []).append(item)
    out = []
    for key, items in groups.items():
        if len(items) < 2:
            continue
        out.append({
            "key": {"size": key[0], "width": key[1], "height": key[2], "ext": key[3]},
            "count": len(items),
            "items": [item_to_dict(it, include_folder_paths=True) for it in items],
        })
    out.sort(key=lambda g: (-g["count"], -g["key"]["size"]))
    return out[:max(1, min(limit, 200))]


def get_palette_atlas(limit: int = 36) -> dict[str, Any]:
    """Aggregate Eagle palette metadata into a stable library color atlas."""
    ensure_loaded()
    hue_names = ["红", "橙", "黄", "黄绿", "绿", "青绿", "青", "天蓝", "蓝", "紫", "洋红", "玫红"]
    clusters: dict[str, dict[str, Any]] = {}
    colored_item_ids: set[str] = set()
    palette_samples = 0

    for item in _items_by_id.values():
        for palette in item.palettes or []:
            color = palette.get("color") if isinstance(palette, dict) else None
            if not isinstance(color, list) or len(color) != 3:
                continue
            try:
                rgb = tuple(max(0, min(255, int(channel))) for channel in color)
                weight = max(0.01, float(palette.get("ratio") or 1.0))
            except (TypeError, ValueError):
                continue
            hue, saturation, value = colorsys.rgb_to_hsv(*(channel / 255 for channel in rgb))
            if saturation < 0.16:
                band = "dark" if value < 0.32 else ("light" if value > 0.72 else "mid")
                key = f"neutral-{band}"
                label = {"dark": "暗部", "mid": "灰阶", "light": "亮部"}[band]
                order = 100 + {"dark": 0, "mid": 1, "light": 2}[band]
            else:
                sector = int((hue * 12 + 0.5) % 12)
                band = "dark" if value < 0.38 else ("light" if value > 0.76 else "mid")
                key = f"h{sector}-{band}"
                label = hue_names[sector] + {"dark": "深色", "mid": "中色", "light": "浅色"}[band]
                order = sector * 3 + {"dark": 0, "mid": 1, "light": 2}[band]
            cluster = clusters.setdefault(key, {
                "key": key,
                "label": label,
                "order": order,
                "weight": 0.0,
                "rgbWeight": [0.0, 0.0, 0.0],
                "itemIds": set(),
                "samples": [],
            })
            cluster["weight"] += weight
            for index, channel in enumerate(rgb):
                cluster["rgbWeight"][index] += channel * weight
            if item.id not in cluster["itemIds"] and len(cluster["samples"]) < 4:
                cluster["samples"].append(item_to_dict(item, include_folder_paths=True))
            cluster["itemIds"].add(item.id)
            colored_item_ids.add(item.id)
            palette_samples += 1

    output = []
    for cluster in clusters.values():
        total_weight = max(cluster["weight"], 0.01)
        rgb = [round(channel / total_weight) for channel in cluster["rgbWeight"]]
        output.append({
            "key": cluster["key"],
            "label": cluster["label"],
            "order": cluster["order"],
            "hex": "#" + "".join(f"{channel:02X}" for channel in rgb),
            "rgb": rgb,
            "itemCount": len(cluster["itemIds"]),
            "weight": round(cluster["weight"], 2),
            "samples": cluster["samples"],
        })
    output.sort(key=lambda cluster: (cluster["order"], -cluster["weight"], cluster["key"]))
    max_clusters = max(1, min(limit, 72))
    return {
        "coloredItems": len(colored_item_ids),
        "paletteSamples": palette_samples,
        "totalClusters": len(output),
        "clusters": output[:max_clusters],
    }


def get_random_items(seed: str, limit: int = 24, type_filter: str = "all") -> dict[str, Any]:
    """Return a deterministic random walk without modifying or scanning the Vault."""
    ensure_loaded()
    normalized_seed = (seed or "eagle-viewer").strip()[:80] or "eagle-viewer"
    normalized_type = type_filter if type_filter in VALID_TYPE_FILTERS else "all"
    eligible = filter_items_by_type(list(_items_by_id.values()), normalized_type)
    ranked = sorted(
        eligible,
        key=lambda item: hashlib.sha256(f"{normalized_seed}\0{item.id}".encode("utf-8", errors="surrogatepass")).digest(),
    )
    size = max(1, min(limit, 80))
    return {
        "seed": normalized_seed,
        "type": normalized_type,
        "totalEligible": len(eligible),
        "items": [item_to_dict(item, include_folder_paths=True) for item in ranked[:size]],
    }


def _dominant_palette_color(item: ItemInfo) -> tuple[int, int, int] | None:
    palettes = item.palettes or []
    if not palettes:
        return None
    strongest = max(palettes, key=lambda entry: float(entry.get("ratio") or 0))
    color = strongest.get("color")
    if not isinstance(color, list) or len(color) != 3:
        return None
    return int(color[0]), int(color[1]), int(color[2])


def _ratio_closeness(left: float, right: float) -> float:
    if left <= 0 or right <= 0:
        return 0.0
    return math.exp(-abs(math.log(left / right)) * 2.2)


def _similarity_score(source: ItemInfo, candidate: ItemInfo) -> tuple[float, list[str]]:
    score = 0.0
    signals: list[str] = []
    source_type = _item_type(source.ext)
    candidate_type = _item_type(candidate.ext)
    if source_type == candidate_type:
        score += 0.16
        signals.append("同类型")
    if (source.ext or "").lower() == (candidate.ext or "").lower():
        score += 0.12
        signals.append("同格式")

    if source.width and source.height and candidate.width and candidate.height:
        source_ratio = source.width / source.height
        candidate_ratio = candidate.width / candidate.height
        ratio_score = _ratio_closeness(source_ratio, candidate_ratio)
        score += 0.18 * ratio_score
        if ratio_score >= 0.84:
            signals.append("构图接近")
        source_area = source.width * source.height
        candidate_area = candidate.width * candidate.height
        area_score = _ratio_closeness(float(source_area), float(candidate_area))
        score += 0.08 * area_score
        if area_score >= 0.82:
            signals.append("尺寸接近")

    source_color = _dominant_palette_color(source)
    candidate_color = _dominant_palette_color(candidate)
    if source_color and candidate_color:
        distance = math.sqrt(sum((source_color[i] - candidate_color[i]) ** 2 for i in range(3)))
        color_score = max(0.0, 1.0 - distance / 441.7)
        score += 0.28 * (color_score ** 1.7)
        if color_score >= 0.72:
            signals.append("主色接近")

    source_tags = {str(tag).strip().lower() for tag in source.tags or [] if str(tag).strip()}
    candidate_tags = {str(tag).strip().lower() for tag in candidate.tags or [] if str(tag).strip()}
    if source_tags and candidate_tags:
        overlap = source_tags & candidate_tags
        union = source_tags | candidate_tags
        tag_score = len(overlap) / max(1, len(union))
        score += 0.11 * tag_score
        if overlap:
            signals.append("共享标签")

    source_domain = _normalize_source_domain(source.url)
    candidate_domain = _normalize_source_domain(candidate.url)
    if source_domain and source_domain == candidate_domain:
        score += 0.04
        signals.append("同来源")
    if set(source.folders or []) & set(candidate.folders or []):
        score += 0.03
        signals.append("同文件夹")
    return min(score, 1.0), signals


def get_similar_items(item_id: str, limit: int = 12) -> list[dict]:
    """Rank visually/contextually related items using local Eagle metadata only."""
    ensure_loaded()
    source = _items_by_id.get(item_id)
    if not source:
        return []
    ranked = []
    for candidate in _items_by_id.values():
        if candidate.id == source.id:
            continue
        score, signals = _similarity_score(source, candidate)
        if score < 0.12:
            continue
        ranked.append((score, candidate.mtime or 0, candidate, signals))
    ranked.sort(key=lambda entry: (-entry[0], -entry[1], (entry[2].name or "").lower()))
    out = []
    for score, _mtime, item, signals in ranked[:max(1, min(limit, 40))]:
        data = item_to_dict(item, include_folder_paths=True)
        data["similarityScore"] = round(score * 100)
        data["similaritySignals"] = signals[:4]
        out.append(data)
    return out


def get_folder_tree() -> list[FolderNode]:
    ensure_loaded()
    return _folder_tree


def get_item(item_id: str) -> ItemInfo | None:
    ensure_loaded()
    return _items_by_id.get(item_id)


def get_items_in_folder(folder_id: str) -> list[ItemInfo]:
    ensure_loaded()
    fid = str(folder_id) if folder_id is not None else ""
    if fid in _locked_folder_ids:
        return []
    return _items_by_folder.get(fid, [])


def is_folder_locked(folder_id: str) -> bool:
    ensure_loaded()
    return str(folder_id) in _locked_folder_ids


def get_all_items() -> list[ItemInfo]:
    """Return all items (flat list, no folder structure)."""
    ensure_loaded()
    return list(_items_by_id.values())


def get_all_tags() -> list[dict]:
    """Return all tags with counts: [{name, count}, ...] sorted by count desc."""
    ensure_loaded()
    return list(_tag_summary)


def get_smart_folder_tree() -> list[SmartFolderNode]:
    ensure_loaded()
    return _smart_folder_tree


def get_smart_folder(smart_folder_id: str) -> SmartFolderNode | None:
    ensure_loaded()
    return _smart_folder_by_id.get(str(smart_folder_id or ""))


def _smart_rule_actual_values(item: ItemInfo, property_name: str) -> list[Any]:
    key = (property_name or "").strip().lower().replace("_", "")
    if key in {"type", "ext", "extension"}:
        return [(item.ext or "").strip().lower().lstrip(".")]
    if key in {"name", "filename"}:
        return [item.name or ""]
    if key in {"tag", "tags"}:
        return list(item.tags or [])
    if key in {"folder", "folders"}:
        values = list(item.folders or [])
        values.extend(get_folder_paths_for_item(item))
        return values
    if key in {"url", "source", "website"}:
        return [item.url or ""]
    if key in {"annotation", "comment", "note"}:
        return [item.annotation or ""]
    if key in {"width", "height", "size", "btime", "mtime", "creationtime", "modificationtime", "duration", "bpm"}:
        mapped = {"creationtime": "btime", "modificationtime": "mtime"}.get(key, key)
        return [getattr(item, mapped, 0) or 0]
    if key in {"mediatype", "category"}:
        return [_item_type(item.ext)]
    return []


def _smart_rule_targets(rule: dict[str, Any]) -> list[Any]:
    raw = rule.get("value", rule.get("values", ""))
    if isinstance(raw, list):
        return raw
    if isinstance(raw, dict):
        return list(raw.values())
    return [raw]


def _smart_rule_matches(item: ItemInfo, rule: dict[str, Any]) -> bool:
    actual_values = _smart_rule_actual_values(item, str(rule.get("property") or rule.get("key") or ""))
    method = str(rule.get("method") or rule.get("operator") or "equal").strip().lower().replace("_", "").replace("-", "")
    targets = _smart_rule_targets(rule)
    if method in {"empty", "isempty", "notset"}:
        return not any(str(value or "").strip() for value in actual_values)
    if method in {"notempty", "isnotempty", "set"}:
        return any(str(value or "").strip() for value in actual_values)
    if not actual_values:
        return False

    def normalize(value: Any) -> str:
        return str(value or "").strip().lower().lstrip(".")

    actual_text = [normalize(value) for value in actual_values]
    target_text = [normalize(value) for value in targets]
    if method in {"greater", "greaterthan", "gt", "after"}:
        try:
            threshold = float(targets[0])
            return any(float(value) > threshold for value in actual_values)
        except (TypeError, ValueError, IndexError):
            return False
    if method in {"greaterorequal", "gte", "atleast"}:
        try:
            threshold = float(targets[0])
            return any(float(value) >= threshold for value in actual_values)
        except (TypeError, ValueError, IndexError):
            return False
    if method in {"less", "lessthan", "lt", "before"}:
        try:
            threshold = float(targets[0])
            return any(float(value) < threshold for value in actual_values)
        except (TypeError, ValueError, IndexError):
            return False
    if method in {"lessorequal", "lte", "atmost"}:
        try:
            threshold = float(targets[0])
            return any(float(value) <= threshold for value in actual_values)
        except (TypeError, ValueError, IndexError):
            return False
    equal = any(actual == target for actual in actual_text for target in target_text)
    contains = any(target in actual for actual in actual_text for target in target_text if target)
    if method in {"notequal", "isnot", "not", "neq"}:
        return not equal
    if method in {"contain", "contains", "include", "includes"}:
        return contains
    if method in {"notcontain", "notcontains", "exclude", "excludes"}:
        return not contains
    if method in {"startswith", "startwith"}:
        return any(actual.startswith(target) for actual in actual_text for target in target_text if target)
    if method in {"endswith", "endwith"}:
        return any(actual.endswith(target) for actual in actual_text for target in target_text if target)
    return equal


def _smart_condition_group_matches(item: ItemInfo, group: dict[str, Any]) -> bool:
    rules = [rule for rule in group.get("rules", []) if isinstance(rule, dict)]
    if not rules:
        return False
    results = [_smart_rule_matches(item, rule) for rule in rules]
    matched = any(results) if str(group.get("match") or "AND").upper() == "OR" else all(results)
    if str(group.get("boolean") or "TRUE").upper() in {"FALSE", "NOT"}:
        matched = not matched
    return matched


def _smart_folder_matches(item: ItemInfo, node: SmartFolderNode) -> bool:
    groups = [group for group in node.conditions if isinstance(group, dict)]
    return bool(groups) and all(_smart_condition_group_matches(item, group) for group in groups)


def get_items_in_smart_folder(smart_folder_id: str) -> list[ItemInfo]:
    ensure_loaded()
    node = _smart_folder_by_id.get(str(smart_folder_id or ""))
    if not node:
        return []
    if node.conditions:
        return [item for item in _items_by_id.values() if _smart_folder_matches(item, node)]
    seen: dict[str, ItemInfo] = {}
    for child in node.children:
        for item in get_items_in_smart_folder(child.id):
            seen[item.id] = item
    return list(seen.values())


def _smart_folder_rule_summary(node: SmartFolderNode) -> str:
    rules = [rule for group in node.conditions if isinstance(group, dict) for rule in group.get("rules", []) if isinstance(rule, dict)]
    if not rules:
        return "包含子智能文件夹" if node.children else "未设置规则"
    labels = {
        "type": "格式", "ext": "格式", "name": "名称", "tags": "标签", "tag": "标签",
        "folders": "文件夹", "folder": "文件夹", "url": "来源", "annotation": "备注",
        "width": "宽度", "height": "高度", "size": "大小", "mtime": "修改时间", "btime": "创建时间",
    }
    parts = []
    for rule in rules[:3]:
        prop = str(rule.get("property") or rule.get("key") or "条件")
        target = _smart_rule_targets(rule)
        value = str(target[0]) if target and target[0] is not None and target[0] != "" else str(rule.get("method") or "")
        parts.append(f"{labels.get(prop.lower(), prop)} · {value}".strip(" ·"))
    return " / ".join(parts) + ("…" if len(rules) > 3 else "")


def smart_folder_tree_to_dict(nodes: list[SmartFolderNode]) -> list[dict]:
    ensure_loaded()
    return [
        {
            "id": node.id,
            "name": node.name or "(未命名)",
            "description": node.description or "",
            "ruleSummary": _smart_folder_rule_summary(node),
            "count": len(get_items_in_smart_folder(node.id)),
            "children": smart_folder_tree_to_dict(node.children),
        }
        for node in nodes
    ]


def get_items_by_tag(tag: str) -> list[ItemInfo]:
    """Return items that have the given tag (case-sensitive match)."""
    ensure_loaded()
    if not tag:
        return []
    return list(_items_by_tag.get(tag, []))


def search_items(q: str) -> list[ItemInfo]:
    """Search by keyword in name, tags, annotation, or file extension (case-insensitive)."""
    ensure_loaded()
    if not q or not q.strip():
        return []
    key = q.strip().lower().lstrip(".")
    out: list[ItemInfo] = []
    for item in _items_by_id.values():
        if key in (item.name or "").lower():
            out.append(item)
        elif any(key in (t or "").lower() for t in item.tags):
            out.append(item)
        elif key in (item.annotation or "").lower():
            out.append(item)
        elif item.ext and key == (item.ext or "").lower():
            # Match file extension: "pdf", ".pdf" -> ext "pdf"
            out.append(item)
    return out


def _item_type(ext: str) -> str:
    e = (ext or "").strip().lower().lstrip(".")
    if e in IMAGE_EXTS:
        return "image"
    if e in VIDEO_EXTS:
        return "video"
    if e in AUDIO_EXTS:
        return "audio"
    if e in DOCUMENT_EXTS:
        return "document"
    return "other"


def filter_items_by_type(items: list[ItemInfo], type_filter: str) -> list[ItemInfo]:
    """Filter items by type: all, image, video, document, audio, other."""
    if not type_filter or type_filter.lower() == "all":
        return items
    t = type_filter.lower().strip()
    if t not in VALID_TYPE_FILTERS:
        return items
    return [it for it in items if _item_type(it.ext) == t]


def sort_items(
    items: list[ItemInfo],
    order_by: str = "mtime",
    order_dir: str = "desc",
) -> list[ItemInfo]:
    """Sort items by mtime, btime, name, size, or ext. dir: asc | desc."""
    if not items:
        return []
    ob = order_by.lower() if order_by else "mtime"
    od = (order_dir or "desc").lower()
    if ob not in VALID_SORT_FIELDS:
        ob = "mtime"
    if od not in VALID_SORT_DIR:
        od = "desc"
    reverse = od == "desc"

    def key_mtime(it: ItemInfo):
        return it.mtime or 0

    def key_btime(it: ItemInfo):
        return it.btime or 0

    def key_name(it: ItemInfo):
        return (it.name or "").lower()

    def key_size(it: ItemInfo):
        return it.size or 0

    def key_ext(it: ItemInfo):
        return (it.ext or "").lower()

    key_fn = {"mtime": key_mtime, "btime": key_btime, "name": key_name, "size": key_size, "ext": key_ext}[ob]
    return sorted(items, key=key_fn, reverse=reverse)


def get_recent_items(days: int = 7) -> list[ItemInfo]:
    """Items added or modified in the last N days (by mtime, ms)."""
    ensure_loaded()
    if days <= 0:
        return []
    now_ms = int(time.time() * 1000)
    cutoff = now_ms - days * 24 * 60 * 60 * 1000
    return [it for it in _items_by_id.values() if (it.mtime or 0) >= cutoff]


def folder_tree_to_dict(nodes: list[FolderNode]) -> list[dict]:
    ensure_loaded()
    return [
        {
            "id": n.id,
            "name": n.name,
            "description": n.description or "",
            "children": [] if n.locked else folder_tree_to_dict(n.children),
            "count": 0 if n.locked else _folder_counts.get(n.id, 0),
            "locked": n.locked,
        }
        for n in nodes
    ]


def item_to_dict(item: ItemInfo, include_folder_paths: bool = False) -> dict:
    d = {
        "id": item.id,
        "name": item.name,
        "ext": item.ext,
        "folders": item.folders or [],
        "width": item.width,
        "height": item.height,
        "size": item.size,
        "tags": item.tags or [],
        "url": item.url or "",
        "sourceDomain": _normalize_source_domain(item.url),
        "annotation": item.annotation or "",
        "palettes": item.palettes or [],
        "duration": item.duration or 0,
        "bpm": item.bpm or 0,
        "btime": item.btime,
        "mtime": item.mtime,
        "hasThumbnail": bool(item.thumbnail_path),
    }
    if include_folder_paths:
        d["folderPaths"] = get_folder_paths_for_item(item)
    return d
