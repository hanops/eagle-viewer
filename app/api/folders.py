from urllib.parse import unquote

from fastapi import APIRouter, HTTPException

from app.vault import (
    filter_items_by_type,
    folder_tree_to_dict,
    get_all_items,
    get_all_tags,
    get_folder_tree,
    get_items_by_tag,
    get_items_in_folder,
    get_recent_items,
    get_subfolders,
    is_folder_locked,
    item_to_dict,
    search_items,
    sort_items,
)
from app.vault.parser import VALID_SORT_DIR, VALID_SORT_FIELDS, VALID_TYPE_FILTERS

router = APIRouter(prefix="/api", tags=["folders"])


def _normalize_paging(offset: int, limit: int) -> tuple[int, int]:
    return max(offset, 0), min(max(limit, 1), 500)


def _list_items(
    items: list,
    sort: str,
    direction: str,
    type_filter: str,
    offset: int,
    limit: int,
) -> dict:
    order_by = sort if sort in VALID_SORT_FIELDS else "mtime"
    order_dir = direction if direction in VALID_SORT_DIR else "desc"
    media_type = type_filter if type_filter in VALID_TYPE_FILTERS else "all"
    ordered = sort_items(filter_items_by_type(items, media_type), order_by=order_by, order_dir=order_dir)
    total = len(ordered)
    sliced = ordered[offset:offset + limit]
    result = {
        "items": [item_to_dict(item, include_folder_paths=True) for item in sliced],
        "total": total,
        "offset": offset,
        "limit": limit,
        "nextOffset": offset + len(sliced),
    }
    result["hasMore"] = result["nextOffset"] < total
    return result


@router.get("/tree")
def api_tree():
    return {"folders": folder_tree_to_dict(get_folder_tree())}


@router.get("/items")
def api_all_items(
    sort: str = "mtime",
    dir: str = "desc",
    type: str = "all",
    offset: int = 0,
    limit: int = 120,
):
    start, size = _normalize_paging(offset, limit)
    result = _list_items(get_all_items(), sort, dir, type, start, size)
    result["scope"] = "all"
    return result


@router.get("/folders/{folder_id}/items")
def api_folder_items(
    folder_id: str,
    sort: str = "mtime",
    dir: str = "desc",
    type: str = "all",
    offset: int = 0,
    limit: int = 120,
):
    if is_folder_locked(folder_id):
        raise HTTPException(
            status_code=423,
            detail="Folder is protected by Eagle and unavailable in remote Viewer",
        )
    start, size = _normalize_paging(offset, limit)
    result = _list_items(get_items_in_folder(folder_id), sort, dir, type, start, size)
    result["folderId"] = folder_id
    result["subfolders"] = get_subfolders(folder_id)
    return result


@router.get("/recent")
def api_recent(
    days: int = 7,
    sort: str = "mtime",
    dir: str = "desc",
    type: str = "all",
    offset: int = 0,
    limit: int = 120,
):
    days = min(max(days, 1), 365)
    start, size = _normalize_paging(offset, limit)
    result = _list_items(get_recent_items(days=days), sort, dir, type, start, size)
    result["days"] = days
    return result


@router.get("/tags")
def api_tags():
    return {"tags": get_all_tags()}


@router.get("/tags/{tag:path}/items")
def api_tag_items(
    tag: str,
    sort: str = "mtime",
    dir: str = "desc",
    type: str = "all",
    offset: int = 0,
    limit: int = 120,
):
    start, size = _normalize_paging(offset, limit)
    tag_name = unquote(tag)
    result = _list_items(get_items_by_tag(tag_name), sort, dir, type, start, size)
    result["tag"] = tag_name
    return result


@router.get("/search")
def api_search(
    q: str = "",
    sort: str = "mtime",
    dir: str = "desc",
    type: str = "all",
    offset: int = 0,
    limit: int = 120,
):
    start, size = _normalize_paging(offset, limit)
    result = _list_items(search_items(q), sort, dir, type, start, size)
    result["query"] = q
    return result
