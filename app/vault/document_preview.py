"""Bounded, read-only structural previews for office and packaged documents."""

from __future__ import annotations

import json
import posixpath
import re
import shutil
import subprocess
import zipfile
from functools import lru_cache
from pathlib import Path
from xml.etree import ElementTree as ET


OOXML_EXTENSIONS = {"docx", "xlsx", "pptx"}
DOCUMENT_PREVIEW_EXTENSIONS = OOXML_EXTENSIONS | {"doc", "xmind"}
MAX_ARCHIVE_BYTES = 128 * 1024 * 1024
MAX_ARCHIVE_MEMBERS = 4096
MAX_XML_BYTES = 12 * 1024 * 1024
MAX_TOTAL_XML_BYTES = 28 * 1024 * 1024
MAX_XMIND_SHEETS = 12
MAX_XMIND_NODES = 600
MAX_XMIND_DEPTH = 12
MAX_LEGACY_DOC_BYTES = 32 * 1024 * 1024
MAX_LEGACY_TEXT_BYTES = 1024 * 1024
MAX_LEGACY_BLOCKS = 320
LEGACY_EXTRACT_TIMEOUT_SECONDS = 8

_WORD_NS = "http://schemas.openxmlformats.org/wordprocessingml/2006/main"
_SHEET_NS = "http://schemas.openxmlformats.org/spreadsheetml/2006/main"
_REL_NS = "http://schemas.openxmlformats.org/officeDocument/2006/relationships"
_PACKAGE_REL_NS = "http://schemas.openxmlformats.org/package/2006/relationships"
_DRAWING_NS = "http://schemas.openxmlformats.org/drawingml/2006/main"


class DocumentPreviewError(ValueError):
    """A safe, user-facing document preview failure."""

    def __init__(self, message: str, status_code: int = 422):
        super().__init__(message)
        self.status_code = status_code


class _BoundedArchive:
    def __init__(self, path: Path):
        if not path.is_file():
            raise DocumentPreviewError("File not found", 404)
        if path.stat().st_size > MAX_ARCHIVE_BYTES:
            raise DocumentPreviewError("Document is too large for quick preview", 413)
        try:
            self.archive = zipfile.ZipFile(path)
        except (OSError, zipfile.BadZipFile) as exc:
            raise DocumentPreviewError("Document is not a valid supported archive") from exc
        if len(self.archive.infolist()) > MAX_ARCHIVE_MEMBERS:
            self.archive.close()
            raise DocumentPreviewError("Document contains too many archive entries", 413)
        self.total_read = 0

    def close(self) -> None:
        self.archive.close()

    def read(self, name: str, *, required: bool = True) -> bytes:
        try:
            info = self.archive.getinfo(name)
        except KeyError as exc:
            if required:
                raise DocumentPreviewError(f"Document preview data is missing: {name}") from exc
            return b""
        if info.flag_bits & 0x1:
            raise DocumentPreviewError("Encrypted documents cannot be previewed", 400)
        if info.file_size > MAX_XML_BYTES or self.total_read + info.file_size > MAX_TOTAL_XML_BYTES:
            raise DocumentPreviewError("Document preview data is too large", 413)
        try:
            payload = self.archive.read(info)
        except (OSError, RuntimeError, zipfile.BadZipFile) as exc:
            raise DocumentPreviewError("Document preview data could not be read") from exc
        self.total_read += len(payload)
        return payload


def _xml(payload: bytes, label: str) -> ET.Element:
    try:
        return ET.fromstring(payload)
    except ET.ParseError as exc:
        raise DocumentPreviewError(f"Invalid XML in {label}") from exc


def _trim(text: str, limit: int = 1200) -> str:
    normalized = " ".join(str(text or "").split())
    return normalized[:limit]


def _legacy_doc_command(path: Path) -> list[str] | None:
    antiword = shutil.which("antiword")
    if antiword:
        return [antiword, str(path)]
    textutil = shutil.which("textutil")
    if textutil:
        return [textutil, "-convert", "txt", "-stdout", str(path)]
    return None


