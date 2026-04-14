from fastapi import APIRouter, HTTPException

from urllib.parse import unquote

from app.vault import (
    get_folder_tree,
    get_all_items,
    get_items_in_folder,
    get_subfolders,
    get_all_tags,
    get_items_by_tag,
    search_items,
    get_recent_items,
    filter_items_by_type,
    sort_items,
    folder_tree_to_dict,
    item_to_dict,
)
from app.vault.parser import VALID_SORT_FIELDS, VALID_SORT_DIR, VALID_TYPE_FILTERS

router = APIRouter(prefix="/api", tags=["folders"])


def _apply_list_params(items: list, sort: str, dir: str, type_filter: str, offset: int = 0, limit: int | None = None):
    """Filter, sort, and optionally slice items."""
    ob = sort if sort in VALID_SORT_FIELDS else "mtime"
    od = dir if dir in VALID_SORT_DIR else "desc"
    tf = type_filter if type_filter in VALID_TYPE_FILTERS else "all"
    filtered = filter_items_by_type(items, tf)
    ordered = sort_items(filtered, order_by=ob, order_dir=od)
    total = len(ordered)
    start = max(offset, 0)
    end = total if limit is None else max(start, start + max(limit, 0))
    sliced = ordered[start:end]
    return {
        "items": [item_to_dict(it, include_folder_paths=True) for it in sliced],
        "total": total,
    }


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
):
    """Return all items in the library. Supports sort, type filter, and incremental loading."""
    size = min(max(limit, 1), 500)
    start = max(offset, 0)
    out = _apply_list_params(get_all_items(), sort, dir, type, offset=start, limit=size)
    out["scope"] = "all"
    out["offset"] = start
    out["limit"] = size
    out["nextOffset"] = start + len(out["items"])
    out["hasMore"] = out["nextOffset"] < out["total"]
    return out


@router.get("/folders/{folder_id}/items")
def api_folder_items(
    folder_id: str,
    sort: str = "mtime",
    dir: str = "desc",
    type: str = "all",
):
    """Return subfolders and items in the given folder. Supports sort, type filter."""
    subfolders = get_subfolders(folder_id)
    items = get_items_in_folder(folder_id)
    out = _apply_list_params(items, sort, dir, type)
    out["folderId"] = folder_id
    out["subfolders"] = subfolders
    return out


@router.get("/recent")
def api_recent(
    days: int = 7,
    sort: str = "mtime",
    dir: str = "desc",
    type: str = "all",
    offset: int = 0,
    limit: int = 120,
):
    """Items added/modified in the last N days. Supports sort, type filter, and incremental loading."""
    if days <= 0:
        days = 7
    if days > 365:
        days = 365
    items = get_recent_items(days=days)
    size = min(max(limit, 1), 500)
    start = max(offset, 0)
    out = _apply_list_params(items, sort, dir, type, offset=start, limit=size)
    out["days"] = days
    out["offset"] = start
    out["limit"] = size
    out["nextOffset"] = start + len(out["items"])
    out["hasMore"] = out["nextOffset"] < out["total"]
    return out


@router.get("/tags")
def api_tags():
    """All tags with counts: [{name, count}, ...]."""
    return {"tags": get_all_tags()}


@router.get("/tags/{tag:path}/items")
def api_tag_items(
    tag: str,
    sort: str = "mtime",
    dir: str = "desc",
    type: str = "all",
):
    """Items that have this tag. Supports sort, type filter."""
    tag_name = unquote(tag)
    items = get_items_by_tag(tag_name)
    out = _apply_list_params(items, sort, dir, type)
    out["tag"] = tag_name
    return out


@router.get("/search")
def api_search(
    q: str = "",
    sort: str = "mtime",
    dir: str = "desc",
    type: str = "all",
):
    """Search items. Supports sort, type filter."""
    items = search_items(q)
    out = _apply_list_params(items, sort, dir, type)
    out["query"] = q
    return out
