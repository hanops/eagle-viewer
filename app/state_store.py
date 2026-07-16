"""Small, atomic persistence layer for shared viewer state."""

import json
import os
import threading
import time
from pathlib import Path
from urllib.parse import urlparse

from fastapi import HTTPException


_MAX_COLLECTION_ITEMS = 500
_MAX_SAVED_VIEWS = 100
_MAX_WORKSPACES = 50
_MAX_MARKERS_PER_ITEM = 100
_ALLOWED_VIEWS = {"all", "folder", "tag", "recent", "search", "eagle-smart"}
_ALLOWED_SORTS = {"mtime", "btime", "name", "size", "ext"}
_ALLOWED_TYPES = {"all", "image", "video", "document", "audio", "other"}


def _default_state() -> dict:
    return {"version": 1, "revision": 0, "updatedAt": 0, "savedViews": [], "ratings": {}, "notes": {}, "reviewMarkers": {}, "workspaces": [], "collections": {"favorite": [], "later": [], "done": [], "recentViewed": []}}


def _unique_ids(value: object) -> list[str]:
    if not isinstance(value, list):
        return []
    out = []
    for item_id in value:
        if isinstance(item_id, str) and item_id and len(item_id) <= 200 and item_id not in out:
            out.append(item_id)
        if len(out) >= _MAX_COLLECTION_ITEMS:
            break
    return out


def _sanitize_ratings(value: object) -> dict[str, int]:
    if not isinstance(value, dict):
        return {}
    out = {}
    for item_id, rating in value.items():
        if not isinstance(item_id, str) or not item_id or len(item_id) > 200:
            continue
        try:
            normalized = int(rating)
        except (TypeError, ValueError):
            continue
        if 1 <= normalized <= 5:
            out[item_id] = normalized
        if len(out) >= _MAX_COLLECTION_ITEMS:
            break
    return out


def _sanitize_notes(value: object) -> dict[str, str]:
    if not isinstance(value, dict):
        return {}
    out = {}
    for item_id, note in value.items():
        if not isinstance(item_id, str) or not item_id or len(item_id) > 200 or not isinstance(note, str):
            continue
        normalized = note.strip()[:4000]
        if normalized:
            out[item_id] = normalized
        if len(out) >= _MAX_COLLECTION_ITEMS:
            break
    return out


def _bounded_float(value: object, default: float, minimum: float, maximum: float) -> float:
    try:
        return min(max(float(value), minimum), maximum)
    except (TypeError, ValueError):
        return default


def _sanitize_review_markers(value: object) -> dict[str, list[dict]]:
    if not isinstance(value, dict):
        return {}
    out = {}
    for item_id, markers in value.items():
        if not isinstance(item_id, str) or not item_id or len(item_id) > 200 or not isinstance(markers, list):
            continue
        clean = []
        seen = set()
        for raw in markers:
            if not isinstance(raw, dict):
                continue
            marker_id = str(raw.get("id") or "").strip()[:80]
            text = str(raw.get("text") or "").strip()[:1000]
            kind = raw.get("kind") if raw.get("kind") in {"point", "time", "general"} else "general"
            if not marker_id or marker_id in seen or not text:
                continue
            marker = {
                "id": marker_id,
                "kind": kind,
                "text": text,
                "createdAt": _bounded_int(raw.get("createdAt"), 0, 0, 10**15),
                "updatedAt": _bounded_int(raw.get("updatedAt"), 0, 0, 10**15),
            }
            if kind == "point":
                marker["x"] = round(_bounded_float(raw.get("x"), 0.5, 0.0, 1.0), 5)
                marker["y"] = round(_bounded_float(raw.get("y"), 0.5, 0.0, 1.0), 5)
            if kind == "time":
                marker["time"] = round(_bounded_float(raw.get("time"), 0, 0, 86400), 3)
            clean.append(marker)
            seen.add(marker_id)
            if len(clean) >= _MAX_MARKERS_PER_ITEM:
                break
        if clean:
            out[item_id] = clean
        if len(out) >= _MAX_COLLECTION_ITEMS:
            break
    return out


def _sanitize_workspaces(value: object) -> list[dict]:
    if not isinstance(value, list):
        return []
    out = []
    seen = set()
    for raw in value:
        if not isinstance(raw, dict):
            continue
        workspace_id = str(raw.get("id") or "").strip()[:80]
        name = str(raw.get("name") or "").strip()[:80]
        if not workspace_id or not name or workspace_id in seen:
            continue
        color = raw.get("color")
        if not isinstance(color, str) or len(color) != 7 or not color.startswith("#"):
            color = "#4f82d9"
        else:
            try:
                int(color[1:], 16)
                color = color.lower()
            except ValueError:
                color = "#4f82d9"
        out.append({
            "id": workspace_id,
            "name": name,
            "color": color,
            "itemIds": _unique_ids(raw.get("itemIds")),
            "createdAt": _bounded_int(raw.get("createdAt"), 0, 0, 10**15),
            "updatedAt": _bounded_int(raw.get("updatedAt"), 0, 0, 10**15),
        })
        seen.add(workspace_id)
        if len(out) >= _MAX_WORKSPACES:
            break
    return out


def _bounded_int(value: object, default: int, minimum: int, maximum: int) -> int:
    try:
        return min(max(int(value), minimum), maximum)
    except (TypeError, ValueError):
        return default


def _normalize_source_domain(value: object) -> str:
    if not isinstance(value, str):
        return ""
    raw = value.strip().lower()
    if not raw:
        return ""
    candidate = raw if "://" in raw else f"https://{raw}"
    host = urlparse(candidate).hostname or raw.split("/", 1)[0]
    if host.startswith("www."):
        host = host[4:]
    return host[:255]


