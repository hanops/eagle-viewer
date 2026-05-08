"""
Parse Eagle vault on disk: library metadata.json (folder tree) and
images/*.info/metadata.json (items). Build in-memory cache for API.
"""
import json
import threading
import time
from pathlib import Path
from typing import Any

from app.config import VAULT_ROOT
from app.vault.models import FolderNode, ItemInfo

# In-memory cache (filled on first request or startup)
_folder_tree: list[FolderNode] = []
_folder_by_id: dict[str, FolderNode] = {}  # folder_id -> node (for path lookup)
_items_by_id: dict[str, ItemInfo] = {}
_items_by_folder: dict[str, list[ItemInfo]] = {}  # folder_id -> items
_items_by_tag: dict[str, list[ItemInfo]] = {}
_tag_summary: list[dict] = []
_folder_counts: dict[str, int] = {}
_last_load_stats: dict[str, Any] = {}
_loaded = False
_load_lock = threading.RLock()

# Used only for preferring image/video as thumbnail; main file can be any type
PREFERRED_MEDIA_EXTENSIONS = {
    ".bmp", ".gif", ".heic", ".heif", ".ico", ".jpeg", ".jpg", ".png",
    ".svg", ".tif", ".tiff", ".webp", ".avif", ".jfif", ".jxl",
    ".mp4", ".webm", ".mov", ".m4v", ".mp3", ".wav", ".m4a", ".aac", ".flac", ".ogg",
    ".pdf", ".txt", ".doc", ".docx", ".xls", ".xlsx", ".ppt", ".pptx",
    ".psd", ".ai", ".sketch", ".fig", ".xd", ".ttf", ".otf", ".woff",
}

# Type filter: image, video, document, audio, other (ext lowercase without dot)
IMAGE_EXTS = {"bmp", "gif", "heic", "heif", "ico", "jpeg", "jpg", "png", "svg", "tif", "tiff", "webp", "avif", "jfif", "jxl"}
VIDEO_EXTS = {"mp4", "webm", "mov", "m4v", "avi", "mkv", "flv", "wmv"}
AUDIO_EXTS = {"mp3", "wav", "m4a", "aac", "flac", "ogg", "wma"}
DOCUMENT_EXTS = {"pdf", "txt", "doc", "docx", "xls", "xlsx", "ppt", "pptx", "psd", "ai", "sketch", "fig", "xd"}
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


def _build_folder_node(data: dict[str, Any], parent_id: str | None = None) -> FolderNode:
    """Build one node from nested format (has 'children' array). Sets parent so path from root works."""
    node_id = str(data["id"]) if data.get("id") is not None else ""
    node = FolderNode(
        id=node_id,
        name=data.get("name", ""),
        description=data.get("description", ""),
        parent=str(data["parent"]) if data.get("parent") is not None else (str(parent_id) if parent_id else None),
        children=[],
    )
    for child in data.get("children", []):
        if child.get("password"):
            continue
        child_node = _build_folder_node(child, parent_id=node.id)
        node.children.append(child_node)
    return node


def _build_folder_tree_from_flat(folders_data: list[dict]) -> list[FolderNode]:
    """Build tree from flat list where each folder has optional 'parent' id."""
    if not folders_data:
        return []
    nodes: dict[str, FolderNode] = {}
    for f in folders_data:
        if f.get("password"):
            continue
        nid = str(f["id"]) if f.get("id") is not None else ""
        pid = f.get("parent")
        n = FolderNode(
            id=nid,
            name=f.get("name", ""),
            description=f.get("description", ""),
            parent=str(pid) if pid is not None else None,
            children=[],
        )
        nodes[n.id] = n
    roots: list[FolderNode] = []
    for n in nodes.values():
        if n.parent is None or n.parent == "" or n.parent not in nodes:
            roots.append(n)
        else:
            nodes[n.parent].children.append(n)
    return roots


