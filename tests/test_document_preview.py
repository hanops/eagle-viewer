import zipfile
from types import SimpleNamespace

import pytest

import app.api.items as items_api
import app.vault.document_preview as document_preview
from app.vault.document_preview import DocumentPreviewError, preview_document, preview_ooxml
from app.vault.models import ItemInfo


def _write_archive(path, entries):
    with zipfile.ZipFile(path, "w", zipfile.ZIP_DEFLATED) as archive:
        for name, payload in entries.items():
            archive.writestr(name, payload)


def test_docx_preview_extracts_headings_paragraphs_and_tables(tmp_path):
    path = tmp_path / "brief.docx"
    _write_archive(
        path,
        {
            "word/document.xml": """
                <w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
                  <w:body>
                    <w:p><w:pPr><w:pStyle w:val="Heading1"/></w:pPr><w:r><w:t>Remote brief</w:t></w:r></w:p>
                    <w:p><w:r><w:t>Review anywhere.</w:t></w:r></w:p>
                    <w:tbl><w:tr><w:tc><w:p><w:r><w:t>Owner</w:t></w:r></w:p></w:tc><w:tc><w:p><w:r><w:t>Design</w:t></w:r></w:p></w:tc></w:tr></w:tbl>
                  </w:body>
                </w:document>
            """,
        },
    )

    preview = preview_ooxml(path, "docx")

    assert preview["kind"] == "docx"
    assert preview["blocks"][0] == {"type": "heading", "text": "Remote brief", "level": 1}
    assert preview["blocks"][1]["text"] == "Review anywhere."
    assert preview["blocks"][2]["rows"] == [["Owner", "Design"]]


def test_xlsx_preview_resolves_shared_and_inline_strings(tmp_path):
    path = tmp_path / "plan.xlsx"
    _write_archive(
        path,
        {
            "xl/workbook.xml": """
                <workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
                  <sheets><sheet name="Roadmap" sheetId="1" r:id="rId1"/></sheets>
                </workbook>
            """,
            "xl/_rels/workbook.xml.rels": """
                <Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
                  <Relationship Id="rId1" Target="worksheets/sheet1.xml"/>
                </Relationships>
            """,
            "xl/sharedStrings.xml": """
                <sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><si><t>Status</t></si><si><t>Ready</t></si></sst>
            """,
            "xl/worksheets/sheet1.xml": """
                <worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
                  <dimension ref="A1:C2"/><sheetData>
                    <row r="1"><c r="A1" t="s"><v>0</v></c><c r="C1" t="inlineStr"><is><t>Owner</t></is></c></row>
                    <row r="2"><c r="A2" t="s"><v>1</v></c><c r="B2"><v>42</v></c></row>
                  </sheetData>
                </worksheet>
            """,
        },
    )

    preview = preview_ooxml(path, "xlsx")

    assert preview["activeSheet"] == "Roadmap"
    assert preview["columns"] == ["A", "B", "C"]
    assert preview["rows"] == [["Status", "", "Owner"], ["Ready", "42", ""]]
    assert preview["summary"]["dimension"] == "A1:C2"


def test_pptx_preview_extracts_ordered_slide_text(tmp_path):
    path = tmp_path / "deck.pptx"

    def slide(title, body):
        return f"""
            <p:sld xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
              <p:cSld><p:spTree><p:sp><p:txBody><a:p><a:r><a:t>{title}</a:t></a:r></a:p><a:p><a:r><a:t>{body}</a:t></a:r></a:p></p:txBody></p:sp></p:spTree></p:cSld>
            </p:sld>
        """
    _write_archive(
        path,
        {
            "ppt/slides/slide2.xml": slide("Second", "Details"),
            "ppt/slides/slide1.xml": slide("First", "Overview"),
        },
    )

    preview = preview_ooxml(path, "pptx")

    assert preview["summary"]["slides"] == 2
    assert [entry["title"] for entry in preview["slides"]] == ["First", "Second"]
    assert preview["slides"][0]["lines"] == ["First", "Overview"]


