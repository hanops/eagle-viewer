import json
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


def test_standalone_route_restore_has_stale_guard():
    core = (ROOT / "app" / "web" / "core.js").read_text(encoding="utf-8")

    assert "var LAST_ROUTE_MAX_AGE_MS = 14 * 24 * 60 * 60 * 1000;" in core
    assert "Date.now() - savedAt > LAST_ROUTE_MAX_AGE_MS" in core
    assert "localStorage.removeItem(LAST_ROUTE_STORAGE_KEY)" in core
    assert "reason: 'stale'" in core


def test_bootstrap_explains_stale_standalone_restore():
    bootstrap = (ROOT / "app" / "web" / "bootstrap.js").read_text(encoding="utf-8")

    assert "standaloneRouteRestore.restored" in bootstrap
    assert "standaloneRouteRestore.reason === 'stale'" in bootstrap
    assert "上次位置已过期，已打开资料库" in bootstrap


def test_view_navigation_uses_app_history_without_polluting_it_with_details():
    core = (ROOT / "app" / "web" / "core.js").read_text(encoding="utf-8")
    render = (ROOT / "app" / "web" / "render.js").read_text(encoding="utf-8")
    interactions = (ROOT / "app" / "web" / "interactions.js").read_text(encoding="utf-8")
    styles = (ROOT / "app" / "web" / "styles.css").read_text(encoding="utf-8")
    checklist = (ROOT / "docs" / "regression-checklist.md").read_text(encoding="utf-8")

    assert "function getRouteHistoryIdentity(params)" in core
    assert "history.pushState(nextHistoryState" in core
    assert "history.replaceState(nextHistoryState" in core
    assert "identity.push(params.get('item')" not in core
    assert "function canNavigateBackInApp()" in core
    assert "function navigateBackInApp()" in core
    assert "suspendRouteHistory();" in interactions
    assert "resumeRouteHistory();" in interactions
    assert "state.inspectorItem.id !== state.pendingItemId" in interactions
    assert 'data-mobile-workbar-action="back"' in render
    assert "navigateBackInApp();" in interactions
    assert ".mobile-workbar-back" in styles
    assert "Mobile app surfaces override the desktop-hidden defaults above." in styles
    assert "iPhone 边缘返回 / 浏览器返回" in checklist


def test_remote_status_refreshes_open_preview_download_actions():
    render = (ROOT / "app" / "web" / "render.js").read_text(encoding="utf-8")
    interactions = (ROOT / "app" / "web" / "interactions.js").read_text(encoding="utf-8")
    checklist = (ROOT / "docs" / "regression-checklist.md").read_text(encoding="utf-8")

    assert "function refreshOpenPreviewMobileActions()" in render
    assert "refreshOpenPreviewMobileActions: refreshOpenPreviewMobileActions" in render
    assert "render.refreshOpenPreviewMobileActions" in interactions
    assert "已打开的全屏预览底栏" in checklist


def test_mobile_continue_surface_keeps_app_home_contract():
    render = (ROOT / "app" / "web" / "render.js").read_text(encoding="utf-8")
    styles = (ROOT / "app" / "web" / "styles.css").read_text(encoding="utf-8")
    checklist = (ROOT / "docs" / "regression-checklist.md").read_text(encoding="utf-8")

    assert "mobile-continue-hero" in render
    assert "mobile-continue-status" in render
    assert "data-mobile-continue-action=\"preview-last\"" in render
    assert "filtersLabel" in render
    assert ".mobile-continue-hero" in styles
    assert ".mobile-continue-status" in styles
    assert "类似 App Home 的“继续工作”卡片" in checklist


def test_mobile_asset_cards_keep_app_like_visual_contract():
    render = (ROOT / "app" / "web" / "render.js").read_text(encoding="utf-8")
    styles = (ROOT / "app" / "web" / "styles.css").read_text(encoding="utf-8")
    checklist = (ROOT / "docs" / "regression-checklist.md").read_text(encoding="utf-8")

    assert "card.dataset.mediaKind = getViewMediaKind(item)" in render
    assert ".card[data-media-kind=\"video\"]" in styles
    assert ".card-thumb::before" in styles
    assert ".card.long-press-active .card-thumb" in styles
    assert "app-like 胶片卡质感" in checklist


def test_mobile_preview_surface_keeps_app_like_visual_contract():
    styles = (ROOT / "app" / "web" / "styles.css").read_text(encoding="utf-8")
    checklist = (ROOT / "docs" / "regression-checklist.md").read_text(encoding="utf-8")

    assert ".preview-overlay::before" in styles
    assert ".preview-overlay::after" in styles
    assert "z-index:14" in styles
    assert "preview-mobile-actions button.review-next" in styles
    assert ".preview-filmstrip-item.active" in styles
    assert "浮动 tab bar 质感" in checklist
    assert "可横滑素材轨" in checklist


