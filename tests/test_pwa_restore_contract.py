import json
import re
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


def read(path: str) -> str:
    return (ROOT / path).read_text(encoding="utf-8")


def test_static_shell_uses_one_asset_revision():
    index = read("app/web/index.html")
    service_worker = read("app/web/sw.js")
    mobile = read("app/web/mobile.html")
    for asset in ("styles.css", "core.js", "render.js", "api.js", "interactions.js", "bootstrap.js"):
        versioned = f"/static/{asset}?v=1.105"
        assert versioned in index
        assert versioned in service_worker
    for asset in ("mobile.css", "mobile.js"):
        versioned = f"/static/{asset}?v=1.105"
        assert versioned in mobile
        assert versioned in service_worker
    assert "eagle-viewer-shell-v53" in service_worker


def test_mobile_shell_declares_its_favicon():
    mobile = read("app/web/mobile.html")

    assert '<link rel="icon" href="/static/icon.svg" type="image/svg+xml" />' in mobile


def test_mobile_shell_supports_shared_chinese_english_preference():
    mobile = read("app/web/mobile.html")
    script = read("app/web/mobile.js")

    for element_id in (
        "tabLibrary",
        "tabFolders",
        "tabSearch",
        "pvDownloadLabel",
        "pvSaveLabel",
    ):
        assert f'id="{element_id}"' in mobile
    assert "eagle-viewer-lang" in script
    assert "const COPY = {" in script
    assert "document.documentElement.lang =" in script
    assert "localStorage.setItem('eagle-viewer-lang', lang)" in script
    assert "applyLanguage();" in script


def test_service_worker_only_caches_the_app_shell():
    service_worker = read("app/web/sw.js")
    assert "url.pathname.startsWith('/api/')" in service_worker
    assert "THUMBNAIL_CACHE" not in service_worker
    assert "API_CACHE" not in service_worker
    assert "OFFLINE_SNAPSHOT" not in service_worker
    assert "SKIP_WAITING" in service_worker


def test_navigation_exposes_only_basic_product_surfaces():
    index = read("app/web/index.html")
    styles = read("app/web/styles.css")
    assert "[data-feature-removed]" in styles
    # Advanced/collection surfaces have been fully removed from the shell.
    for element_id in (
        "advancedPanel",
        "savedViewsPanel",
        "statsPanel",
        "commandOverlay",
        "savedViewsBtn",
        "duplicatesBtn",
        "statsBtn",
        "commandBtn",
        "viewJustified",
        "filterPanelBtn",
        "exportListBtn",
        "sidebarSavedViews",
        "nativeSmartFolderSection",
        "sidebarDuplicates",
        "sidebarColors",
        "sidebarRandom",
        "batchCompareBtn",
        "batchCopyInfoBtn",
        "batchCopyRefsBtn",
        "exportSelectedBtn",
        "mobileContinueRail",
    ):
        assert f'id="{element_id}"' not in index
    # Basic product surfaces must remain.
    for element_id in (
        "viewGrid",
        "viewList",
        "allItems",
        "searchInput",
        "themeSwitcher",
    ):
        assert f'id="{element_id}"' in index


def test_layout_preferences_are_limited_to_grid_and_list():
    api = read("app/web/api.js")
    interactions = read("app/web/interactions.js")
    assert "stored === 'list' ? 'list' : 'grid'" in api
    assert "['grid', 'list'].indexOf(mode)" in interactions


def test_search_is_plain_keyword_search():
    index = read("app/web/index.html")
    api = read("app/web/api.js")
    interactions = read("app/web/interactions.js")
    assert 'placeholder="搜索名称、标签或备注"' in index
    assert "搜索名称、标签或备注" in interactions
    assert "q.charAt(0) === '#'" not in interactions
    assert "q.charAt(0) === '/'" not in interactions
    assert "'/api/search?q=' + encodeURIComponent(query)" in api


def test_preview_surface_is_limited_to_browser_native_formats():
    core = read("app/web/core.js")
    render = read("app/web/render.js")
    items_api = read("app/api/items.py")
    assert "PREVIEW_IMAGE_EXTS" in core
    assert "PREVIEW_VIDEO_EXTS" in core
    assert "PREVIEW_AUDIO_EXTS" in core
    assert "PREVIEW_DOCUMENT_EXTS" in core
    assert "PREVIEW_FONT_EXTS" not in core
    assert "PREVIEW_STRUCTURED_EXTS" not in core
    assert "document-preview" not in items_api
    assert "addVideoPreviewTools(overlay, el)" not in render
    assert "addPreviewSlideshowControls(sequence, overlay" not in render
    assert "addPreviewFilmstrip(overlay, item" not in render


