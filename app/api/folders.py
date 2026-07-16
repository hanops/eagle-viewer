from fastapi import APIRouter, HTTPException

from urllib.parse import unquote, urlparse

from app.vault import (
    get_folder_tree,
    get_all_items,
    get_items_in_folder,
    is_folder_locked,
    get_subfolders,
    get_all_tags,
    get_smart_folder_tree,
    get_smart_folder,
    get_items_in_smart_folder,
    get_items_by_tag,
    search_items,
    get_recent_items,
    get_cache_stats,
    get_duplicate_groups,
    get_palette_atlas,
    get_random_items,
    filter_items_by_type,
    sort_items,
    folder_tree_to_dict,
    smart_folder_tree_to_dict,
    item_to_dict,
)
from app.vault.parser import VALID_SORT_FIELDS, VALID_SORT_DIR, VALID_TYPE_FILTERS

router = APIRouter(prefix="/api", tags=["folders"])


def _parse_hex_color(value: str) -> tuple[int, int, int] | None:
    raw = (value or "").strip().lstrip("#")
    if len(raw) != 6:
        return None
    try:
        return tuple(int(raw[index:index + 2], 16) for index in (0, 2, 4))
    except ValueError:
        return None


def _matches_palette(item, target: tuple[int, int, int], tolerance: int) -> bool:
    max_distance_squared = tolerance * tolerance
    for palette in item.palettes or []:
        color = palette.get("color") if isinstance(palette, dict) else None
        if not isinstance(color, list) or len(color) != 3:
            continue
        distance_squared = sum((int(color[index]) - target[index]) ** 2 for index in range(3))
        if distance_squared <= max_distance_squared:
            return True
    return False


def _normalize_paging(offset: int, limit: int) -> tuple[int, int]:
    return max(offset, 0), min(max(limit, 1), 500)


def _normalize_source_domain(value: str) -> str:
    raw = (value or "").strip().lower()
    if not raw:
        return ""
    candidate = raw if "://" in raw else f"https://{raw}"
    host = urlparse(candidate).hostname or raw.split("/", 1)[0]
    if host.startswith("www."):
        host = host[4:]
    return host[:255]


def _normalize_ext(value: str) -> str:
    return (value or "").strip().lower().lstrip(".")[:32]


def _apply_advanced_filters(items: list, filters: dict | None = None) -> list:
    if not filters:
        return items
    out = []
    target_color = _parse_hex_color(filters.get("color", ""))
    color_tolerance = filters.get("color_tolerance", 72)
    source_domain = filters.get("source_domain", "")
    ext = filters.get("ext", "")
    for item in items:
        if filters.get("min_size") is not None and (item.size or 0) < filters["min_size"]:
            continue
        if filters.get("max_size") is not None and (item.size or 0) > filters["max_size"]:
            continue
        if filters.get("min_width") is not None and (item.width or 0) < filters["min_width"]:
            continue
        if filters.get("min_height") is not None and (item.height or 0) < filters["min_height"]:
            continue
        if filters.get("mtime_from") is not None and (item.mtime or 0) < filters["mtime_from"]:
            continue
        if filters.get("mtime_to") is not None and (item.mtime or 0) > filters["mtime_to"]:
            continue
        shape = filters.get("shape")
        if shape:
            w, h = item.width or 0, item.height or 0
            if not w or not h:
                continue
            if shape == "landscape" and w <= h:
                continue
            if shape == "portrait" and h <= w:
                continue
            if shape == "square" and abs(w - h) > max(w, h) * 0.08:
                continue
        if filters.get("tag_state") == "tagged" and not item.tags:
            continue
        if filters.get("tag_state") == "untagged" and item.tags:
            continue
        if filters.get("annotation_state") == "annotated" and not item.annotation:
            continue
        if filters.get("annotation_state") == "unannotated" and item.annotation:
            continue
        if filters.get("source_state") == "sourced" and not item.url:
            continue
        if filters.get("source_state") == "unsourced" and item.url:
            continue
        if source_domain and _normalize_source_domain(item.url) != source_domain:
            continue
        if ext and _normalize_ext(item.ext) != ext:
            continue
        if target_color and not _matches_palette(item, target_color, color_tolerance):
            continue
        out.append(item)
    return out


