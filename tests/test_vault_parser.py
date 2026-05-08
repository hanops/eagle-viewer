from app.vault import (
    get_all_items,
    get_all_tags,
    get_cache_stats,
    get_duplicate_groups,
    get_folder_tree,
    get_items_in_folder,
    get_items_by_tag,
    search_items,
)


def test_loads_sample_library(sample_library):
    stats = get_cache_stats()

    assert stats["items"] == 3
    assert stats["folders"] == 2
    assert stats["tags"] == 2
    assert stats["skipped_bad_metadata"] == 0


def test_folder_tag_and_search_indexes(sample_library):
    tree = get_folder_tree()
    assert tree[0].id == "root"
    assert tree[0].children[0].id == "screens"

    assert len(get_all_items()) == 3
    assert {item.id for item in get_items_in_folder("screens")} == {"item-two", "item-three"}
    assert [tag["name"] for tag in get_all_tags()] == ["Docs", "Screenshot"]
    assert [item.id for item in get_items_by_tag("Screenshot")] == ["item-one"]
    assert [item.id for item in search_items("txt")] == ["item-three"]


def test_duplicate_groups(sample_library):
    groups = get_duplicate_groups()

    assert len(groups) == 1
    assert groups[0]["count"] == 2
    assert {item["id"] for item in groups[0]["items"]} == {"item-one", "item-two"}