def _preview_legacy_doc(path: Path) -> dict:
    if not path.is_file():
        raise DocumentPreviewError("File not found", 404)
    if path.stat().st_size > MAX_LEGACY_DOC_BYTES:
        raise DocumentPreviewError("Legacy Word document is too large for quick preview", 413)
    command = _legacy_doc_command(path)
    if not command:
        raise DocumentPreviewError("Legacy Word preview is not available on this server", 501)
    try:
        result = subprocess.run(
            command,
            check=False,
            capture_output=True,
            timeout=LEGACY_EXTRACT_TIMEOUT_SECONDS,
        )
    except subprocess.TimeoutExpired as exc:
        raise DocumentPreviewError("Legacy Word preview timed out", 504) from exc
    except OSError as exc:
        raise DocumentPreviewError("Legacy Word preview could not be started", 501) from exc
    if result.returncode != 0 or not result.stdout:
        raise DocumentPreviewError("Legacy Word document could not be read")

    truncated = len(result.stdout) > MAX_LEGACY_TEXT_BYTES
    payload = result.stdout[:MAX_LEGACY_TEXT_BYTES]
    text = payload.decode("utf-8", errors="replace").replace("\x00", "")
    raw_blocks = [line.strip() for line in re.split(r"\n\s*\n|\r?\n", text) if line.strip()]
    blocks: list[dict] = []
    for index, line in enumerate(raw_blocks[:MAX_LEGACY_BLOCKS]):
        normalized = _trim(line, 4000)
        if not normalized:
            continue
        block_type = "heading" if index == 0 and len(normalized) <= 120 else "paragraph"
        blocks.append({"type": block_type, "text": normalized, "level": 1 if block_type == "heading" else 0})
    if not blocks:
        raise DocumentPreviewError("Legacy Word document contains no readable text")
    return {
        "kind": "doc",
        "blocks": blocks,
        "summary": {"blocks": len(blocks), "characters": sum(len(block["text"]) for block in blocks)},
        "truncated": truncated or len(raw_blocks) > len(blocks),
        "extractor": "antiword" if Path(command[0]).name == "antiword" else "textutil",
    }


def _word_text(node: ET.Element) -> str:
    parts: list[str] = []
    for entry in node.iter():
        local = entry.tag.rsplit("}", 1)[-1]
        if local == "t" and entry.text:
            parts.append(entry.text)
        elif local == "tab":
            parts.append("\t")
        elif local in {"br", "cr"}:
            parts.append("\n")
    return _trim("".join(parts))


def _preview_docx(archive: _BoundedArchive) -> dict:
    root = _xml(archive.read("word/document.xml"), "word/document.xml")
    body = root.find(f"{{{_WORD_NS}}}body")
    blocks: list[dict] = []
    if body is not None:
        for child in body:
            local = child.tag.rsplit("}", 1)[-1]
            if local == "p":
                text = _word_text(child)
                if not text:
                    continue
                style_node = child.find(f".//{{{_WORD_NS}}}pStyle")
                style = style_node.get(f"{{{_WORD_NS}}}val", "") if style_node is not None else ""
                kind = "heading" if style.lower().startswith(("heading", "title")) else "paragraph"
                blocks.append({"type": kind, "text": text, "level": _heading_level(style)})
            elif local == "tbl":
                rows: list[list[str]] = []
                for row in child.findall(f".//{{{_WORD_NS}}}tr")[:20]:
                    cells = [_word_text(cell) for cell in row.findall(f"{{{_WORD_NS}}}tc")[:12]]
                    if any(cells):
                        rows.append(cells)
                if rows:
                    blocks.append({"type": "table", "rows": rows})
            if len(blocks) >= 120:
                break
    return {
        "kind": "docx",
        "blocks": blocks,
        "summary": {"blocks": len(blocks)},
        "truncated": len(blocks) >= 120,
    }


def _heading_level(style: str) -> int:
    match = re.search(r"(\d+)$", style or "")
    return max(1, min(int(match.group(1)), 6)) if match else 1