def test_media_preview_keeps_eagle_like_read_only_transform_controls():
    render = (ROOT / "app" / "web" / "render.js").read_text(encoding="utf-8")
    styles = (ROOT / "app" / "web" / "styles.css").read_text(encoding="utf-8")
    checklist = (ROOT / "docs" / "regression-checklist.md").read_text(encoding="utf-8")

    assert "function addVideoPreviewTools(overlay, video)" in render
    assert 'data-preview-tool="flip"' in render
    assert 'data-preview-tool="rotate"' in render
    assert 'data-preview-tool="rate"' in render
    assert 'data-preview-tool="loop"' in render
    assert "video.playbackRate = rates[rateIndex]" in render
    assert "video.loop = !video.loop" in render
    assert "function setPreviewContentBaseTransform(content, transform)" in render
    assert "restorePreviewContentBaseTransform(content)" in render
    assert ".preview-tools button.active" in styles
    assert "退出预览后不写回素材" in checklist


def test_remote_vault_change_monitor_is_non_blocking_and_user_controlled():
    api = (ROOT / "app" / "web" / "api.js").read_text(encoding="utf-8")
    bootstrap = (ROOT / "app" / "web" / "bootstrap.js").read_text(encoding="utf-8")
    interactions = (ROOT / "app" / "web" / "interactions.js").read_text(encoding="utf-8")
    styles = (ROOT / "app" / "web" / "styles.css").read_text(encoding="utf-8")
    checklist = (ROOT / "docs" / "regression-checklist.md").read_text(encoding="utf-8")

    assert "async function fetchLibraryStatus(deep)" in api
    assert "eagle-viewer-library-reloaded" in api
    assert "interactions.setupLibraryChangeMonitor();" in bootstrap
    assert "function setupLibraryChangeMonitor()" in interactions
    assert "45 * 1000" in interactions
    assert "5 * 60 * 1000" in interactions
    assert "updateRemoteStatusStrip('changed', '远程 Vault 有新内容')" in interactions
    assert "applyDetectedLibraryUpdate()" in interactions
    assert '.remote-status-strip[data-state="changed"]' in styles
    assert "检测到更新时不自动打断" in checklist


def test_mobile_original_file_share_uses_system_share_with_safe_fallbacks():
    render = (ROOT / "app" / "web" / "render.js").read_text(encoding="utf-8")
    interactions = (ROOT / "app" / "web" / "interactions.js").read_text(encoding="utf-8")
    checklist = (ROOT / "docs" / "regression-checklist.md").read_text(encoding="utf-8")

    assert "async function shareItemFile(item, button)" in interactions
    assert "64 * 1024 * 1024" in interactions
    assert "navigator.canShare({ files: [file] })" in interactions
    assert "navigator.share({ files: [file]" in interactions
    assert "new File([blob], buildItemDownloadName(item)" in interactions
    assert "err.name === 'AbortError'" in interactions
    assert "action === 'share-file'" in interactions
    assert 'data-quick-action="share-file"' in interactions
    assert 'data-context-action="share-file"' in interactions
    assert 'class="btn-share-file' in render
    assert 'data-preview-more-action="share-file"' in render
    assert "64 MB 内原文件" in checklist


def test_preview_remote_degradation_notice_contract():
    render = (ROOT / "app" / "web" / "render.js").read_text(encoding="utf-8")
    styles = (ROOT / "app" / "web" / "styles.css").read_text(encoding="utf-8")
    checklist = (ROOT / "docs" / "regression-checklist.md").read_text(encoding="utf-8")

    assert "function refreshPreviewRemoteNotice" in render
    assert "preview-remote-notice" in render
    assert "data-preview-remote-action=\"reconnect\"" in render
    assert "data-preview-remote-action=\"snapshot\"" in render
    assert "refreshPreviewRemoteNotice(overlay)" in render
    assert ".preview-remote-notice" in styles
    assert ".preview-remote-dot" in styles
    assert "远程降级提示卡" in checklist


def test_mobile_batch_output_declares_remote_capabilities():
    index = (ROOT / "app" / "web" / "index.html").read_text(encoding="utf-8")
    interactions = (ROOT / "app" / "web" / "interactions.js").read_text(encoding="utf-8")
    styles = (ROOT / "app" / "web" / "styles.css").read_text(encoding="utf-8")
    checklist = (ROOT / "docs" / "regression-checklist.md").read_text(encoding="utf-8")

    assert "id=\"batchOutputStatus\"" in index
    assert "id=\"batchOutputStatusTitle\"" in index
    assert "id=\"batchOutputStatusMeta\"" in index
    assert "status.dataset.state = offline ? 'offline' : 'online'" in interactions
    assert "复制链接、信息、Markdown、CSV 和 JSON 仍可用" in interactions
    assert ".batch-output-status[data-state=\"offline\"]" in styles
    assert "输出能力卡" in checklist


def test_offline_snapshot_event_refreshes_mobile_surfaces():
    interactions = (ROOT / "app" / "web" / "interactions.js").read_text(encoding="utf-8")
    styles = (ROOT / "app" / "web" / "styles.css").read_text(encoding="utf-8")
    checklist = (ROOT / "docs" / "regression-checklist.md").read_text(encoding="utf-8")

    assert "function flashBatchOutputSnapshotState" in interactions
    assert "status.dataset.state = 'saved'" in interactions
    assert "flashBatchOutputSnapshotState(event.detail || {})" in interactions
    assert "render.refreshOpenPreviewMobileActions" in interactions
    assert ".batch-output-status[data-state=\"saved\"]" in styles
    assert "离线快照已更新" in checklist