def _make_advanced_filters(
    min_size: int | None = None,
    max_size: int | None = None,
    min_width: int | None = None,
    min_height: int | None = None,
    mtime_from: int | None = None,
    mtime_to: int | None = None,
    shape: str = "",
    tag_state: str = "",
    annotation_state: str = "",
    source_state: str = "",
    source_domain: str = "",
    ext: str = "",
    color: str = "",
    color_tolerance: int = 72,
) -> dict:
    valid_shape = shape if shape in {"landscape", "portrait", "square"} else ""
    valid_tag = tag_state if tag_state in {"tagged", "untagged"} else ""
    valid_annotation = annotation_state if annotation_state in {"annotated", "unannotated"} else ""
    valid_source = source_state if source_state in {"sourced", "unsourced"} else ""
    parsed_color = _parse_hex_color(color)
    return {
        "min_size": min_size if min_size is not None and min_size >= 0 else None,
        "max_size": max_size if max_size is not None and max_size >= 0 else None,
        "min_width": min_width if min_width is not None and min_width >= 0 else None,
        "min_height": min_height if min_height is not None and min_height >= 0 else None,
        "mtime_from": mtime_from if mtime_from is not None and mtime_from >= 0 else None,
        "mtime_to": mtime_to if mtime_to is not None and mtime_to >= 0 else None,
        "shape": valid_shape,
        "tag_state": valid_tag,
        "annotation_state": valid_annotation,
        "source_state": valid_source,
        "source_domain": _normalize_source_domain(source_domain),
        "ext": _normalize_ext(ext),
        "color": "#{:02x}{:02x}{:02x}".format(*parsed_color) if parsed_color else "",
        "color_tolerance": min(max(color_tolerance, 0), 442),
    }


def _apply_list_params(items: list, sort: str, dir: str, type_filter: str, offset: int = 0, limit: int | None = None, filters: dict | None = None):
    """Filter, sort, and optionally slice items."""
    ob = sort if sort in VALID_SORT_FIELDS else "mtime"
    od = dir if dir in VALID_SORT_DIR else "desc"
    tf = type_filter if type_filter in VALID_TYPE_FILTERS else "all"
    filtered = _apply_advanced_filters(filter_items_by_type(items, tf), filters)
    ordered = sort_items(filtered, order_by=ob, order_dir=od)
    total = len(ordered)
    start = max(offset, 0)
    end = total if limit is None else max(start, start + max(limit, 0))
    sliced = ordered[start:end]
    return {
        "items": [item_to_dict(it, include_folder_paths=True) for it in sliced],
        "total": total,
    }


def _add_paging_meta(out: dict, offset: int, limit: int) -> dict:
    out["offset"] = offset
    out["limit"] = limit
    out["nextOffset"] = offset + len(out["items"])
    out["hasMore"] = out["nextOffset"] < out["total"]
    return out


@router.get("/tree")
def api_tree():
    """Return folder tree (id, name, description, children)."""
    tree = get_folder_tree()
    return {"folders": folder_tree_to_dict(tree)}


@router.get("/items")
def api_all_items(
    sort: str = "mtime",
    dir: str = "desc",
    type: str = "all",
    offset: int = 0,
    limit: int = 120,
    min_size: int | None = None,
    max_size: int | None = None,
    min_width: int | None = None,
    min_height: int | None = None,
    mtime_from: int | None = None,
    mtime_to: int | None = None,
    shape: str = "",
    tag_state: str = "",
    annotation_state: str = "",
    source_state: str = "",
    source_domain: str = "",
    ext: str = "",
    color: str = "",
    color_tolerance: int = 72,
):
    """Return all items in the library. Supports sort, type filter, and incremental loading."""
    start, size = _normalize_paging(offset, limit)
    filters = _make_advanced_filters(min_size, max_size, min_width, min_height, mtime_from, mtime_to, shape, tag_state, annotation_state, source_state, source_domain, ext, color, color_tolerance)
    out = _apply_list_params(get_all_items(), sort, dir, type, offset=start, limit=size, filters=filters)
    out["scope"] = "all"
    return _add_paging_meta(out, start, size)


