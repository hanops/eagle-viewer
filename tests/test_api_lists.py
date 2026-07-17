import pytest
from fastapi import HTTPException

import app.api.folders as folders_api
import app.api.items as items_api


def test_all_items_pagination_and_type_filter(sample_library):
    first_page = folders_api.api_all_items(limit=2)
    documents = folders_api.api_all_items(type="document")

    assert first_page["total"] == 6
    assert len(first_page["items"]) == 2
    assert first_page["nextOffset"] == 2
    assert first_page["hasMore"] is True
    assert {item["id"] for item in documents["items"]} == {
        "item-three",
        "item-xmind",
        "item-doc",
        "item-graffle",
    }


def test_folder_tag_search_and_recent_lists(sample_library):
    folder = folders_api.api_folder_items("child", sort="name", dir="asc")
    tagged = folders_api.api_tag_items("blue")
    searched = folders_api.api_search("First")
    recent = folders_api.api_recent(days=7)

    assert folder["folderId"] == "child"
    assert tagged["tag"] == "blue"
    assert searched["query"] == "First"
    assert [item["id"] for item in searched["items"]] == ["item-one"]
    assert recent["days"] == 7


def test_eagle_password_folder_and_item_endpoints_cannot_be_bypassed(sample_library):
    tree = folders_api.api_tree()["folders"]
    protected = next(node for node in tree[0]["children"] if node["id"] == "protected")

    assert protected == {
        "id": "protected",
        "name": "Protected",
        "description": "Eagle password folder",
        "children": [],
        "count": 0,
        "locked": True,
    }
    with pytest.raises(HTTPException) as folder_exc:
        folders_api.api_folder_items("protected-child")
    assert folder_exc.value.status_code == 423
    with pytest.raises(HTTPException) as item_exc:
        items_api.api_item_detail("item-locked")
    assert item_exc.value.status_code == 404


def test_resolve_items_returns_current_metadata(sample_library):
    result = items_api.api_resolve_items(["item-two", "missing", "item-one"])
    assert [item["id"] for item in result["items"]] == ["item-two", "item-one"]


def test_proprietary_asset_thumbnail_and_download_keep_distinct_paths(sample_library):
    detail = items_api.api_item_detail("item-graffle")
    thumbnail = items_api.api_item_thumbnail("item-graffle")
    original = items_api.api_item_file("item-graffle", download=True)

    assert detail["hasThumbnail"] is True
    assert str(thumbnail.path).endswith("remote-review-workflow_thumbnail.svg")
    assert str(original.path).endswith("remote-review-workflow.graffle")
    assert "remote%20review%20workflow.graffle" in original.headers["content-disposition"].lower()