def test_advanced_filter_panel_has_rule_summary_contract():
    index = (ROOT / "app" / "web" / "index.html").read_text(encoding="utf-8")
    interactions = (ROOT / "app" / "web" / "interactions.js").read_text(encoding="utf-8")
    styles = (ROOT / "app" / "web" / "styles.css").read_text(encoding="utf-8")
    checklist = (ROOT / "docs" / "regression-checklist.md").read_text(encoding="utf-8")

    assert "id=\"advancedFilterSummary\"" in index
    assert "function renderAdvancedFilterSummary" in interactions
    assert "renderAdvancedFilterSummary(readFiltersFromForm(), true)" in interactions
    assert "renderAdvancedFilterSummary(f, false)" in interactions
    assert ".filter-rule-summary[data-state=\"pending\"]" in styles
    assert "待应用规则" in checklist


def test_color_atlas_has_desktop_mobile_and_filter_contract():
    index = (ROOT / "app" / "web" / "index.html").read_text(encoding="utf-8")
    api = (ROOT / "app" / "web" / "api.js").read_text(encoding="utf-8")
    render = (ROOT / "app" / "web" / "render.js").read_text(encoding="utf-8")
    interactions = (ROOT / "app" / "web" / "interactions.js").read_text(encoding="utf-8")
    styles = (ROOT / "app" / "web" / "styles.css").read_text(encoding="utf-8")
    checklist = (ROOT / "docs" / "regression-checklist.md").read_text(encoding="utf-8")

    assert 'id="sidebarColors"' in index
    assert 'data-mobile-more-action="colors"' in index
    assert "async function loadColorAtlas()" in api
    assert "'/api/palettes?limit=36'" in api
    assert "function renderColorAtlas(data)" in render
    assert "data-atlas-color" in render
    assert "openPaletteColorView: openPaletteColorView" in interactions
    assert ".color-atlas-ribbon" in styles
    assert ".color-atlas-grid" in styles
    assert "iPhone“更多 → 全库色谱”" in checklist


def test_random_walk_has_reproducible_desktop_mobile_and_offline_contract():
    index = (ROOT / "app" / "web" / "index.html").read_text(encoding="utf-8")
    core = (ROOT / "app" / "web" / "core.js").read_text(encoding="utf-8")
    api = (ROOT / "app" / "web" / "api.js").read_text(encoding="utf-8")
    render = (ROOT / "app" / "web" / "render.js").read_text(encoding="utf-8")
    interactions = (ROOT / "app" / "web" / "interactions.js").read_text(encoding="utf-8")
    styles = (ROOT / "app" / "web" / "styles.css").read_text(encoding="utf-8")
    service_worker = (ROOT / "app" / "web" / "sw.js").read_text(encoding="utf-8")
    checklist = (ROOT / "docs" / "regression-checklist.md").read_text(encoding="utf-8")

    assert 'id="sidebarRandom"' in index
    assert 'data-mobile-more-action="random"' in index
    assert "currentRandomSeed" in core
    assert "params.set('seed', currentRandomSeed)" in core
    assert "async function loadRandomWalk(seed, reshuffle)" in api
    assert "'/api/random?seed='" in api
    assert "function renderRandomWalk(data)" in render
    assert "scroll-snap-type: x mandatory" in styles
    assert "api.loadRandomWalk('', true)" in interactions
    assert "url.pathname === '/api/random'" in service_worker
    assert "iPhone“更多 → 随机漫游”" in checklist


def test_adaptive_gallery_layout_is_available_on_desktop_and_mobile():
    index = (ROOT / "app" / "web" / "index.html").read_text(encoding="utf-8")
    api = (ROOT / "app" / "web" / "api.js").read_text(encoding="utf-8")
    render = (ROOT / "app" / "web" / "render.js").read_text(encoding="utf-8")
    interactions = (ROOT / "app" / "web" / "interactions.js").read_text(encoding="utf-8")
    styles = (ROOT / "app" / "web" / "styles.css").read_text(encoding="utf-8")
    checklist = (ROOT / "docs" / "regression-checklist.md").read_text(encoding="utf-8")

    assert 'id="viewJustified"' in index
    assert 'data-mobile-view="justified"' in index
    assert "stored === 'justified'" in api
    assert "function applyJustifiedLayout(gallery)" in render
    assert "getJustifiedTargetHeight()" in render
    assert "state.viewMode === 'justified'" in render
    assert "['grid', 'justified', 'list']" in interactions
    assert ".justified-gallery" in styles
    assert "iPhone 搜索面板选择“自适应”" in checklist