@router.get("/smart-folders")
def api_smart_folders():
    """Return Eagle-native smart folders from the mounted library metadata."""
    return {"smartFolders": smart_folder_tree_to_dict(get_smart_folder_tree())}


@router.get("/smart-folders/{smart_folder_id}/items")
def api_smart_folder_items(
    smart_folder_id: str,
    sort: str = "mtime",
    dir: str = "desc",
    type: str = "all",
    offset: int = 0,
    limit: int = 120,
    min_size: int | None = None,
    max_size: int | None = None,
    min_width: int | None = None,
    min_height: int | None = None,
    mtime_from: int | None = None,
    mtime_to: int | None = None,
    shape: str = "",
    tag_state: str = "",
    annotation_state: str = "",
    source_state: str = "",
    source_domain: str = "",
    ext: str = "",
    color: str = "",
    color_tolerance: int = 72,
):
    """Evaluate an Eagle-native smart folder against the read-only in-memory index."""
    node = get_smart_folder(smart_folder_id)
    if not node:
        raise HTTPException(status_code=404, detail="Smart folder not found")
    start, size = _normalize_paging(offset, limit)
    filters = _make_advanced_filters(min_size, max_size, min_width, min_height, mtime_from, mtime_to, shape, tag_state, annotation_state, source_state, source_domain, ext, color, color_tolerance)
    out = _apply_list_params(get_items_in_smart_folder(smart_folder_id), sort, dir, type, offset=start, limit=size, filters=filters)
    out["smartFolder"] = {"id": node.id, "name": node.name, "description": node.description, "ruleSummary": smart_folder_tree_to_dict([node])[0]["ruleSummary"]}
    return _add_paging_meta(out, start, size)


@router.get("/folders/{folder_id}/items")
def api_folder_items(
    folder_id: str,
    sort: str = "mtime",
    dir: str = "desc",
    type: str = "all",
    offset: int = 0,
    limit: int = 120,
    min_size: int | None = None,
    max_size: int | None = None,
    min_width: int | None = None,
    min_height: int | None = None,
    mtime_from: int | None = None,
    mtime_to: int | None = None,
    shape: str = "",
    tag_state: str = "",
    annotation_state: str = "",
    source_state: str = "",
    source_domain: str = "",
    ext: str = "",
    color: str = "",
    color_tolerance: int = 72,
):
    """Return subfolders and items in the given folder. Supports sort, type filter, and incremental loading."""
    if is_folder_locked(folder_id):
        raise HTTPException(status_code=423, detail="Folder is protected by Eagle and unavailable in remote Viewer")
    start, size = _normalize_paging(offset, limit)
    subfolders = get_subfolders(folder_id)
    items = get_items_in_folder(folder_id)
    filters = _make_advanced_filters(min_size, max_size, min_width, min_height, mtime_from, mtime_to, shape, tag_state, annotation_state, source_state, source_domain, ext, color, color_tolerance)
    out = _apply_list_params(items, sort, dir, type, offset=start, limit=size, filters=filters)
    out["folderId"] = folder_id
    out["subfolders"] = subfolders
    return _add_paging_meta(out, start, size)


