from fastapi import HTTPException

from app.state_store import ViewerStateStore, sanitize_state


def test_state_store_keeps_only_basic_collections(tmp_path):
    store = ViewerStateStore(str(tmp_path / "state.json"))
    saved = store.replace({
        "savedViews": [{"name": "ignored"}],
        "ratings": {"item-one": 5},
        "notes": {"item-one": "ignored"},
        "collections": {
            "favorite": ["item-one", "item-one"],
            "recentViewed": ["item-two"],
            "later": ["ignored"],
            "done": ["ignored"],
        },
    })

    assert saved == {
        "version": 2,
        "revision": 1,
        "updatedAt": saved["updatedAt"],
        "collections": {"favorite": ["item-one"], "recentViewed": ["item-two"]},
    }
    assert store.read()["collections"] == saved["collections"]


def test_state_store_rejects_stale_revision(tmp_path):
    store = ViewerStateStore(str(tmp_path / "state.json"))
    first = store.replace({"revision": 0, "collections": {"favorite": ["item-one"]}})

    try:
        store.replace({"revision": 0, "collections": {"favorite": ["item-two"]}})
    except HTTPException as exc:
        assert exc.status_code == 409
        assert exc.detail["state"]["revision"] == first["revision"]
    else:
        raise AssertionError("expected stale revision conflict")


def test_sanitize_state_rejects_non_object():
    try:
        sanitize_state([])
    except HTTPException as exc:
        assert exc.status_code == 422
    else:
        raise AssertionError("expected validation failure")