def test_canvas_display_settings_are_per_device_and_mobile_accessible():
    index = (ROOT / "app" / "web" / "index.html").read_text(encoding="utf-8")
    interactions = (ROOT / "app" / "web" / "interactions.js").read_text(encoding="utf-8")
    styles = (ROOT / "app" / "web" / "styles.css").read_text(encoding="utf-8")
    checklist = (ROOT / "docs" / "regression-checklist.md").read_text(encoding="utf-8")

    assert 'id="canvasSettingsPanel"' in index
    assert 'id="layoutSettingsBtn"' in index
    assert 'data-mobile-more-action="canvas"' in index
    assert 'data-canvas-fit="contain"' in index
    assert 'data-canvas-pref="markers"' in index
    assert "'eagle-viewer-canvas-prefs-' + getCanvasDevice()" in interactions
    assert "'eagle-viewer-grid-density-' + getCanvasDevice()" in interactions
    assert "function applyCanvasPrefs" in interactions
    assert "body.canvas-fit-contain .card-thumb img" in styles
    assert "body.canvas-hide-markers .collection-markers" in styles
    assert "更多 → 画布设置" in checklist


def test_native_eagle_smart_folders_are_available_across_web_and_iphone():
    index = (ROOT / "app" / "web" / "index.html").read_text(encoding="utf-8")
    core = (ROOT / "app" / "web" / "core.js").read_text(encoding="utf-8")
    api = (ROOT / "app" / "web" / "api.js").read_text(encoding="utf-8")
    render = (ROOT / "app" / "web" / "render.js").read_text(encoding="utf-8")
    interactions = (ROOT / "app" / "web" / "interactions.js").read_text(encoding="utf-8")
    service_worker = (ROOT / "app" / "web" / "sw.js").read_text(encoding="utf-8")
    checklist = (ROOT / "docs" / "regression-checklist.md").read_text(encoding="utf-8")

    assert 'id="nativeSmartFolderSection"' in index
    assert 'data-mobile-more-action="eagle-smart"' in index
    assert "currentEagleSmartFolderId" in core
    assert "params.set('eagleSmart', currentEagleSmartFolderId)" in core
    assert "async function fetchEagleSmartFolders" in api
    assert "async function loadEagleSmartFolderItems" in api
    assert "function renderEagleSmartFolders" in render
    assert "getEagleSmartFolderQuickItems" in interactions
    assert "url.pathname === '/api/smart-folders'" in service_worker
    assert "更多 → Eagle 智能文件夹" in checklist


def test_saved_view_cards_show_rule_pills_contract():
    interactions = (ROOT / "app" / "web" / "interactions.js").read_text(encoding="utf-8")
    styles = (ROOT / "app" / "web" / "styles.css").read_text(encoding="utf-8")
    checklist = (ROOT / "docs" / "regression-checklist.md").read_text(encoding="utf-8")

    assert "function renderSavedViewRulePills" in interactions
    assert "saved-view-rule-pills" in interactions
    assert "{ label: '范围'" in interactions
    assert "{ label: '排序'" in interactions
    assert ".saved-view-rule-pill" in styles
    assert "规则 chips" in checklist


def test_pwa_shortcuts_open_mobile_search_and_recent_workflows():
    manifest = (ROOT / "app" / "web" / "manifest.json").read_text(encoding="utf-8")
    interactions = (ROOT / "app" / "web" / "interactions.js").read_text(encoding="utf-8")
    checklist = (ROOT / "docs" / "regression-checklist.md").read_text(encoding="utf-8")

    assert '"name": "搜索 Vault"' in manifest
    assert '"url": "/#view=all&action=search"' in manifest
    assert '"name": "最近查看"' in manifest
    assert '"url": "/#view=collection&collection=recentViewed&action=recent"' in manifest
    assert "action === 'search'" in interactions
    assert "window._openMobileSearchSheet()" in interactions
    assert "action === 'recent'" in interactions
    assert "showCollection('recentViewed')" in interactions
    assert "搜索 Vault、最近查看" in checklist


def test_ios_home_screen_shell_uses_stable_identity_and_png_icons():
    index = (ROOT / "app" / "web" / "index.html").read_text(encoding="utf-8")
    manifest = json.loads((ROOT / "app" / "web" / "manifest.json").read_text(encoding="utf-8"))
    service_worker = (ROOT / "app" / "web" / "sw.js").read_text(encoding="utf-8")
    checklist = (ROOT / "docs" / "regression-checklist.md").read_text(encoding="utf-8")

    assert 'rel="apple-touch-icon" sizes="180x180" href="/static/apple-touch-icon.png"' in index
    assert manifest["id"] == "/"
    assert manifest["scope"] == "/"
    assert manifest["display"] == "standalone"
    assert manifest["display_override"][0] == "standalone"
    assert {(icon["src"], icon["sizes"], icon["type"]) for icon in manifest["icons"]} == {
        ("/static/icon-192.png", "192x192", "image/png"),
        ("/static/icon-512.png", "512x512", "image/png"),
    }
    assert (ROOT / "app" / "web" / "apple-touch-icon.png").read_bytes().startswith(b"\x89PNG\r\n\x1a\n")
    assert (ROOT / "app" / "web" / "icon-192.png").read_bytes().startswith(b"\x89PNG\r\n\x1a\n")
    assert (ROOT / "app" / "web" / "icon-512.png").read_bytes().startswith(b"\x89PNG\r\n\x1a\n")
    assert "'/static/apple-touch-icon.png'" in service_worker
    assert "'/static/icon-192.png'" in service_worker
    assert "'/static/icon-512.png'" in service_worker
    assert "180 / 192 / 512 PNG" in checklist


