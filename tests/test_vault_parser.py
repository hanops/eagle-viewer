import os

from app.vault import (
    get_all_items,
    get_all_tags,
    get_cache_stats,
    get_library_status,
    get_smart_folder_tree,
    get_items_in_smart_folder,
    get_duplicate_groups,
    get_folder_tree,
    get_items_in_folder,
    get_item,
    is_folder_locked,
    get_items_by_tag,
    filter_items_by_type,
    search_items,
)
from app.vault.models import ItemInfo


def test_loads_sample_library(sample_library):
    stats = get_cache_stats()

    assert stats["items"] == 6
    assert stats["folders"] == 3
    assert stats["tags"] == 5
    assert stats["skipped_bad_metadata"] == 0


def test_folder_tag_and_search_indexes(sample_library):
    tree = get_folder_tree()
    assert tree[0].id == "root"
    assert tree[0].children[0].id == "screens"

    assert len(get_all_items()) == 6
    assert {item.id for item in get_items_in_folder("screens")} == {"item-two", "item-three"}
    assert [tag["name"] for tag in get_all_tags()] == ["Diagram", "Docs", "Legacy", "Planning", "Screenshot"]
    assert [item.id for item in get_items_by_tag("Screenshot")] == ["item-one"]
    assert [item.id for item in search_items("txt")] == ["item-three"]


def test_proprietary_asset_keeps_original_and_eagle_thumbnail_separate(sample_library):
    item = get_item("item-graffle")

    assert item is not None
    assert item.main_file_path.endswith("remote-review-workflow.graffle")
    assert item.thumbnail_path.endswith("remote-review-workflow_thumbnail.svg")


def test_duplicate_groups(sample_library):
    groups = get_duplicate_groups()

    assert len(groups) == 1
    assert groups[0]["count"] == 2
    assert {item["id"] for item in groups[0]["items"]} == {"item-one", "item-two"}


def test_font_assets_are_available_through_document_filter():
    font = ItemInfo(id="font", name="Remote Font", ext="woff2", folders=[])
    proprietary = ItemInfo(id="diagram", name="Diagram", ext="graffle", folders=[])
    mind_map = ItemInfo(id="mind-map", name="Mind Map", ext="xmind", folders=[])

    assert filter_items_by_type([font, proprietary, mind_map], "document") == [font, proprietary, mind_map]


def test_native_eagle_smart_folders_are_read_only_and_recursive(sample_library):
    tree = get_smart_folder_tree()

    assert [node.id for node in tree] == ["smart-reference"]
    assert [node.id for node in tree[0].children] == ["smart-png", "smart-docs"]
    assert {item.id for item in get_items_in_smart_folder("smart-png")} == {"item-one", "item-two"}
    assert [item.id for item in get_items_in_smart_folder("smart-docs")] == ["item-three"]
    assert {item.id for item in get_items_in_smart_folder("smart-reference")} == {"item-one", "item-two", "item-three"}


def test_eagle_password_folders_are_redacted_from_every_index(sample_library):
    tree = get_folder_tree()
    protected = next(node for node in tree[0].children if node.id == "protected")
    stats = get_cache_stats()

    assert protected.locked is True
    assert protected.children == []
    assert is_folder_locked("protected") is True
    assert is_folder_locked("protected-child") is True
    assert get_items_in_folder("protected") == []
    assert get_items_in_folder("protected-child") == []
    assert get_item("item-locked") is None
    assert all(item.id != "item-locked" for item in get_all_items())
    assert all(tag["name"] != "PrivateTag" for tag in get_all_tags())
    assert search_items("must stay private") == []
    assert stats["lockedFolders"] == 2
    assert stats["skipped_locked_items"] == 1


def test_library_status_detects_metadata_changes_without_writing_vault(sample_library):
    metadata = sample_library / "images" / "item-one.info" / "metadata.json"
    original = metadata.stat()

    assert get_library_status(deep=True)["changed"] is False
    try:
        os.utime(metadata, ns=(original.st_atime_ns, original.st_mtime_ns + 1_000_000))
        status = get_library_status(deep=True)
        assert status["changed"] is True
        assert status["mode"] == "deep"
        assert status["revision"] != status["observedRevision"]
    finally:
        os.utime(metadata, ns=(original.st_atime_ns, original.st_mtime_ns))