def test_xmind_preview_extracts_legacy_xml_topic_hierarchy(tmp_path):
    path = tmp_path / "strategy.xmind"
    _write_archive(
        path,
        {
            "content.xml": """
                <xmap-content xmlns="urn:xmind:xmap:xmlns:content:2.0">
                  <sheet id="sheet-one">
                    <title>Remote roadmap</title>
                    <topic id="root"><title>Launch</title><children><topics type="attached">
                      <topic id="research"><title>Research</title><children><topics type="attached">
                        <topic id="interviews"><title>User interviews</title></topic>
                      </topics></children></topic>
                      <topic id="delivery"><title>Delivery</title></topic>
                    </topics></children></topic>
                  </sheet>
                </xmap-content>
            """,
        },
    )

    preview = preview_document(path, "xmind")

    assert preview["kind"] == "xmind"
    assert preview["format"] == "xml"
    assert preview["sheets"][0]["title"] == "Remote roadmap"
    assert preview["sheets"][0]["root"]["title"] == "Launch"
    assert preview["sheets"][0]["root"]["children"][0]["children"][0]["title"] == "User interviews"
    assert preview["summary"] == {"sheets": 1, "nodes": 4, "maxDepth": 2}


def test_xmind_preview_extracts_modern_json_and_detached_topics(tmp_path):
    path = tmp_path / "ideas.xmind"
    _write_archive(
        path,
        {
            "content.json": """[
              {
                "title": "Ideas",
                "rootTopic": {
                  "title": "Remote Vault",
                  "children": {
                    "attached": [{"title": "Web", "children": {"attached": [{"title": "Quick Look"}]}}],
                    "detached": [{"title": "Parking lot"}]
                  }
                }
              }
            ]""",
        },
    )

    preview = preview_document(path, ".xmind")

    assert preview["format"] == "json"
    assert [child["title"] for child in preview["sheets"][0]["root"]["children"]] == ["Web", "Parking lot"]
    assert preview["summary"] == {"sheets": 1, "nodes": 4, "maxDepth": 2}


def test_legacy_doc_preview_uses_available_bounded_extractor(tmp_path, monkeypatch):
    path = tmp_path / "legacy.doc"
    path.write_bytes(b"legacy word fixture")
    monkeypatch.setattr(document_preview.shutil, "which", lambda name: "/usr/bin/antiword" if name == "antiword" else None)
    monkeypatch.setattr(
        document_preview.subprocess,
        "run",
        lambda command, **kwargs: SimpleNamespace(
            returncode=0,
            stdout=b"Remote brief\n\nReview the mounted Vault from any browser.\nSecond paragraph.",
        ),
    )

    preview = preview_document(path, "doc")

    assert preview["kind"] == "doc"
    assert preview["extractor"] == "antiword"
    assert preview["blocks"][0] == {"type": "heading", "text": "Remote brief", "level": 1}
    assert preview["blocks"][1]["text"] == "Review the mounted Vault from any browser."
    assert preview["summary"]["blocks"] == 3


def test_legacy_doc_preview_reports_missing_server_extractor(tmp_path, monkeypatch):
    path = tmp_path / "legacy.doc"
    path.write_bytes(b"legacy word fixture")
    monkeypatch.setattr(document_preview.shutil, "which", lambda name: None)

    with pytest.raises(DocumentPreviewError) as exc:
        preview_document(path, "doc")

    assert exc.value.status_code == 501


def test_document_preview_api_returns_item_context(tmp_path, monkeypatch):
    path = tmp_path / "brief.docx"
    _write_archive(
        path,
        {
            "word/document.xml": """
                <w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
                  <w:body><w:p><w:r><w:t>Remote preview</w:t></w:r></w:p></w:body>
                </w:document>
            """,
        },
    )
    item = ItemInfo(id="office-one", name="Brief", ext="docx", folders=[], main_file_path=str(path))
    monkeypatch.setattr(items_api, "get_item", lambda item_id: item if item_id == item.id else None)

    result = items_api.api_item_document_preview(item.id)

    assert result["itemId"] == item.id
    assert result["name"] == "Brief"
    assert result["preview"]["blocks"][0]["text"] == "Remote preview"