def test_pwa_update_waits_for_user_and_restores_through_reload():
    index = (ROOT / "app" / "web" / "index.html").read_text(encoding="utf-8")
    bootstrap = (ROOT / "app" / "web" / "bootstrap.js").read_text(encoding="utf-8")
    service_worker = (ROOT / "app" / "web" / "sw.js").read_text(encoding="utf-8")
    styles = (ROOT / "app" / "web" / "styles.css").read_text(encoding="utf-8")
    checklist = (ROOT / "docs" / "regression-checklist.md").read_text(encoding="utf-8")

    assert 'id="pwaUpdateCard"' in index
    assert 'id="pwaUpdateLater"' in index
    assert 'id="pwaUpdateApply"' in index
    assert "function registerPwaServiceWorker()" in bootstrap
    assert "if (pwaRegistrationStarted) return" in bootstrap
    assert "registration.waiting" in bootstrap
    assert "worker.state === 'installed'" in bootstrap
    assert "waiting.postMessage({ type: 'SKIP_WAITING' })" in bootstrap
    assert "navigator.serviceWorker.addEventListener('controllerchange'" in bootstrap
    assert "var hadController = !!navigator.serviceWorker.controller" in bootstrap
    assert "if (!hadController)" in bootstrap
    assert "15 * 60 * 1000" in bootstrap
    assert "self.addEventListener('message'" in service_worker
    assert "e.data.type === 'SKIP_WAITING'" in service_worker
    assert "then(function() { return self.skipWaiting(); })" in service_worker
    assert ".pwa-update-card" in styles
    assert "z-index:931" in styles
    assert "z-index:935" in styles
    assert "新版本已准备好" in checklist
    assert "更新卡片不能遮挡" in checklist


def test_pwa_shell_uses_one_atomic_asset_revision():
    index = (ROOT / "app" / "web" / "index.html").read_text(encoding="utf-8")
    service_worker = (ROOT / "app" / "web" / "sw.js").read_text(encoding="utf-8")

    for asset in ("styles.css", "core.js", "render.js", "api.js", "interactions.js", "bootstrap.js"):
        path = f"/static/{asset}?v=1.86"
        assert path in index
        assert f"'{path}'" in service_worker
    assert "const CACHE_NAME = 'eagle-viewer-shell-v32';" in service_worker


def test_inspector_similarity_uses_local_ranked_metadata():
    api = (ROOT / "app" / "web" / "api.js").read_text(encoding="utf-8")
    render = (ROOT / "app" / "web" / "render.js").read_text(encoding="utf-8")
    styles = (ROOT / "app" / "web" / "styles.css").read_text(encoding="utf-8")

    assert "function fetchSimilarItems(itemId, limit)" in api
    assert "/similar?limit=" in api
    assert "function loadInspectorSimilarItems(item)" in render
    assert "similaritySignals" in render
    assert "仅分析只读索引元数据" in render
    assert ".inspector-similar-track" in styles
    assert "scroll-snap-type:x proximity" in styles


def test_multi_image_compare_bench_is_available_on_desktop_and_mobile():
    index = (ROOT / "app" / "web" / "index.html").read_text(encoding="utf-8")
    render = (ROOT / "app" / "web" / "render.js").read_text(encoding="utf-8")
    interactions = (ROOT / "app" / "web" / "interactions.js").read_text(encoding="utf-8")
    styles = (ROOT / "app" / "web" / "styles.css").read_text(encoding="utf-8")

    assert 'id="batchCompareBtn"' in index
    assert "function openCompare(items)" in render
    assert "getCompareImageItems(items)" in render
    assert 'data-compare-action="sync"' in render
    assert "render.openCompare(getSelectedItems())" in interactions
    assert ".compare-grid.compare-count-4" in styles
    assert "scroll-snap-type:x mandatory" in styles


def test_viewer_state_changes_queue_offline_and_merge_on_reconnect():
    interactions = (ROOT / "app" / "web" / "interactions.js").read_text(encoding="utf-8")
    styles = (ROOT / "app" / "web" / "styles.css").read_text(encoding="utf-8")
    checklist = (ROOT / "docs" / "regression-checklist.md").read_text(encoding="utf-8")

    assert "VIEWER_STATE_BASELINE_KEY" in interactions
    assert "VIEWER_STATE_PENDING_KEY" in interactions
    assert "function mergePendingViewerState(remoteState, localState, baselineState)" in interactions
    assert "persistPendingViewerState();" in interactions
    assert "window.addEventListener('online', flushPendingViewerState)" in interactions
    assert "flushPendingViewerState();" in interactions
    assert "setSyncStatus('pending', '待同步')" in interactions
    assert "updateMobileRemoteCard(remoteCard.dataset.state || 'checking'" in interactions
    assert '.sync-status[data-state="pending"]' in styles
    assert "三方合并" in checklist