def _shared_strings(archive: _BoundedArchive) -> list[str]:
    payload = archive.read("xl/sharedStrings.xml", required=False)
    if not payload:
        return []
    root = _xml(payload, "xl/sharedStrings.xml")
    values: list[str] = []
    for entry in root.findall(f"{{{_SHEET_NS}}}si"):
        values.append(_trim("".join(node.text or "" for node in entry.iter(f"{{{_SHEET_NS}}}t"))))
        if len(values) >= 50_000:
            break
    return values


def _column_index(reference: str) -> int:
    match = re.match(r"([A-Z]+)", reference.upper())
    if not match:
        return 0
    value = 0
    for char in match.group(1):
        value = value * 26 + ord(char) - 64
    return max(0, value - 1)


def _column_name(index: int) -> str:
    value = index + 1
    out = ""
    while value:
        value, remainder = divmod(value - 1, 26)
        out = chr(65 + remainder) + out
    return out


def _xlsx_cell_value(cell: ET.Element, shared: list[str]) -> str:
    cell_type = cell.get("t", "")
    if cell_type == "inlineStr":
        return _trim("".join(node.text or "" for node in cell.iter(f"{{{_SHEET_NS}}}t")))
    value_node = cell.find(f"{{{_SHEET_NS}}}v")
    raw = value_node.text if value_node is not None and value_node.text is not None else ""
    if cell_type == "s":
        try:
            return shared[int(raw)]
        except (ValueError, IndexError):
            return ""
    if cell_type == "b":
        return "TRUE" if raw == "1" else "FALSE"
    if not raw:
        formula = cell.find(f"{{{_SHEET_NS}}}f")
        return "=" + _trim(formula.text or "", 400) if formula is not None else ""
    return _trim(raw)


def _preview_xlsx(archive: _BoundedArchive) -> dict:
    workbook = _xml(archive.read("xl/workbook.xml"), "xl/workbook.xml")
    relationships = _xml(archive.read("xl/_rels/workbook.xml.rels"), "xl/_rels/workbook.xml.rels")
    relation_targets = {
        entry.get("Id", ""): entry.get("Target", "")
        for entry in relationships.findall(f"{{{_PACKAGE_REL_NS}}}Relationship")
    }
    sheets = workbook.findall(f".//{{{_SHEET_NS}}}sheet")
    sheet_names = [_trim(sheet.get("name", "Sheet"), 120) for sheet in sheets]
    if not sheets:
        return {"kind": "xlsx", "sheetNames": [], "activeSheet": "", "columns": [], "rows": [], "summary": {"rows": 0, "columns": 0}}
    first = sheets[0]
    relation_id = first.get(f"{{{_REL_NS}}}id", "")
    target = relation_targets.get(relation_id, "worksheets/sheet1.xml")
    sheet_path = posixpath.normpath(posixpath.join("xl", target.lstrip("/")))
    if sheet_path.startswith("xl/xl/"):
        sheet_path = sheet_path[3:]
    root = _xml(archive.read(sheet_path), sheet_path)
    shared = _shared_strings(archive)
    rows: list[list[str]] = []
    max_column = 0
    for row in root.findall(f".//{{{_SHEET_NS}}}row")[:60]:
        values: dict[int, str] = {}
        for cell in row.findall(f"{{{_SHEET_NS}}}c"):
            index = _column_index(cell.get("r", ""))
            if index >= 20:
                continue
            values[index] = _xlsx_cell_value(cell, shared)
            max_column = max(max_column, index + 1)
        if values:
            rows.append([values.get(index, "") for index in range(max_column)])
    for row in rows:
        row.extend([""] * (max_column - len(row)))
    dimension = root.find(f"{{{_SHEET_NS}}}dimension")
    dimension_ref = dimension.get("ref", "") if dimension is not None else ""
    return {
        "kind": "xlsx",
        "sheetNames": sheet_names[:40],
        "activeSheet": sheet_names[0] if sheet_names else "Sheet 1",
        "columns": [_column_name(index) for index in range(max_column)],
        "rows": rows,
        "summary": {"rows": len(rows), "columns": max_column, "dimension": dimension_ref},
        "truncated": len(rows) >= 60 or max_column >= 20,
    }


