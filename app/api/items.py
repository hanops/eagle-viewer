import base64
import mimetypes
from pathlib import Path
from urllib.parse import quote

from fastapi import APIRouter, Body, HTTPException, Request
from fastapi.responses import FileResponse, Response, StreamingResponse

from app.vault import get_item, item_to_dict

router = APIRouter(prefix="/api", tags=["items"])

# 1x1 transparent PNG (avoid 404 when item has no thumbnail file)
_PLACEHOLDER_PNG_B64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
_PLACEHOLDER_PNG = base64.b64decode(_PLACEHOLDER_PNG_B64)
_IMAGE_EXTS = {"bmp", "gif", "heic", "heif", "ico", "jpeg", "jpg", "png", "svg", "tif", "tiff", "webp", "avif", "jfif", "jxl"}
_THUMBNAIL_CACHE_HEADERS = {"Cache-Control": "private, max-age=86400"}
_RANGE_CHUNK_SIZE = 1024 * 1024


def _is_image_item(item) -> bool:
    return (item.ext or "").strip().lower().lstrip(".") in _IMAGE_EXTS


def _content_disposition(filename: str, download: bool) -> str:
    disposition = "attachment" if download else "inline"
    return f"{disposition}; filename*=UTF-8''{quote(filename)}"


def _parse_range(value: str | None, size: int) -> tuple[int, int] | None:
    if not value:
        return None
    if not value.startswith("bytes=") or "," in value:
        raise HTTPException(status_code=416, detail="Only one byte range is supported", headers={"Content-Range": f"bytes */{size}"})
    raw = value[6:].strip()
    try:
        start_text, end_text = raw.split("-", 1)
        if not start_text:
            suffix = int(end_text)
            if suffix <= 0:
                raise ValueError
            start = max(size - suffix, 0)
            end = size - 1
        else:
            start = int(start_text)
            end = int(end_text) if end_text else size - 1
            if start < 0 or start >= size or end < start:
                raise ValueError
            end = min(end, size - 1)
    except (ValueError, TypeError):
        raise HTTPException(status_code=416, detail="Invalid byte range", headers={"Content-Range": f"bytes */{size}"}) from None
    return start, end


def _iter_file(path: Path, start: int, end: int):
    remaining = end - start + 1
    with path.open("rb") as file:
        file.seek(start)
        while remaining:
            chunk = file.read(min(_RANGE_CHUNK_SIZE, remaining))
            if not chunk:
                break
            remaining -= len(chunk)
            yield chunk


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
def api_item_file(item_id: str, download: bool = False, request: Request = None):
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
    size = path.stat().st_size
    range_header = request.headers.get("range") if request else None
    byte_range = _parse_range(range_header, size)
    headers = {
        "Accept-Ranges": "bytes",
        "Content-Disposition": _content_disposition(filename, download),
    }
    if not download:
        headers["Cache-Control"] = "private, max-age=86400"
    if media_type == "application/pdf" and not download:
        # The mobile preview embeds PDFs in a same-origin iframe. Keep the
        # global DENY default for every other response.
        headers["X-Frame-Options"] = "SAMEORIGIN"
        headers["Content-Security-Policy"] = "frame-ancestors 'self'"
    if byte_range is None:
        return FileResponse(path, media_type=media_type, headers=headers)
    start, end = byte_range
    headers.update({
        "Content-Length": str(end - start + 1),
        "Content-Range": f"bytes {start}-{end}/{size}",
    })
    return StreamingResponse(
        _iter_file(path, start, end),
        status_code=206,
        media_type=media_type,
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