def test_viewer_ratings_are_synced_rendered_and_filterable():
    index = (ROOT / "app" / "web" / "index.html").read_text(encoding="utf-8")
    core = (ROOT / "app" / "web" / "core.js").read_text(encoding="utf-8")
    api = (ROOT / "app" / "web" / "api.js").read_text(encoding="utf-8")
    render = (ROOT / "app" / "web" / "render.js").read_text(encoding="utf-8")
    interactions = (ROOT / "app" / "web" / "interactions.js").read_text(encoding="utf-8")

    assert 'id="filterRatingMin"' in index
    assert "var itemRatings = {};" in core
    assert "ratings: state.itemRatings" in api
    assert "filters.rating_min" in api
    assert "function renderItemRatingControl(item, extraClass)" in render
    assert 'data-item-rating="' in render
    assert "function setItemRating(item, value)" in interactions
    assert "eagle-viewer-ratings" in interactions


def test_viewer_workspaces_are_synced_and_available_across_surfaces():
    index = (ROOT / "app" / "web" / "index.html").read_text(encoding="utf-8")
    api = (ROOT / "app" / "web" / "api.js").read_text(encoding="utf-8")
    interactions = (ROOT / "app" / "web" / "interactions.js").read_text(encoding="utf-8")
    render = (ROOT / "app" / "web" / "render.js").read_text(encoding="utf-8")

    assert 'id="workspacesPanel"' in index
    assert 'id="workspaceSidebarList"' in index
    assert 'id="batchWorkspaceBtn"' in index
    assert 'data-mobile-more-action="workspaces"' in index
    assert "workspaces: state.workspaces" in api
    assert "function createWorkspace(name, color)" in interactions
    assert "function toggleWorkspaceItems(workspaceId, itemIds)" in interactions
    assert "eagle-viewer-workspaces" in interactions
    assert "action === 'workspace'" in interactions
    assert "collection-marker workspace" in render


def test_review_markers_are_synced_searchable_and_rendered():
    api = (ROOT / "app" / "web" / "api.js").read_text(encoding="utf-8")
    core = (ROOT / "app" / "web" / "core.js").read_text(encoding="utf-8")
    render = (ROOT / "app" / "web" / "render.js").read_text(encoding="utf-8")
    interactions = (ROOT / "app" / "web" / "interactions.js").read_text(encoding="utf-8")
    styles = (ROOT / "app" / "web" / "styles.css").read_text(encoding="utf-8")
    checklist = (ROOT / "docs" / "regression-checklist.md").read_text(encoding="utf-8")

    assert "reviewMarkers: state.reviewMarkers" in api
    assert "state.reviewMarkers || {}" in api
    assert "reviewMarkers" in core
    assert "function renderInspectorReviewMarkers(item)" in render
    assert "function renderInspectorReviewMarkerOverlay(item)" in render
    assert "function commitPointReviewMarker(item, event, preview)" in interactions
    assert "mergeReviewMarkers(remote.reviewMarkers, local.reviewMarkers, baseline.reviewMarkers)" in interactions
    assert "eagle-viewer-review-markers" in interactions
    assert ".review-marker-overlay" in styles
    assert "点选图片内容后生成带编号的点位" in checklist


def test_viewer_notes_are_editable_synced_searchable_and_filterable():
    index = (ROOT / "app" / "web" / "index.html").read_text(encoding="utf-8")
    api = (ROOT / "app" / "web" / "api.js").read_text(encoding="utf-8")
    interactions = (ROOT / "app" / "web" / "interactions.js").read_text(encoding="utf-8")
    render = (ROOT / "app" / "web" / "render.js").read_text(encoding="utf-8")

    assert 'id="filterViewerNoteState"' in index
    assert "notes: state.viewerNotes" in api
    assert "filters.viewer_note_state" in api
    assert "key === 'viewer_note_state'" in (ROOT / "app" / "web" / "core.js").read_text(encoding="utf-8")
    assert "Object.keys(state.viewerNotes || {}).filter" in api
    assert "function commitViewerNote(editor)" in interactions
    assert "eagle-viewer-notes" in interactions
    assert "viewer-note-editor" in render
    assert "collection-marker note" in render


def test_mobile_offline_snapshot_storage_can_be_inspected_and_cleared():
    index = (ROOT / "app" / "web" / "index.html").read_text(encoding="utf-8")
    api = (ROOT / "app" / "web" / "api.js").read_text(encoding="utf-8")
    interactions = (ROOT / "app" / "web" / "interactions.js").read_text(encoding="utf-8")
    service_worker = (ROOT / "app" / "web" / "sw.js").read_text(encoding="utf-8")
    checklist = (ROOT / "docs" / "regression-checklist.md").read_text(encoding="utf-8")

    assert 'id="mobileOfflineStorage"' in index
    assert 'id="mobileOfflineStorageUsage"' in index
    assert 'id="mobileOfflineViewList"' in index
    assert 'data-mobile-more-action="clear-offline-snapshot"' in index
    assert "function clearOfflineSnapshot()" in api
    assert "new MessageChannel()" in api
    assert "localStorage.removeItem(OFFLINE_SNAPSHOT_META_KEY)" in api
    assert "OFFLINE_SNAPSHOT_CATALOG_LIMIT = 8" in api
    assert "saveOfflineSnapshotRecord(record)" in api
    assert "localStorage.removeItem(OFFLINE_SNAPSHOT_CATALOG_KEY)" in api
    assert "eagle-viewer-offline-snapshot-cleared" in api
    assert "navigator.storage.estimate()" in interactions
    assert "window.confirm('清除当前离线索引与缩略图？" in interactions
    assert "api.clearOfflineSnapshot()" in interactions
    assert "function openOfflineSnapshotRoute(route)" in interactions
    assert "data-mobile-offline-route" in interactions
    assert "e.data.type === 'CLEAR_OFFLINE_SNAPSHOT'" in service_worker
    assert "caches.delete(THUMBNAIL_CACHE)" in service_worker
    assert "caches.delete(API_CACHE)" in service_worker
    assert "caches.delete(CACHE_NAME)" not in service_worker
    assert "离线数据管理卡" in checklist
    assert "离线视图库" in checklist


