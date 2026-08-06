'use strict';

// ===== Main render =====
function renderContent() {
  var body = document.getElementById('contentBody');
  var toolbar = document.getElementById('contentToolbar');
  var titleEl = document.getElementById('contentTitle');

  if (state.viewMode !== getPreferredViewMode()) setViewMode(getPreferredViewMode(), true);

  toolbar.style.display = (state.currentView !== 'none') ? 'flex' : 'none';

  var ctSort = document.getElementById('ctSortSelect');
  var ctDir = document.getElementById('ctSortDirSelect');
  var ctType = document.getElementById('ctTypeSelect');
  ctSort.value = state.listSort;
  ctDir.value = state.listDir;
  ctType.value = state.listType;
  updateContentTitle();

  body.innerHTML = '';

  if (!state.currentSubfolders.length && !state.currentItems.length) {
      var remoteStrip = document.getElementById('remoteStatusStrip');
      var remoteOffline = navigator.onLine === false || (remoteStrip && !remoteStrip.hidden && remoteStrip.dataset.state === 'offline');
      var snapshotMeta = null;
      try {
        snapshotMeta = JSON.parse(localStorage.getItem('eagle-viewer-offline-snapshot-meta') || 'null');
      } catch (e) {}
      if (remoteOffline) {
        body.innerHTML =
          '<div class="empty-state offline-state">' + iconFolderOutline() +
            '<strong>' + (snapshotMeta && snapshotMeta.savedAt ? '当前视图没有可用快照' : '远程 Vault 暂不可达') + '</strong>' +
            '<span>' + (snapshotMeta && snapshotMeta.savedAt ? ('已有快照保存于 ' + new Date(snapshotMeta.savedAt).toLocaleString('zh-CN') + '，但这个视图尚未缓存。') : '这不是资料库为空；请检查 VPN、NAS 或反向代理后重连。') + '</span>' +
            '<div class="empty-actions"><button type="button" id="offlineEmptyRetryBtn">重连</button><button type="button" id="offlineEmptySnapshotBtn">保存快照</button></div>' +
          '</div>';
        var retryBtn = document.getElementById('offlineEmptyRetryBtn');
        var snapshotBtn = document.getElementById('offlineEmptySnapshotBtn');
        if (retryBtn) retryBtn.onclick = function() {
          if (EagleViewer.modules.interactions && EagleViewer.modules.interactions.checkRemoteStatus) {
            EagleViewer.modules.interactions.checkRemoteStatus({ reload: false, quietStrip: false, message: '正在检查远程 Vault…' });
          }
        };
        if (snapshotBtn) snapshotBtn.onclick = function() {
          if (api && api.warmCurrentOfflineSnapshot) api.warmCurrentOfflineSnapshot();
        };
      } else {
        body.innerHTML = '<div class="empty-state">' + iconFolderOutline() + '<span>' + (state.currentEmptyMsg || '暂无素材') + '</span></div>';
      }
    return;
  }

  if (state.viewMode === 'list') {
    var wrap = document.createElement('div');
    var banner = getOfflineSnapshotBannerHtml();
    if (banner) body.insertAdjacentHTML('beforeend', banner);
    body.appendChild(wrap);
    renderItemsList(state.currentSubfolders, state.currentItems, wrap, state.currentEmptyMsg);
    appendSubfoldersHint(wrap);
    setupListMarquee(wrap);
    bindOfflineSnapshotBanner();
  } else if (state.viewMode === 'justified') {
    var justifiedWrap = document.createElement('div');
    justifiedWrap.style.position = 'relative';
    var justifiedBanner = getOfflineSnapshotBannerHtml();
    if (justifiedBanner) body.insertAdjacentHTML('beforeend', justifiedBanner);
    body.appendChild(justifiedWrap);
    var gallery = document.createElement('div');
    gallery.className = 'justified-gallery';
    justifiedWrap.appendChild(gallery);
    state.currentSubfolders.forEach(function(sub) { renderFolderCard(sub, gallery); });
    state.currentItems.forEach(function(item) { renderItemCard(item, gallery); });
    appendSubfoldersHint(justifiedWrap);
    renderLoadMoreStatus(justifiedWrap);
    bindOfflineSnapshotBanner();
    applyJustifiedLayout(gallery);
  } else {
    var wrap = document.createElement('div');
    wrap.style.position = 'relative';
    var bannerHtml = getOfflineSnapshotBannerHtml();
    if (bannerHtml) body.insertAdjacentHTML('beforeend', bannerHtml);
    body.appendChild(wrap);
    var masonry = document.createElement('div');
    masonry.className = 'masonry';
    if (useCompactGridLayout()) masonry.classList.add('compact-grid');
    applyMasonryColumnCount(masonry, state.currentSubfolders.length + state.currentItems.length);
    wrap.appendChild(masonry);
    state.currentSubfolders.forEach(function(sub) { renderFolderCard(sub, masonry); });
    state.currentItems.forEach(function(item) { renderItemCard(item, masonry); });
    appendSubfoldersHint(wrap);
    setupGridMarquee(wrap, masonry);
    bindOfflineSnapshotBanner();
  }
  updateCheckboxesInView();
  focusPendingItemWhenLoaded();
  updateReturnToCurrentItemButton();
}

function appendSubfoldersHint(container) {
  if (state.currentView !== 'folder' || state.currentItems.length || !state.currentSubfolders.length) return;
  var hint = document.createElement('div');
  hint.className = 'folder-hint';
  hint.textContent = '此文件夹只包含子文件夹，点击卡片进入';
  container.appendChild(hint);
}

function showEmptyState() {
  state.currentView = 'none';
  state.currentItems = [];
  state.currentSubfolders = [];
  state.currentFolderId = null;
  state.currentTagName = null;
  state.currentTitle = '';
  state.currentTotal = 0;
  var body = document.getElementById('contentBody');
  body.innerHTML = '<div class="empty-state" id="emptyState">' + iconFolderOutline() + '<span>选择左侧文件夹查看素材</span></div>';
  document.getElementById('contentToolbar').style.display = 'none';
  renderModule.closeInspector();
  updateUrlFromState();
}
