import os
from pathlib import Path

from app.vault import (
    get_all_items,
    get_all_tags,
    get_cache_stats,
    get_library_status,
    get_folder_tree,
    get_items_in_folder,
    get_item,
    is_folder_locked,
    get_items_by_tag,
    filter_items_by_type,
    search_items,
)
from app.vault.models import ItemInfo


def test_docker_image_includes_pyproject_version_source():
    dockerfile = (Path(__file__).resolve().parents[1] / "Dockerfile").read_text(encoding="utf-8")

    assert "COPY pyproject.toml ." in dockerfile


def test_loads_sample_library(sample_library):
    stats = get_cache_stats()

    assert stats["items"] == 18
    assert stats["folders"] == 6
    assert stats["tags"] == 7
    assert stats["skipped_bad_metadata"] == 0


def test_folder_tag_and_search_indexes(sample_library):
    tree = get_folder_tree()
    assert tree[0].id == "root"
    assert tree[0].children[0].id == "screens"

    assert len(get_all_items()) == 18
    assert {item.id for item in get_items_in_folder("screens")} == {
        "item-two", "item-three", "item-tall", "item-square", "item-mp4",
    }
    assert {item.id for item in get_items_in_folder("projects")} == set()
    assert {item.id for item in get_items_in_folder("boards")} == {
        "item-jpg", "item-longname", "item-plain1", "item-plain2", "item-wav",
    }
    assert [tag["name"] for tag in get_all_tags()] == [
        "Docs", "Screenshot", "UI", "Moodboard", "Diagram", "Legacy", "Planning",
    ]
    assert [item.id for item in get_items_by_tag("Screenshot")] == ["item-one", "item-mp4", "item-wide"]
    assert [item.id for item in search_items("txt")] == ["item-three", "item-notes"]


def test_proprietary_asset_keeps_original_and_eagle_thumbnail_separate(sample_library):
    item = get_item("item-graffle")

    assert item is not None
    assert item.main_file_path.endswith("remote-review-workflow.graffle")
    assert item.thumbnail_path.endswith("remote-review-workflow_thumbnail.svg")


def test_font_assets_are_available_through_document_filter():
    font = ItemInfo(id="font", name="Remote Font", ext="woff2", folders=[])
    proprietary = ItemInfo(id="diagram", name="Diagram", ext="graffle", folders=[])
    mind_map = ItemInfo(id="mind-map", name="Mind Map", ext="xmind", folders=[])

    assert filter_items_by_type([font, proprietary, mind_map], "document") == [font, proprietary, mind_map]


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