def _build_folder_tree(folders_data: list[dict]) -> list[FolderNode]:
    """Build folder tree. Supports both nested (children) and flat (parent) format."""
    if not folders_data:
        return []
    first = folders_data[0]
    # If any folder has 'parent' key, treat as flat list
    if "parent" in first or any("parent" in f for f in folders_data):
        return _build_folder_tree_from_flat(folders_data)
    roots: list[FolderNode] = []
    for f in folders_data:
        if f.get("password"):
            continue
        roots.append(_build_folder_node(f, parent_id=None))
    return roots


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


def _load_items() -> tuple[dict[str, ItemInfo], dict[str, list[ItemInfo]], dict[str, int]]:
    images_dir = Path(VAULT_ROOT) / "images"
    by_id: dict[str, ItemInfo] = {}
    by_folder: dict[str, list[ItemInfo]] = {}
    stats = {
        "info_dirs": 0,
        "loaded_items": 0,
        "skipped_missing_metadata": 0,
        "skipped_bad_metadata": 0,
        "skipped_deleted": 0,
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

        main_path, thumb_path = _find_main_file(subdir, meta)
        if not main_path:
            stats["skipped_missing_file"] += 1
            continue

        raw_folders = meta.get("folders", [])
        folder_ids = _normalize_item_folder_ids(raw_folders)
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
    if not node:
        return []
    return [{"id": c.id, "name": c.name or "(未命名)"} for c in node.children]


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
    global _folder_tree, _folder_by_id, _items_by_id, _items_by_folder, _items_by_tag, _tag_summary, _folder_counts, _last_load_stats, _loaded
    started = time.time()
    lib = _load_library_metadata()
    folders_data = _normalize_folders_data(lib)
    folder_tree = _build_folder_tree(folders_data)
    folder_by_id: dict[str, FolderNode] = {}
    _collect_folder_by_id(folder_tree, folder_by_id)
    items_by_id, items_by_folder, load_stats = _load_items()
    items_by_tag, tag_summary = _build_tag_index(items_by_id)
    folder_counts = _compute_folder_counts(folder_tree, items_by_folder)
    elapsed_ms = int((time.time() - started) * 1000)
    cache_stats = {
        "folders": len(folder_by_id),
        "items": len(items_by_id),
        "tags": len(items_by_tag),
    }

    with _load_lock:
        _folder_tree = folder_tree
        _folder_by_id = folder_by_id
        _items_by_id = items_by_id
        _items_by_folder = items_by_folder
        _items_by_tag = items_by_tag
        _tag_summary = tag_summary
        _folder_counts = folder_counts
        _last_load_stats = {
            **cache_stats,
            **load_stats,
            "loadDurationMs": elapsed_ms,
            "loadedAt": int(time.time() * 1000),
            "vaultRoot": str(VAULT_ROOT),
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


def get_folder_tree() -> list[FolderNode]:
    ensure_loaded()
    return _folder_tree


def get_item(item_id: str) -> ItemInfo | None:
    ensure_loaded()
    return _items_by_id.get(item_id)


def get_items_in_folder(folder_id: str) -> list[ItemInfo]:
    ensure_loaded()
    fid = str(folder_id) if folder_id is not None else ""
    return _items_by_folder.get(fid, [])


def get_all_items() -> list[ItemInfo]:
    """Return all items (flat list, no folder structure)."""
    ensure_loaded()
    return list(_items_by_id.values())


def get_all_tags() -> list[dict]:
    """Return all tags with counts: [{name, count}, ...] sorted by count desc."""
    ensure_loaded()
    return list(_tag_summary)


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
            "children": folder_tree_to_dict(n.children),
            "count": _folder_counts.get(n.id, 0),
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
        "annotation": item.annotation or "",
        "btime": item.btime,
        "mtime": item.mtime,
        "hasThumbnail": bool(item.thumbnail_path),
    }
    if include_folder_paths:
        d["folderPaths"] = get_folder_paths_for_item(item)
    return d