def _slide_number(name: str) -> int:
    match = re.search(r"slide(\d+)\.xml$", name)
    return int(match.group(1)) if match else 0


def _preview_pptx(archive: _BoundedArchive) -> dict:
    names = sorted(
        (name for name in archive.archive.namelist() if re.fullmatch(r"ppt/slides/slide\d+\.xml", name)),
        key=_slide_number,
    )
    slides: list[dict] = []
    for index, name in enumerate(names[:12], start=1):
        root = _xml(archive.read(name), name)
        lines: list[str] = []
        for paragraph in root.findall(f".//{{{_DRAWING_NS}}}p"):
            text = _trim("".join(node.text or "" for node in paragraph.iter(f"{{{_DRAWING_NS}}}t")))
            if text:
                lines.append(text)
            if len(lines) >= 40:
                break
        slides.append({"number": index, "title": lines[0] if lines else f"Slide {index}", "lines": lines})
    return {
        "kind": "pptx",
        "slides": slides,
        "summary": {"slides": len(names)},
        "truncated": len(names) > len(slides),
    }


def _local_name(node: ET.Element) -> str:
    return node.tag.rsplit("}", 1)[-1]


def _direct_child(node: ET.Element, name: str) -> ET.Element | None:
    return next((child for child in node if _local_name(child) == name), None)


def _xmind_xml_topic_children(node: ET.Element) -> list[ET.Element]:
    children = _direct_child(node, "children")
    if children is None:
        return []
    topics: list[ET.Element] = []
    for group in children:
        if _local_name(group) != "topics":
            continue
        topics.extend(child for child in group if _local_name(child) == "topic")
    return topics


def _xmind_xml_topic(node: ET.Element, depth: int, budget: list[int]) -> tuple[dict | None, int]:
    if budget[0] <= 0 or depth > MAX_XMIND_DEPTH:
        return None, depth
    budget[0] -= 1
    title_node = _direct_child(node, "title")
    title = _trim("".join(title_node.itertext()) if title_node is not None else "", 500) or "未命名主题"
    children: list[dict] = []
    max_depth = depth
    if depth < MAX_XMIND_DEPTH:
        for child in _xmind_xml_topic_children(node):
            parsed, child_depth = _xmind_xml_topic(child, depth + 1, budget)
            if parsed is not None:
                children.append(parsed)
                max_depth = max(max_depth, child_depth)
            if budget[0] <= 0:
                break
    return {"title": title, "children": children}, max_depth


def _xmind_json_children(topic: dict) -> list[dict]:
    raw = topic.get("children")
    if not isinstance(raw, dict):
        return []
    children: list[dict] = []
    for key in ("attached", "detached"):
        values = raw.get(key)
        if isinstance(values, list):
            children.extend(value for value in values if isinstance(value, dict))
    return children


def _xmind_json_topic(topic: dict, depth: int, budget: list[int]) -> tuple[dict | None, int]:
    if budget[0] <= 0 or depth > MAX_XMIND_DEPTH:
        return None, depth
    budget[0] -= 1
    title = _trim(topic.get("title", ""), 500) or "未命名主题"
    children: list[dict] = []
    max_depth = depth
    if depth < MAX_XMIND_DEPTH:
        for child in _xmind_json_children(topic):
            parsed, child_depth = _xmind_json_topic(child, depth + 1, budget)
            if parsed is not None:
                children.append(parsed)
                max_depth = max(max_depth, child_depth)
            if budget[0] <= 0:
                break
    return {"title": title, "children": children}, max_depth