@router.get("/recent")
def api_recent(
    days: int = 7,
    sort: str = "mtime",
    dir: str = "desc",
    type: str = "all",
    offset: int = 0,
    limit: int = 120,
    min_size: int | None = None,
    max_size: int | None = None,
    min_width: int | None = None,
    min_height: int | None = None,
    mtime_from: int | None = None,
    mtime_to: int | None = None,
    shape: str = "",
    tag_state: str = "",
    annotation_state: str = "",
    source_state: str = "",
    source_domain: str = "",
    ext: str = "",
    color: str = "",
    color_tolerance: int = 72,
):
    """Items added/modified in the last N days. Supports sort, type filter, and incremental loading."""
    if days <= 0:
        days = 7
    if days > 365:
        days = 365
    items = get_recent_items(days=days)
    start, size = _normalize_paging(offset, limit)
    filters = _make_advanced_filters(min_size, max_size, min_width, min_height, mtime_from, mtime_to, shape, tag_state, annotation_state, source_state, source_domain, ext, color, color_tolerance)
    out = _apply_list_params(items, sort, dir, type, offset=start, limit=size, filters=filters)
    out["days"] = days
    return _add_paging_meta(out, start, size)


@router.get("/tags")
def api_tags():
    """All tags with counts: [{name, count}, ...]."""
    return {"tags": get_all_tags()}


@router.get("/library/stats")
def api_library_stats():
    """Return latest in-memory index stats."""
    return {"stats": get_cache_stats()}


@router.get("/duplicates")
def api_duplicates(limit: int = 50):
    """Return likely duplicate groups by size, dimensions, and extension."""
    return {"groups": get_duplicate_groups(limit=limit)}


@router.get("/palettes")
def api_palettes(limit: int = 36):
    """Return a clustered color atlas built from Eagle palette metadata."""
    return get_palette_atlas(limit=limit)


@router.get("/random")
def api_random(seed: str = "", limit: int = 24, type: str = "all"):
    """Return a stable, shareable random walk through the mounted library."""
    return get_random_items(seed=seed, limit=limit, type_filter=type)


@router.get("/tags/{tag:path}/items")
def api_tag_items(
    tag: str,
    sort: str = "mtime",
    dir: str = "desc",
    type: str = "all",
    offset: int = 0,
    limit: int = 120,
    min_size: int | None = None,
    max_size: int | None = None,
    min_width: int | None = None,
    min_height: int | None = None,
    mtime_from: int | None = None,
    mtime_to: int | None = None,
    shape: str = "",
    tag_state: str = "",
    annotation_state: str = "",
    source_state: str = "",
    source_domain: str = "",
    ext: str = "",
    color: str = "",
    color_tolerance: int = 72,
):
    """Items that have this tag. Supports sort, type filter, and incremental loading."""
    start, size = _normalize_paging(offset, limit)
    tag_name = unquote(tag)
    items = get_items_by_tag(tag_name)
    filters = _make_advanced_filters(min_size, max_size, min_width, min_height, mtime_from, mtime_to, shape, tag_state, annotation_state, source_state, source_domain, ext, color, color_tolerance)
    out = _apply_list_params(items, sort, dir, type, offset=start, limit=size, filters=filters)
    out["tag"] = tag_name
    return _add_paging_meta(out, start, size)


@router.get("/search")
def api_search(
    q: str = "",
    sort: str = "mtime",
    dir: str = "desc",
    type: str = "all",
    offset: int = 0,
    limit: int = 120,
    min_size: int | None = None,
    max_size: int | None = None,
    min_width: int | None = None,
    min_height: int | None = None,
    mtime_from: int | None = None,
    mtime_to: int | None = None,
    shape: str = "",
    tag_state: str = "",
    annotation_state: str = "",
    source_state: str = "",
    source_domain: str = "",
    ext: str = "",
    color: str = "",
    color_tolerance: int = 72,
):
    """Search items. Supports sort, type filter, and incremental loading."""
    start, size = _normalize_paging(offset, limit)
    items = search_items(q)
    filters = _make_advanced_filters(min_size, max_size, min_width, min_height, mtime_from, mtime_to, shape, tag_state, annotation_state, source_state, source_domain, ext, color, color_tolerance)
    out = _apply_list_params(items, sort, dir, type, offset=start, limit=size, filters=filters)
    out["query"] = q
    return _add_paging_meta(out, start, size)
