import app.api.folders as folders_api


def test_all_items_pagination(sample_library):
    out = folders_api.api_all_items(limit=2)

    assert out["total"] == 3
    assert len(out["items"]) == 2
    assert out["nextOffset"] == 2
    assert out["hasMore"] is True


def test_advanced_filters(sample_library):
    tagged = folders_api.api_all_items(tag_state="tagged")
    untagged = folders_api.api_all_items(tag_state="untagged")
    landscape = folders_api.api_all_items(shape="landscape", min_width=1000)

    assert {item["id"] for item in tagged["items"]} == {"item-one", "item-three"}
    assert {item["id"] for item in untagged["items"]} == {"item-two"}
    assert {item["id"] for item in landscape["items"]} == {"item-one", "item-two"}


def test_stats_and_duplicates_endpoints(sample_library):
    stats = folders_api.api_library_stats()["stats"]
    duplicates = folders_api.api_duplicates(limit=10)["groups"]

    assert stats["items"] == 3
    assert len(duplicates) == 1
    assert duplicates[0]["count"] == 2
