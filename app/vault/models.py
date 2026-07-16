from dataclasses import dataclass, field
from typing import Optional


@dataclass
class FolderNode:
    """Folder in the library tree (from library metadata.json)."""
    id: str
    name: str
    description: str = ""
    parent: Optional[str] = None
    locked: bool = False
    children: list["FolderNode"] = field(default_factory=list)


@dataclass
class SmartFolderNode:
    """Read-only Eagle smart folder definition from library metadata.json."""
    id: str
    name: str
    description: str = ""
    conditions: list[dict] = field(default_factory=list)
    children: list["SmartFolderNode"] = field(default_factory=list)


@dataclass
class ItemInfo:
    """Single asset item (from each .info/metadata.json)."""
    id: str
    name: str
    ext: str
    folders: list[str]  # folder ids this item belongs to
    width: int = 0
    height: int = 0
    size: int = 0
    tags: list[str] = field(default_factory=list)
    url: str = ""
    annotation: str = ""
    palettes: list[dict] = field(default_factory=list)
    duration: float = 0
    bpm: float = 0
    btime: int = 0   # creation time (timestamp ms)
    mtime: int = 0   # modification time (timestamp ms)
    # Paths (resolved by parser)
    main_file_path: str = ""   # absolute path to the main media file
    thumbnail_path: str = ""  # optional thumbnail for list view
