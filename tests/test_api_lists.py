import app.api.folders as folders_api
import app.api.items as items_api
from fastapi import HTTPException
import pytest


def test_all_items_pagination(sample_library):
    out = folders_api.api_all_items(limit=2)
    documents = folders_api.api_all_items(type="document")

    assert out["total"] == 6
    assert len(out["items"]) == 2
    assert out["nextOffset"] == 2
    assert out["hasMore"] is True
    assert {item["id"] for item in documents["items"]} == {"item-three", "item-xmind", "item-doc", "item-graffle"}


def test_advanced_filters(sample_library):
    tagged = folders_api.api_all_items(tag_state="tagged")
    untagged = folders_api.api_all_items(tag_state="untagged")
    landscape = folders_api.api_all_items(shape="landscape", min_width=1000)
    example_source = folders_api.api_all_items(source_domain="https://www.example.com/alpha")
    missing_source = folders_api.api_all_items(source_domain="missing.example")
    png_items = folders_api.api_all_items(ext=".PNG")

    assert {item["id"] for item in tagged["items"]} == {"item-one", "item-three", "item-xmind", "item-doc", "item-graffle"}
    assert {item["id"] for item in untagged["items"]} == {"item-two"}
    assert {item["id"] for item in landscape["items"]} == {"item-one", "item-two", "item-graffle"}
    assert [item["id"] for item in example_source["items"]] == ["item-one"]
    assert missing_source["total"] == 0
    assert {item["id"] for item in png_items["items"]} == {"item-one", "item-two"}


def test_color_palette_filter_and_metadata(sample_library):
    red = folders_api.api_all_items(color="#ef3333", color_tolerance=24)

    assert [item["id"] for item in red["items"]] == ["item-one"]
    assert red["items"][0]["palettes"][0] == {"color": [240, 50, 50], "ratio": 75.0}
    assert red["items"][0]["sourceDomain"] == "example.com"


def test_palette_atlas_clusters_library_colors(sample_library):
    atlas = folders_api.api_palettes(limit=36)

    assert atlas["coloredItems"] == 2
    assert atlas["paletteSamples"] == 3
    assert atlas["totalClusters"] == 3
    assert {sample["id"] for cluster in atlas["clusters"] for sample in cluster["samples"]} == {"item-one", "item-two"}
    assert all(cluster["hex"].startswith("#") and len(cluster["hex"]) == 7 for cluster in atlas["clusters"])
    assert sorted(cluster["itemCount"] for cluster in atlas["clusters"]) == [1, 1, 1]


def test_random_walk_is_deterministic_and_type_scoped(sample_library):
    first = folders_api.api_random(seed="walk-42", limit=2)
    again = folders_api.api_random(seed="walk-42", limit=2)
    images = folders_api.api_random(seed="walk-42", limit=20, type="image")

    assert first["seed"] == "walk-42"
    assert first["totalEligible"] == 6
    assert [item["id"] for item in first["items"]] == [item["id"] for item in again["items"]]
    assert len(first["items"]) == 2
    assert images["totalEligible"] == 2
    assert {item["ext"] for item in images["items"]} == {"png"}


def test_stats_and_duplicates_endpoints(sample_library):
    stats = folders_api.api_library_stats()["stats"]
    duplicates = folders_api.api_duplicates(limit=10)["groups"]

    assert stats["items"] == 6
    assert len(duplicates) == 1
    assert duplicates[0]["count"] == 2


def test_native_eagle_smart_folder_endpoints(sample_library):
    tree = folders_api.api_smart_folders()["smartFolders"]
    result = folders_api.api_smart_folder_items("smart-png", sort="name", dir="asc", limit=1)

    assert tree[0]["count"] == 3
    assert tree[0]["children"][0]["ruleSummary"] == "格式 · png"
    assert result["smartFolder"]["name"] == "PNG 素材"
    assert result["total"] == 2
    assert len(result["items"]) == 1
    assert result["hasMore"] is True

    with pytest.raises(HTTPException) as exc:
        folders_api.api_smart_folder_items("missing")
    assert exc.value.status_code == 404


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
    out = items_api.api_resolve_items(["item-two", "missing", "item-one"])

    assert [item["id"] for item in out["items"]] == ["item-two", "item-one"]


def test_proprietary_asset_thumbnail_and_download_keep_distinct_paths(sample_library):
    detail = items_api.api_item_detail("item-graffle")
    thumbnail = items_api.api_item_thumbnail("item-graffle")
    original = items_api.api_item_file("item-graffle", download=True)

    assert detail["hasThumbnail"] is True
    assert str(thumbnail.path).endswith("remote-review-workflow_thumbnail.svg")
    assert str(original.path).endswith("remote-review-workflow.graffle")
    assert "remote%20review%20workflow.graffle" in original.headers["content-disposition"].lower()


def test_similar_items_endpoint_ranks_local_metadata(sample_library):
    out = items_api.api_similar_items("item-one", limit=10)

    assert out["sourceId"] == "item-one"
    assert [item["id"] for item in out["items"]][0] == "item-two"
    assert all(item["id"] != "item-one" for item in out["items"])
    assert 1 <= out["items"][0]["similarityScore"] <= 100
    assert "同格式" in out["items"][0]["similaritySignals"]

    with pytest.raises(HTTPException) as exc:
        items_api.api_similar_items("missing")
    assert exc.value.status_code == 404