def test_mobile_card_selection_uses_app_like_control():
    render = (ROOT / "app" / "web" / "render.js").read_text(encoding="utf-8")
    styles = (ROOT / "app" / "web" / "styles.css").read_text(encoding="utf-8")
    checklist = (ROOT / "docs" / "regression-checklist.md").read_text(encoding="utf-8")

    assert "cb.setAttribute('aria-label', '选择 ' + (item.name || '素材'))" in render
    assert "-webkit-appearance:none" in styles
    assert ".card-checkbox:checked" in styles
    assert "background-image:url(\"data:image/svg+xml" in styles
    assert "border-radius:50%" in styles
    assert "半透明圆形选择器" in checklist


def test_mobile_preview_is_an_isolated_modal_stage():
    render = (ROOT / "app" / "web" / "render.js").read_text(encoding="utf-8")
    styles = (ROOT / "app" / "web" / "styles.css").read_text(encoding="utf-8")
    checklist = (ROOT / "docs" / "regression-checklist.md").read_text(encoding="utf-8")

    assert "function suppressBackgroundForPreview(overlay)" in render
    assert "el.inert = true" in render
    assert "record.el.inert = record.inert" in render
    assert "overlay.setAttribute('role', 'dialog')" in render
    assert "overlay.setAttribute('aria-modal', 'true')" in render
    assert "close.setAttribute('aria-label', '关闭全屏预览')" in render
    assert "close.focus({ preventScroll: true })" in render
    assert "body.preview-open" in styles
    assert "linear-gradient(180deg,#070a11,#010205 42%,#05070c)" in styles
    assert "不再透出底层 Inspector" in checklist


def test_offline_image_preview_falls_back_to_cached_thumbnail():
    render = (ROOT / "app" / "web" / "render.js").read_text(encoding="utf-8")
    service_worker = (ROOT / "app" / "web" / "sw.js").read_text(encoding="utf-8")
    styles = (ROOT / "app" / "web" / "styles.css").read_text(encoding="utf-8")
    checklist = (ROOT / "docs" / "regression-checklist.md").read_text(encoding="utf-8")

    assert "var usingThumbnailFallback = false" in render
    assert "el.dataset.previewSource = 'thumbnail'" in render
    assert "setPreviewStatus(overlay, '正在打开缓存预览…')" in render
    assert "setPreviewQualityNotice(overlay, isRemoteAccessUnavailableForRender())" in render
    assert "当前为缓存缩略图 · 原文件需重连" in render
    assert "THUMBNAIL_CACHE" in service_worker
    assert "cache.match(e.request)" in service_worker
    assert ".preview-quality-notice" in styles
    assert "自动回退到已缓存缩略图" in checklist


def test_remote_font_specimen_is_previewable_without_installing_fonts():
    core = (ROOT / "app" / "web" / "core.js").read_text(encoding="utf-8")
    render = (ROOT / "app" / "web" / "render.js").read_text(encoding="utf-8")
    styles = (ROOT / "app" / "web" / "styles.css").read_text(encoding="utf-8")
    checklist = (ROOT / "docs" / "regression-checklist.md").read_text(encoding="utf-8")

    assert "var PREVIEW_FONT_EXTS = ['ttf','otf','woff','woff2'];" in core
    assert "new FontFace" in core
    assert "function loadRemoteFontFace" in core
    assert "function createFontSpecimen" in core
    assert "function createFontPreviewStudio" in render
    assert 'contenteditable="true"' in render
    assert "data-font-size" in render
    assert ".font-specimen" in styles
    assert ".preview-font-studio" in styles
    assert "远程字体样张" in checklist


def test_structured_document_quick_look_is_lazy_safe_and_mobile_ready():
    core = (ROOT / "app" / "web" / "core.js").read_text(encoding="utf-8")
    render = (ROOT / "app" / "web" / "render.js").read_text(encoding="utf-8")
    styles = (ROOT / "app" / "web" / "styles.css").read_text(encoding="utf-8")
    checklist = (ROOT / "docs" / "regression-checklist.md").read_text(encoding="utf-8")

    assert "var PREVIEW_STRUCTURED_EXTS = ['doc','docx','xlsx','pptx','xmind'];" in core
    assert "function fetchDocumentPreview" in core
    assert "var documentMarks = { doc: 'W', docx: 'W', xlsx: 'X', pptx: 'P', xmind: 'M' };" in core
    assert "/document-preview" in core
    assert "function loadInspectorDocumentPreview" in render
    assert "function createDocumentPreviewStage" in render
    assert "renderOoxmlDocx" in render
    assert "renderOoxmlXlsx" in render
    assert "renderOoxmlPptx" in render
    assert "旧版 Word" in render
    assert "function renderXmindPreview" in render
    assert "REMOTE MINDMAP QUICK LOOK" in render
    assert ".ooxml-preview-stage" in styles
    assert ".ooxml-sheet-grid" in styles
    assert ".xmind-tree" in styles
    assert "Office Quick Look" in checklist
    assert "XMind Quick Look" in checklist


