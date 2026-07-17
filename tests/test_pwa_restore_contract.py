import json
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


def read(path: str) -> str:
    return (ROOT / path).read_text(encoding="utf-8")


def test_static_shell_uses_one_asset_revision():
    index = read("app/web/index.html")
    service_worker = read("app/web/sw.js")
    for asset in ("styles.css", "core.js", "render.js", "api.js", "interactions.js", "bootstrap.js"):
        versioned = f"/static/{asset}?v=1.93"
        assert versioned in index
        assert versioned in service_worker
    assert "eagle-viewer-shell-v39" in service_worker


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
    for element_id in (
        "advancedPanel",
        "savedViewsBtn",
        "duplicatesBtn",
        "statsBtn",
        "commandBtn",
        "viewJustified",
    ):
        assert f'id="{element_id}"' in index
    assert 'id="viewJustified" title="自适应画廊" data-feature-removed' in index
    assert 'data-canvas-layout="justified" data-feature-removed' in index


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


def test_state_sync_contains_only_favorites_and_recently_viewed():
    state_store = read("app/state_store.py")
    api = read("app/web/api.js")
    assert '"favorite": []' in state_store
    assert '"recentViewed": []' in state_store
    for removed in ("savedViews", "ratings", "notes", "reviewMarkers", "workspaces"):
        assert f'"{removed}"' not in state_store
    assert "favorite: (state.collectionIds.favorite || []).slice()" in api
    assert "recentViewed: (state.collectionIds.recentViewed || []).slice()" in api


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
    assert names == ["全部素材", "搜索 Vault", "最近查看", "收藏"]


def test_theme_and_mobile_navigation_remain_available():
    index = read("app/web/index.html")
    interactions = read("app/web/interactions.js")
    assert 'id="themeToggle"' in index
    assert "setAttribute('data-theme', theme)" in interactions
    for element_id in ("mobileLibraryBtn", "mobileFavoriteBtn", "mobileSearchBtn", "mobileMoreBtn"):
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
    assert "密码保护文件夹及后代素材不进入索引" in checklist
    assert "全部文件、最近、收藏、文件夹、标签、搜索" in checklist