def test_image_preview_toolbar_is_basic():
    render = read("app/web/render.js")
    simplified = render.split("// Keep the remote preview deliberately small", 1)[1]
    simplified = simplified.split("async function previewItem", 1)[0]
    assert 'data-preview-tool="zoom-out"' in simplified
    assert 'data-preview-tool="fit"' in simplified
    assert 'data-preview-tool="zoom-in"' in simplified
    assert 'data-preview-tool="rotate"' not in simplified
    assert 'data-preview-tool="flip"' not in simplified


def test_removed_viewer_state_contract_is_absent():
    api = read("app/web/api.js")
    main = read("app/main.py")
    readme = read("README.md")
    readme_zh = read("README.zh.md")

    assert "state.collectionIds" not in api
    assert "fetchViewerState" not in api
    assert "saveViewerState" not in api
    assert "/api/state" not in main
    assert "/api/state" not in readme
    assert "/api/state" not in readme_zh


def test_removed_backend_endpoints_are_not_registered():
    folders_api = read("app/api/folders.py")
    items_api = read("app/api/items.py")
    for route in ("smart-folders", "library/stats", "duplicates", "palettes", "random"):
        assert route not in folders_api
    assert "/similar" not in items_api
    assert "/document-preview" not in items_api


def test_manifest_keeps_only_basic_shortcuts():
    manifest = json.loads(read("app/web/manifest.json"))
    names = [shortcut["name"] for shortcut in manifest.get("shortcuts", [])]
    assert names == ["全部素材", "搜索 Vault"]


def test_theme_and_mobile_navigation_remain_available():
    index = read("app/web/index.html")
    interactions = read("app/web/interactions.js")
    # 右上角三主题切换器（Gallery / Workbench / Carbon）
    assert 'id="themeSwitcher"' in index
    assert 'class="theme-switcher"' in index
    for name in ("gallery", "workbench", "carbon"):
        assert f'data-theme-name="{name}"' in index
    # 主题切换仍写入 data-theme / data-accent
    assert "setAttribute('data-theme'" in interactions
    assert "setAttribute('data-accent'" in interactions
    for element_id in ("mobileLibraryBtn", "mobileSearchBtn", "mobileMoreBtn"):
        assert f'id="{element_id}"' in index


def test_iphone_layout_uses_dynamic_viewport_and_balanced_safe_areas():
    index = read("app/web/index.html")
    styles = read("app/web/styles.css")
    assert "viewport-fit=cover, interactive-widget=resizes-content" in index
    assert "height:100dvh" in styles
    assert "--mobile-home-gap:max(8px,calc(env(safe-area-inset-bottom,0px) - 18px))" in styles
    assert "height:calc(64px + env(safe-area-inset-top,0px))" in styles
    assert "height:var(--mobile-tab-height)" in styles
    assert "padding-bottom:20px" in styles


def test_protected_folder_boundary_is_documented():
    checklist = read("docs/regression-checklist.md")
    assert "Password-protected folders and their descendants are excluded from indexing" in checklist
    assert "All Items, Recent Additions, Folders, Tags, and Search views switch correctly" in checklist


def test_accent_tokens_are_not_self_referential():
    # Regression guard: a sweep that rewrote hardcoded blues into var(--accent)
    # produced `--accent:var(--accent)` cyclic references, which CSS resolves to
    # a guaranteed-invalid value and blanks the global accent across the whole app.
    styles = read("app/web/styles.css")
    pattern = re.compile(
        r"^\s*(--accent(?:-text)?)\s*:\s*var\(\1\)\s*;",
        re.MULTILINE,
    )
    self_ref = [m.group(0).strip() for m in pattern.finditer(styles)]
    assert self_ref == [], f"accent self-references found: {self_ref}"


def test_accent_tokens_resolve_to_concrete_values():
    # The accent token must never be left blank (`--accent:;`), which would blank
    # the global accent. Concrete colors and references to *other* tokens are fine.
    styles = read("app/web/styles.css")
    bad = []
    for m in re.finditer(r"(--accent(?:-text)?)\s*:\s*([^;]+);", styles):
        value = m.group(2).strip()
        if value == "":
            bad.append(m.group(0).strip())
    assert bad == [], f"blank accent token definitions: {bad}"
