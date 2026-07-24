from fastapi import HTTPException
from app.state_store import ViewerStateStore


def test_state_store_keeps_only_basic_fields(tmp_path):
    store = ViewerStateStore(str(tmp_path / "state.json"))
    saved = store.replace({
        "savedViews": [{"name": "boards"}],
        "ratings": {"item-one": 5},
        "notes": {"item-one": "pick later"},
        "collections": {
            "favorite": ["item-one"],
            "recentViewed": ["item-two"],
        },
    })

    assert saved == {
        "version": 2,
        "revision": 1,
        "updatedAt": saved["updatedAt"],
    }
    assert set(saved.keys()) == {"version", "revision", "updatedAt"}


def test_state_store_rejects_stale_revision(tmp_path):
    store = ViewerStateStore(str(tmp_path / "state.json"))
    first = store.replace({"revision": 0})
    try:
        store.replace({"revision": 0})
    except HTTPException as exc:
        assert exc.status_code == 409
        assert exc.detail["state"]["revision"] == first["revision"]
    else:
        raise AssertionError("expected stale revision conflict")