def _normalize_ext(value: object) -> str:
    if not isinstance(value, str):
        return ""
    return value.strip().lower().lstrip(".")[:32]


def _sanitize_filters(value: object) -> dict:
    if not isinstance(value, dict):
        return {}
    out = {}
    for key in ("min_size", "max_size", "min_width", "min_height", "mtime_from", "mtime_to"):
        if value.get(key) is not None:
            out[key] = _bounded_int(value[key], 0, 0, 10**15)
    if value.get("shape") in {"landscape", "portrait", "square"}:
        out["shape"] = value["shape"]
    if value.get("tag_state") in {"tagged", "untagged"}:
        out["tag_state"] = value["tag_state"]
    if value.get("annotation_state") in {"annotated", "unannotated"}:
        out["annotation_state"] = value["annotation_state"]
    if value.get("viewer_note_state") in {"noted", "unnoted"}:
        out["viewer_note_state"] = value["viewer_note_state"]
    if value.get("source_state") in {"sourced", "unsourced"}:
        out["source_state"] = value["source_state"]
    source_domain = _normalize_source_domain(value.get("source_domain"))
    if source_domain:
        out["source_domain"] = source_domain
    ext = _normalize_ext(value.get("ext"))
    if ext:
        out["ext"] = ext
    if value.get("favorite_state") in {"favorited", "unfavorited"}:
        out["favorite_state"] = value["favorite_state"]
    if value.get("later_state") in {"later", "not_later"}:
        out["later_state"] = value["later_state"]
    if value.get("done_state") in {"done", "not_done"}:
        out["done_state"] = value["done_state"]
    if value.get("rating_min") is not None:
        rating_min = _bounded_int(value["rating_min"], 0, 0, 5)
        if rating_min:
            out["rating_min"] = rating_min
    color = value.get("color")
    if isinstance(color, str) and len(color) == 7 and color.startswith("#"):
        try:
            int(color[1:], 16)
            out["color"] = color.lower()
        except ValueError:
            pass
    if value.get("color_tolerance") is not None:
        out["color_tolerance"] = _bounded_int(value["color_tolerance"], 72, 0, 442)
    return out


def sanitize_state(value: object, updated_at: int | None = None, revision: int = 0) -> dict:
    if not isinstance(value, dict):
        raise HTTPException(status_code=422, detail="State must be an object")
    collections = value.get("collections") if isinstance(value.get("collections"), dict) else {}
    saved_views = []
    for raw in value.get("savedViews", []) if isinstance(value.get("savedViews"), list) else []:
        if not isinstance(raw, dict) or not isinstance(raw.get("name"), str) or not raw["name"].strip():
            continue
        saved_views.append({
            "name": raw["name"].strip()[:80],
            "view": raw.get("view") if raw.get("view") in _ALLOWED_VIEWS else "all",
            "folderId": str(raw.get("folderId") or "")[:200],
            "tagName": str(raw.get("tagName") or "")[:200],
            "recentDays": _bounded_int(raw.get("recentDays"), 7, 1, 365),
            "searchQuery": str(raw.get("searchQuery") or "")[:300],
            "eagleSmartFolderId": str(raw.get("eagleSmartFolderId") or "")[:200],
            "sort": raw.get("sort") if raw.get("sort") in _ALLOWED_SORTS else "mtime",
            "dir": "asc" if raw.get("dir") == "asc" else "desc",
            "type": raw.get("type") if raw.get("type") in _ALLOWED_TYPES else "all",
            "filters": _sanitize_filters(raw.get("filters")),
        })
        if len(saved_views) >= _MAX_SAVED_VIEWS:
            break
    return {
        "version": 1,
        "revision": revision,
        "updatedAt": updated_at if updated_at is not None else int(time.time() * 1000),
        "savedViews": saved_views,
        "ratings": _sanitize_ratings(value.get("ratings")),
        "notes": _sanitize_notes(value.get("notes")),
        "reviewMarkers": _sanitize_review_markers(value.get("reviewMarkers")),
        "workspaces": _sanitize_workspaces(value.get("workspaces")),
        "collections": {
            "favorite": _unique_ids(collections.get("favorite")),
            "later": _unique_ids(collections.get("later")),
            "done": _unique_ids(collections.get("done")),
            "recentViewed": _unique_ids(collections.get("recentViewed")),
        },
    }


class ViewerStateStore:
    def __init__(self, path: str):
        self.path = Path(path)
        self.lock = threading.Lock()

    def _read_unlocked(self) -> dict:
        try:
            data = json.loads(self.path.read_text(encoding="utf-8"))
        except FileNotFoundError:
            return _default_state()
        except (OSError, json.JSONDecodeError):
            return _default_state()
        if not isinstance(data, dict):
            return _default_state()
        updated_at = data.get("updatedAt")
        revision = data.get("revision")
        return sanitize_state(
            data,
            updated_at if isinstance(updated_at, int) and updated_at > 0 else 0,
            revision if isinstance(revision, int) and revision >= 0 else 0,
        )

    def read(self) -> dict:
        with self.lock:
            return self._read_unlocked()

    def replace(self, value: object) -> dict:
        if not isinstance(value, dict):
            raise HTTPException(status_code=422, detail="State must be an object")
        with self.lock:
            current = self._read_unlocked()
            expected_revision = value.get("revision")
            if isinstance(expected_revision, int) and expected_revision != current["revision"]:
                raise HTTPException(status_code=409, detail={"message": "State changed", "state": current})
            state = sanitize_state(value, revision=current["revision"] + 1)
            self.path.parent.mkdir(parents=True, exist_ok=True)
            temporary = self.path.with_suffix(self.path.suffix + ".tmp")
            temporary.write_text(json.dumps(state, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
            os.replace(temporary, self.path)
        return state