def test_eagle_cached_asset_quick_look_preserves_original_and_mobile_tools():
    core = (ROOT / "app" / "web" / "core.js").read_text(encoding="utf-8")
    render = (ROOT / "app" / "web" / "render.js").read_text(encoding="utf-8")
    interactions = (ROOT / "app" / "web" / "interactions.js").read_text(encoding="utf-8")
    styles = (ROOT / "app" / "web" / "styles.css").read_text(encoding="utf-8")
    checklist = (ROOT / "docs" / "regression-checklist.md").read_text(encoding="utf-8")

    assert "function isItemPreviewable(item)" in core
    assert "function isCachedPreviewOnly(item)" in core
    assert "点按打开 Eagle 缓存预览" in core
    assert "function createCachedAssetPreview(item, overlay)" in render
    assert "EAGLE CACHE QUICK LOOK" in render
    assert "专有格式素材" in render
    assert "img.dataset.previewSource = 'eagle-cache'" in render
    assert "overlay.dataset.previewSource = 'eagle-cache'" in render
    assert "isItemPreviewable(item)" in interactions
    assert ".cached-asset-preview" in styles
    assert ".cached-preview-matte" in styles
    assert "Eagle 缓存 Quick Look" in checklist


def test_preview_slideshow_advances_incremental_views_on_desktop_and_mobile():
    api = (ROOT / "app" / "web" / "api.js").read_text(encoding="utf-8")
    render = (ROOT / "app" / "web" / "render.js").read_text(encoding="utf-8")
    styles = (ROOT / "app" / "web" / "styles.css").read_text(encoding="utf-8")
    checklist = (ROOT / "docs" / "regression-checklist.md").read_text(encoding="utf-8")

    assert "async function loadNextIncrementalPage()" in api
    assert "loadNextIncrementalPage: loadNextIncrementalPage" in api
    assert "var previewSlideshow =" in render
    assert "function addPreviewSlideshowControls" in render
    assert "function schedulePreviewSlideshow" in render
    assert "document.visibilityState !== 'visible'" in render
    assert "await api.loadNextIncrementalPage()" in render
    assert "var delays = [3000, 5000, 8000]" in render
    assert "existing.dataset.previewTransition = '1'" in render
    assert "button.setAttribute('aria-label', previewSlideshow.active" in render
    assert "pace.setAttribute('aria-label', '切换自动播放间隔" in render
    sequence_mount = render.index("overlay.appendChild(sequence);")
    slideshow_mount = render.index("addPreviewSlideshowControls(sequence, overlay")
    assert sequence_mount < slideshow_mount
    assert ".preview-sequence-bar" in styles
    assert ".preview-slideshow-toggle.active" in styles
    assert "自动播放跨过当前 120 条边界" in checklist


def test_private_offline_cache_is_network_first_and_cleared_on_logout():
    service_worker = (ROOT / "app" / "web" / "sw.js").read_text(encoding="utf-8")
    main = (ROOT / "app" / "main.py").read_text(encoding="utf-8")

    thumbnail_branch = service_worker.split("/thumbnail$", 1)[1].split("isCacheableApiRequest", 1)[0]
    assert "return fetch(e.request).then" in thumbnail_branch
    assert "return cached || networkFetch" not in thumbnail_branch
    assert "caches.delete('eagle-viewer-thumbs-v1')" in main
    assert "caches.delete('eagle-viewer-api-v1')" in main
    assert "localStorage.removeItem(key)" in main
    assert 'data-mobile-more-action="logout"' in (ROOT / "app" / "web" / "index.html").read_text(encoding="utf-8")
    assert "action === 'logout'" in (ROOT / "app" / "web" / "interactions.js").read_text(encoding="utf-8")


def test_eagle_password_folders_have_explicit_desktop_and_mobile_lock_ui():
    api = (ROOT / "app" / "web" / "api.js").read_text(encoding="utf-8")
    render = (ROOT / "app" / "web" / "render.js").read_text(encoding="utf-8")
    styles = (ROOT / "app" / "web" / "styles.css").read_text(encoding="utf-8")
    checklist = (ROOT / "docs" / "regression-checklist.md").read_text(encoding="utf-8")

    assert "function findFolderNodeById" in api
    assert "folder && folder.locked" in api
    assert "render.showLockedFolderNotice(folder)" in api
    assert "function showLockedFolderNotice" in render
    assert "REMOTE PRIVACY BOUNDARY" in render
    assert "远程 Viewer 不会索引、搜索、预览或传输其中任何素材" in render
    assert ".locked-folder-overlay" in styles
    assert ".sidebar-item.locked" in styles
    assert "Eagle 密码文件夹" in checklist
