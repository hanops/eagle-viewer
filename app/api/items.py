import os
import base64
import mimetypes
import tempfile
import zipfile
from pathlib import Path

from fastapi import APIRouter, Body, HTTPException
from fastapi.responses import FileResponse, Response
from starlette.background import BackgroundTask

from app.vault import get_item, get_folder_paths_for_item, item_to_dict

router = APIRouter(prefix="/api", tags=["items"])

# 1x1 transparent PNG (avoid 404 when item has no thumbnail file)
_PLACEHOLDER_PNG_B64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
_PLACEHOLDER_PNG = base64.b64decode(_PLACEHOLDER_PNG_B64)
_IMAGE_EXTS = {"bmp", "gif", "heic", "heif", "ico", "jpeg", "jpg", "png", "svg", "tif", "tiff", "webp", "avif", "jfif", "jxl"}
_THUMBNAIL_CACHE_HEADERS = {"Cache-Control": "private, max-age=86400"}


def _is_image_item(item) -> bool:
    return (item.ext or "").strip().lower().lstrip(".") in _IMAGE_EXTS


@router.post("/items/resolve")
def api_resolve_items(item_ids: list[str] = Body(..., embed=False)):
    """Resolve durable collection IDs into current item metadata."""
    if len(item_ids) > 500:
        raise HTTPException(status_code=400, detail="Provide at most 500 item IDs")
    items = []
    for item_id in item_ids:
        item = get_item(item_id)
        if item:
            items.append(item_to_dict(item, include_folder_paths=True))
    return {"items": items}


@router.get("/items/{item_id}")
def api_item_detail(item_id: str):
    """Return item metadata (no file paths)."""
    item = get_item(item_id)
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    return item_to_dict(item)


@router.get("/items/{item_id}/thumbnail")
def api_item_thumbnail(item_id: str):
    """Serve thumbnail image; fall back to original image file before using placeholder."""
    item = get_item(item_id)
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    if item.thumbnail_path:
        path = Path(item.thumbnail_path)
        media_type = mimetypes.guess_type(str(path))[0] or "application/octet-stream"
        if path.exists() and media_type.startswith("image/"):
            return FileResponse(
                path,
                media_type=media_type,
                headers=_THUMBNAIL_CACHE_HEADERS,
            )
    if _is_image_item(item):
        path = Path(item.main_file_path)
        media_type = mimetypes.guess_type(str(path))[0] or "application/octet-stream"
        if path.exists() and media_type.startswith("image/"):
            return FileResponse(path, media_type=media_type, headers=_THUMBNAIL_CACHE_HEADERS)
    return Response(
        content=_PLACEHOLDER_PNG,
        media_type="image/png",
        headers=_THUMBNAIL_CACHE_HEADERS,
    )


@router.get("/items/{item_id}/file")
def api_item_file(item_id: str, download: bool = False):
    """Stream the main media file for preview or download (read-only)."""
    item = get_item(item_id)
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    path = Path(item.main_file_path)
    if not path.exists():
        raise HTTPException(status_code=404, detail="File not found")
    media_type = mimetypes.guess_type(str(path))[0] or "application/octet-stream"
    filename = f"{item.name}.{item.ext}" if item.ext else path.name
    # 预览（inline）允许浏览器缓存整图，避免每次左右切换都重新从远端挂载拉全图导致卡顿；
    # 下载（attachment）不缓存。SW 仍不缓存 /api，此处仅设置 HTTP 响应头，不违反 PWA 契约。
    headers = {"Cache-Control": "private, max-age=86400"} if not download else None
    return FileResponse(
        path,
        media_type=media_type,
        filename=filename,
        content_disposition_type="attachment" if download else "inline",
        headers=headers,
    )


@router.get("/items/{item_id}/snippet")
def api_item_snippet(item_id: str, limit: int = 240):
    """Return a short text snippet for text-like files."""
    item = get_item(item_id)
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    ext = (item.ext or "").strip().lower().lstrip(".")
    if ext != "txt":
        raise HTTPException(status_code=400, detail="Snippet is only available for txt files")
    path = Path(item.main_file_path)
    if not path.exists():
        raise HTTPException(status_code=404, detail="File not found")
    char_limit = max(40, min(limit, 1000))
    try:
        with path.open("rb") as f:
            raw = f.read(8192)
    except OSError as exc:
        raise HTTPException(status_code=500, detail="Failed to read file") from exc
    text = raw.decode("utf-8", errors="replace")
    normalized = " ".join(text.split())
    snippet = normalized[:char_limit]
    if len(normalized) > char_limit:
        snippet = snippet.rstrip() + "…"
    return {"snippet": snippet}


def _sanitize_zip_path(s: str) -> str:
    """Replace path-unsafe chars for ZIP entry names."""
    bad = '<>:"|?*/\\\r\n'
    out = []
    for c in s:
        out.append(c if c not in bad and ord(c) >= 32 else "_")
    cleaned = "".join(out).strip()
    return "item" if cleaned in {"", ".", ".."} else cleaned


@router.post("/items/batch-download")
def api_batch_download(item_ids: list[str] = Body(..., embed=False)):
    """Zip multiple items; each file as original (not thumbnail). Names: FolderName/BaseName.ext or FolderName_1_BaseName.ext."""
    if not item_ids or len(item_ids) > 200:
        raise HTTPException(status_code=400, detail="Provide 1–200 item IDs")
    tmp = tempfile.NamedTemporaryFile(prefix="eagle-batch-", suffix=".zip", delete=False)
    tmp_path = Path(tmp.name)
    tmp.close()
    with zipfile.ZipFile(tmp_path, "w", zipfile.ZIP_DEFLATED) as zf:
        seen_keys: set[str] = set()
        for item_id in item_ids:
            item = get_item(item_id)
            if not item:
                continue
            path = Path(item.main_file_path)
            if not path.exists():
                continue
            base_name = f"{item.name}.{item.ext}" if item.ext else path.name
            base_name = _sanitize_zip_path(base_name) or "file"
            paths = get_folder_paths_for_item(item)
            folder_name = _sanitize_zip_path((paths[0].split(" / ")[-1]) if paths else "未分类") or "folder"
            prefix = folder_name + "/"
            stem, ext = (path.stem, path.suffix) if path.suffix else (base_name, "")
            arcname = prefix + base_name
            idx = 0
            while arcname in seen_keys:
                idx += 1
                arcname = prefix + _sanitize_zip_path(stem) + "_" + str(idx) + ext
            seen_keys.add(arcname)
            zf.write(path, arcname)
    return FileResponse(
        tmp_path,
        media_type="application/zip",
        filename="eagle-batch.zip",
        background=BackgroundTask(lambda: os.unlink(tmp_path) if tmp_path.exists() else None),
    )
