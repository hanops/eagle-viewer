"""Small, atomic persistence layer for basic shared viewer state."""

import json
import os
import threading
import time
from pathlib import Path

from fastapi import HTTPException


def _default_state() -> dict:
    return {
        "version": 2,
        "revision": 0,
        "updatedAt": 0,
    }


def sanitize_state(value: object, updated_at: int | None = None, revision: int = 0) -> dict:
    if not isinstance(value, dict):
        raise HTTPException(status_code=422, detail="State must be an object")
    return {
        "version": 2,
        "revision": revision,
        "updatedAt": updated_at if updated_at is not None else int(time.time() * 1000),
    }


class ViewerStateStore:
    def __init__(self, path: str):
        self.path = Path(path)
        self.lock = threading.Lock()

    def _read_unlocked(self) -> dict:
        try:
            data = json.loads(self.path.read_text(encoding="utf-8"))
        except (FileNotFoundError, OSError, json.JSONDecodeError):
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
