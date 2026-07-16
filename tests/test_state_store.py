from fastapi import HTTPException

from app.state_store import ViewerStateStore, sanitize_state


def test_state_store_persists_sanitized_state(tmp_path):
    store = ViewerStateStore(str(tmp_path / "state.json"))
    saved = store.replace({
        "savedViews": [{"name": "Screens", "view": "tag", "tagName": "ui", "sort": "name"}],
        "ratings": {"item-one": 5, "item-two": "3", "item-bad": 7},
        "notes": {"item-one": " Review on phone ", "item-two": "", "item-bad": 42},
        "reviewMarkers": {"item-one": [
            {"id": "mark-1", "kind": "point", "text": " Align this edge ", "x": 1.4, "y": -0.2, "createdAt": 12},
            {"id": "mark-2", "kind": "time", "text": "Cut here", "time": 9.8764},
            {"id": "", "text": "invalid"},
        ]},
        "workspaces": [{"id": "ws-brand", "name": "Brand launch", "color": "#FF8800", "itemIds": ["item-one", "item-one", "item-two"]}],
        "collections": {"favorite": ["item-one", "item-one"], "later": ["item-two"], "done": ["item-four"], "recentViewed": ["item-three"]},
    })

    assert saved["collections"]["favorite"] == ["item-one"]
    assert saved["collections"]["done"] == ["item-four"]
    assert saved["collections"]["recentViewed"] == ["item-three"]
    assert saved["ratings"] == {"item-one": 5, "item-two": 3}
    assert saved["notes"] == {"item-one": "Review on phone"}
    assert saved["reviewMarkers"] == {"item-one": [
        {"id": "mark-1", "kind": "point", "text": "Align this edge", "createdAt": 12, "updatedAt": 0, "x": 1.0, "y": 0.0},
        {"id": "mark-2", "kind": "time", "text": "Cut here", "createdAt": 0, "updatedAt": 0, "time": 9.876},
    ]}
    assert saved["workspaces"] == [{"id": "ws-brand", "name": "Brand launch", "color": "#ff8800", "itemIds": ["item-one", "item-two"], "createdAt": 0, "updatedAt": 0}]
    assert saved["revision"] == 1
    assert store.read()["savedViews"][0]["name"] == "Screens"


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


def test_filters_are_whitelisted_and_bounded():
    state = sanitize_state({"savedViews": [{"name": "Safe", "filters": {"shape": "square", "unknown": "ignored", "min_width": -3, "source_domain": "https://www.Example.com/foo", "ext": ".PNG", "favorite_state": "unfavorited", "later_state": "not_later", "done_state": "not_done", "viewer_note_state": "noted", "rating_min": 9, "color": "#AABBCC", "color_tolerance": 999}}]})

    assert state["savedViews"][0]["filters"] == {"shape": "square", "min_width": 0, "source_domain": "example.com", "ext": "png", "favorite_state": "unfavorited", "later_state": "not_later", "done_state": "not_done", "viewer_note_state": "noted", "rating_min": 5, "color": "#aabbcc", "color_tolerance": 442}


def test_sanitize_state_rejects_non_object():
    try:
        sanitize_state([])
    except Exception as exc:
        assert getattr(exc, "status_code", None) == 422
    else:
        raise AssertionError("expected validation failure")


def test_workspaces_require_unique_ids_and_valid_names():
    state = sanitize_state({"workspaces": [
        {"id": "ws-one", "name": " First ", "color": "not-a-color", "itemIds": ["item-one"]},
        {"id": "ws-one", "name": "Duplicate", "itemIds": ["item-two"]},
        {"id": "ws-empty", "name": ""},
    ]})

    assert len(state["workspaces"]) == 1
    assert state["workspaces"][0]["name"] == "First"
    assert state["workspaces"][0]["color"] == "#4f82d9"


def test_eagle_smart_saved_view_survives_shared_state_round_trip(tmp_path):
    store = ViewerStateStore(str(tmp_path / "state.json"))

    saved = store.replace({
        "savedViews": [{
            "name": "Remote review",
            "view": "eagle-smart",
            "eagleSmartFolderId": "smart-review",
            "sort": "name",
        }],
    })

    assert saved["savedViews"][0]["view"] == "eagle-smart"
    assert saved["savedViews"][0]["eagleSmartFolderId"] == "smart-review"
    assert store.read()["savedViews"] == saved["savedViews"]