def _preview_xmind_json(payload: bytes) -> dict:
    try:
        data = json.loads(payload)
    except (UnicodeDecodeError, json.JSONDecodeError) as exc:
        raise DocumentPreviewError("Invalid JSON in content.json") from exc
    raw_sheets = data if isinstance(data, list) else data.get("sheets", []) if isinstance(data, dict) else []
    if not isinstance(raw_sheets, list):
        raw_sheets = []
    budget = [MAX_XMIND_NODES]
    sheets: list[dict] = []
    max_depth = 0
    for index, sheet in enumerate(raw_sheets[:MAX_XMIND_SHEETS], start=1):
        if not isinstance(sheet, dict) or budget[0] <= 0:
            continue
        root_topic = sheet.get("rootTopic")
        if not isinstance(root_topic, dict):
            continue
        root, depth = _xmind_json_topic(root_topic, 0, budget)
        if root is None:
            continue
        sheets.append({"title": _trim(sheet.get("title", ""), 200) or f"画布 {index}", "root": root})
        max_depth = max(max_depth, depth)
    node_count = MAX_XMIND_NODES - budget[0]
    return {
        "kind": "xmind",
        "format": "json",
        "sheets": sheets,
        "summary": {"sheets": len(raw_sheets), "nodes": node_count, "maxDepth": max_depth},
        "truncated": len(raw_sheets) > len(sheets) or budget[0] <= 0 or max_depth >= MAX_XMIND_DEPTH,
    }


def _preview_xmind_xml(payload: bytes) -> dict:
    root = _xml(payload, "content.xml")
    raw_sheets = [child for child in root if _local_name(child) == "sheet"]
    budget = [MAX_XMIND_NODES]
    sheets: list[dict] = []
    max_depth = 0
    for index, sheet in enumerate(raw_sheets[:MAX_XMIND_SHEETS], start=1):
        if budget[0] <= 0:
            break
        root_topic = _direct_child(sheet, "topic")
        if root_topic is None:
            continue
        topic, depth = _xmind_xml_topic(root_topic, 0, budget)
        if topic is None:
            continue
        title_node = _direct_child(sheet, "title")
        title = _trim("".join(title_node.itertext()) if title_node is not None else "", 200) or f"画布 {index}"
        sheets.append({"title": title, "root": topic})
        max_depth = max(max_depth, depth)
    node_count = MAX_XMIND_NODES - budget[0]
    return {
        "kind": "xmind",
        "format": "xml",
        "sheets": sheets,
        "summary": {"sheets": len(raw_sheets), "nodes": node_count, "maxDepth": max_depth},
        "truncated": len(raw_sheets) > len(sheets) or budget[0] <= 0 or max_depth >= MAX_XMIND_DEPTH,
    }


def _preview_xmind(archive: _BoundedArchive) -> dict:
    json_payload = archive.read("content.json", required=False)
    if json_payload:
        return _preview_xmind_json(json_payload)
    xml_payload = archive.read("content.xml", required=False)
    if xml_payload:
        return _preview_xmind_xml(xml_payload)
    raise DocumentPreviewError("XMind preview data is missing: content.json or content.xml")


@lru_cache(maxsize=64)
def _cached_preview(path_value: str, mtime_ns: int, size: int, ext: str) -> dict:
    del mtime_ns, size
    path = Path(path_value)
    if ext == "doc":
        return _preview_legacy_doc(path)
    archive = _BoundedArchive(path)
    try:
        if ext == "docx":
            return _preview_docx(archive)
        if ext == "xlsx":
            return _preview_xlsx(archive)
        if ext == "pptx":
            return _preview_pptx(archive)
        if ext == "xmind":
            return _preview_xmind(archive)
        raise DocumentPreviewError("Quick preview is not available for this document type", 400)
    finally:
        archive.close()


def preview_document(path: Path, ext: str) -> dict:
    normalized_ext = str(ext or "").lower().lstrip(".")
    if normalized_ext not in DOCUMENT_PREVIEW_EXTENSIONS:
        raise DocumentPreviewError("Quick preview is only available for DOC, DOCX, XLSX, PPTX, and XMind", 400)
    try:
        stat = path.stat()
    except OSError as exc:
        raise DocumentPreviewError("File not found", 404) from exc
    return _cached_preview(str(path), stat.st_mtime_ns, stat.st_size, normalized_ext)


def preview_ooxml(path: Path, ext: str) -> dict:
    """Backward-compatible alias for callers that used the Office-only name."""
    return preview_document(path, ext)
