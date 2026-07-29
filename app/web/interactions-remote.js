'use strict';

function updateMobileRemoteCard(status, message) {
  var card = document.getElementById('mobileRemoteCard');
  if (!card) return;
  var title = document.getElementById('mobileRemoteTitle');
  var meta = document.getElementById('mobileRemoteMeta');
  var networkChip = document.getElementById('mobileRemoteNetwork');
  var modeChip = document.getElementById('mobileRemoteMode');
  var snapshotChip = document.getElementById('mobileRemoteSnapshot');
  var refresh = document.getElementById('mobileRemoteRefresh');
  var pwa = isStandaloneDisplay() ? 'PWA' : (isIosLikeDevice() ? 'Safari' : '浏览器');
  var sync = document.getElementById('syncStatus');
  var syncText = sync ? sync.textContent : '本机';
  card.dataset.state = status || 'checking';
  if (title) {
    title.textContent = message || (status === 'online' ? '远程 Vault 在线' : status === 'changed' ? '发现 Vault 更新' : status === 'offline' ? '远程连接不可用' : '检查远程连接…');
  }
  if (meta) {
    meta.textContent = status === 'changed' ? '挂载目录已变化 · 载入后保留当前工作位置' : (navigator.onLine ? '网络在线' : '系统离线') + ' · 只读挂载 · ' + pwa + ' · ' + syncText;
  }
  if (networkChip) {
    networkChip.textContent = status === 'offline' ? '网络 · 离线' : (status === 'checking' ? '网络 · 检查中' : status === 'changed' ? 'Vault · 有更新' : '网络 · 在线');
    networkChip.dataset.state = status === 'offline' ? 'offline' : (status === 'checking' ? 'checking' : 'online');
  }
  if (refresh) refresh.textContent = status === 'changed' ? '载入更新' : '重连';
  if (modeChip) {
    modeChip.textContent = '模式 · ' + pwa + ' · 只读';
    modeChip.dataset.state = isStandaloneDisplay() ? 'online' : 'checking';
  }
  if (snapshotChip) {
    var snapshot = getOfflineSnapshotMeta();
    snapshotChip.textContent = snapshot ? ('快照 · ' + formatSnapshotAge(snapshot.savedAt) + ' · ' + (snapshot.ok || 0) + '项') : '快照 · 未保存';
    snapshotChip.dataset.state = snapshot ? 'online' : 'checking';
    snapshotChip.title = snapshot ? ((snapshot.title || '当前视图') + ' · ' + new Date(snapshot.savedAt).toLocaleString('zh-CN')) : '尚未保存离线快照';
  }
  if (render && render.updateMobileWorkbar) render.updateMobileWorkbar();
}

function getOfflineSnapshotMeta() {
  try {
    var meta = JSON.parse(localStorage.getItem('eagle-viewer-offline-snapshot-meta') || 'null');
    return meta && meta.savedAt ? meta : null;
  } catch (e) {
    return null;
  }
}

function formatSnapshotAge(savedAt) {
  var diff = Date.now() - Number(savedAt || 0);
  if (!isFinite(diff) || diff < 0) return '刚刚';
  var minutes = Math.floor(diff / 60000);
  if (minutes < 1) return '刚刚';
  if (minutes < 60) return minutes + '分钟前';
  var hours = Math.floor(minutes / 60);
  if (hours < 24) return hours + '小时前';
  var days = Math.floor(hours / 24);
  return days + '天前';
}

function getRemoteStatusMeta() {
  var pwa = isStandaloneDisplay() ? 'PWA' : (isIosLikeDevice() ? 'Safari' : '浏览器');
  var sync = document.getElementById('syncStatus');
  var syncText = sync ? sync.textContent : '本机';
  return (navigator.onLine ? '网络在线' : '系统离线') + ' · 只读挂载 · ' + pwa + ' · ' + syncText;
}

function updateRemoteStatusStrip(status, message) {
  var strip = document.getElementById('remoteStatusStrip');
  if (!strip) return;
  var title = document.getElementById('remoteStatusTitle');
  var meta = document.getElementById('remoteStatusMeta');
  var retry = document.getElementById('remoteStatusRetry');
  var stateName = status || 'checking';
  var text = message || (stateName === 'online' ? '远程 Vault 已恢复' : stateName === 'changed' ? '远程 Vault 有新内容' : stateName === 'offline' ? '远程 Vault 离线' : '正在重连远程 Vault…');

  strip.dataset.state = stateName;
  if (title) title.textContent = text;
  if (meta) meta.textContent = stateName === 'offline' ? '检查 VPN / NAS / 反向代理后重连 · ' + getRemoteStatusMeta() : stateName === 'changed' ? '检测到挂载目录变化 · 保留当前位置后刷新' : getRemoteStatusMeta();
  if (retry) {
    retry.disabled = stateName === 'checking';
    retry.textContent = stateName === 'changed' ? '载入更新' : '重连';
  }

  clearTimeout(strip._hideTimer);
  if (stateName === 'online') {
    if (strip._everVisible) {
      strip.hidden = false;
      strip.classList.add('visible');
      strip._hideTimer = setTimeout(function() {
        strip.classList.remove('visible');
        strip._hideTimer = setTimeout(function() { strip.hidden = true; }, 180);
      }, 1500);
    } else {
      strip.classList.remove('visible');
      strip.hidden = true;
    }
    renderMobileSearchQuick();
    var quickSheet = document.getElementById('quickActionSheet');
    if (quickSheet && quickSheet.dataset.itemId) {
      var quickItem = findCurrentItem(quickSheet.dataset.itemId);
      if (quickItem) updateQuickActionSheetState(quickSheet, quickItem);
    }
    var contextMenu = document.getElementById('itemContextMenu');
    if (contextMenu && contextMenu.dataset.itemId) {
      var contextItem = findCurrentItem(contextMenu.dataset.itemId);
      if (contextItem) updateDesktopContextMenuState(contextMenu, contextItem);
    }
    if (state.inspectorItem && render && render.openInspector && document.body.classList.contains('inspector-open')) render.openInspector(state.inspectorItem);
    if (render && render.updateBatchBar) render.updateBatchBar();
    if (render && render.refreshOpenPreviewMobileActions) render.refreshOpenPreviewMobileActions();
    if (render && render.updateMobileWorkbar) render.updateMobileWorkbar();
    if (render && render.renderContent && (state.currentItems.length || state.currentSubfolders.length)) render.renderContent();
    return;
  }

  strip._everVisible = true;
  strip.hidden = false;
  requestAnimationFrame(function() { strip.classList.add('visible'); });
  renderMobileSearchQuick();
  var activeQuickSheet = document.getElementById('quickActionSheet');
  if (activeQuickSheet && activeQuickSheet.dataset.itemId) {
    var activeQuickItem = findCurrentItem(activeQuickSheet.dataset.itemId);
    if (activeQuickItem) updateQuickActionSheetState(activeQuickSheet, activeQuickItem);
  }
  var activeContextMenu = document.getElementById('itemContextMenu');
  if (activeContextMenu && activeContextMenu.dataset.itemId) {
    var activeContextItem = findCurrentItem(activeContextMenu.dataset.itemId);
    if (activeContextItem) updateDesktopContextMenuState(activeContextMenu, activeContextItem);
  }
  if (state.inspectorItem && render && render.openInspector && document.body.classList.contains('inspector-open')) render.openInspector(state.inspectorItem);
  if (render && render.updateBatchBar) render.updateBatchBar();
  if (render && render.refreshOpenPreviewMobileActions) render.refreshOpenPreviewMobileActions();
  if (render && render.updateMobileWorkbar) render.updateMobileWorkbar();
  if (render && render.renderContent && (state.currentItems.length || state.currentSubfolders.length)) render.renderContent();
}

var libraryChangePollTimer = 0;
var libraryChangeCheckInFlight = false;
var lastLibraryDeepCheck = 0;
var libraryHiddenAt = 0;

async function checkLibraryChanges(options) {
  var opts = options || {};
  if (libraryChangeCheckInFlight || state.reloadInFlight || document.visibilityState !== 'visible' || navigator.onLine === false) return false;
  libraryChangeCheckInFlight = true;
  var deep = !!opts.deep || Date.now() - lastLibraryDeepCheck > 5 * 60 * 1000;
  if (deep) lastLibraryDeepCheck = Date.now();
  try {
    var status = await api.fetchLibraryStatus(deep);
    if (!status) return false;
    if (status.changed) {
      updateRemoteStatusStrip('changed', '远程 Vault 有新内容');
      updateMobileRemoteCard('changed', '发现 Vault 更新');
      return true;
    }
    return false;
  } catch (err) {
    return false;
  } finally {
    libraryChangeCheckInFlight = false;
  }
}

async function applyDetectedLibraryUpdate() {
  var refreshed = await api.reloadLibrary();
  if (!refreshed) return;
  updateRemoteStatusStrip('online', '远程 Vault 已更新');
  updateMobileRemoteCard('online', '远程 Vault 在线');
}

function setupLibraryChangeMonitor() {
  if (libraryChangePollTimer) return;
  libraryChangePollTimer = window.setInterval(function() { checkLibraryChanges(); }, 45 * 1000);
  document.addEventListener('visibilitychange', function() {
    if (document.visibilityState === 'hidden') {
      libraryHiddenAt = Date.now();
      return;
    }
    var hiddenFor = libraryHiddenAt ? Date.now() - libraryHiddenAt : 0;
    checkLibraryChanges({ deep: hiddenFor > 30 * 1000 });
  });
  window.addEventListener('focus', function() { checkLibraryChanges(); });
  window.addEventListener('eagle-viewer-library-reloaded', function() {
    lastLibraryDeepCheck = Date.now();
  });
}

async function checkRemoteStatus(options) {
  var opts = options || {};
  updateMobileRemoteCard('checking', opts.message || '检查远程连接…');
  if (!opts.quietStrip) updateRemoteStatusStrip('checking', opts.message || '正在重连远程 Vault…');
  var online = navigator.onLine !== false;
  if (!online) {
    updateMobileRemoteCard('offline', '设备当前离线');
    updateRemoteStatusStrip('offline', '设备当前离线');
    return false;
  }
  try {
    var response = await fetch(API + '/health', { cache: 'no-store' });
    if (handleAuthResponse(response)) return false;
    if (!response.ok) throw new Error('health failed');
    updateMobileRemoteCard('online', '远程 Vault 在线');
    if (!opts.quietStrip) updateRemoteStatusStrip('online', '远程 Vault 已恢复');
    flushPendingViewerState();
    if (opts.reload) api.reloadLibrary();
    return true;
  } catch (err) {
    updateMobileRemoteCard('offline', '远程连接不可用');
    updateRemoteStatusStrip('offline', '远程连接不可用');
    return false;
  }
}

async function refreshMobileRemoteStatus(skipReload) {
  return checkRemoteStatus({ reload: !skipReload, quietStrip: !!skipReload });
}

function setupRemoteStatusStrip() {
  var strip = document.getElementById('remoteStatusStrip');
  if (!strip || strip._bound) return;
  strip._bound = true;
  var retry = document.getElementById('remoteStatusRetry');
  if (retry) retry.onclick = function() {
    if (strip.dataset.state === 'changed') applyDetectedLibraryUpdate();
    else checkRemoteStatus({ reload: true });
  };

  if (navigator.onLine === false) updateRemoteStatusStrip('offline', '设备当前离线');
  window.addEventListener('online', function() { checkRemoteStatus({ reload: false, message: '网络已恢复，正在检查远程 Vault…' }); });
  window.addEventListener('offline', function() {
    updateMobileRemoteCard('offline', '设备当前离线');
    updateRemoteStatusStrip('offline', '设备当前离线');
  });
  window.addEventListener('eagle-viewer-offline-snapshot', function(event) {
    updateMobileRemoteCard('online', '离线快照已更新');
    if (render && render.updateMobileWorkbar) render.updateMobileWorkbar();
    if (render && render.refreshOpenPreviewMobileActions) render.refreshOpenPreviewMobileActions();
    syncMobileMoreHandoff();
    renderMobileSearchQuick();
  });
  window.addEventListener('eagle-viewer-offline-snapshot-cleared', function() {
    updateMobileRemoteCard(navigator.onLine === false ? 'offline' : 'online', '离线数据已清除');
    if (render && render.updateMobileWorkbar) render.updateMobileWorkbar();
    if (render && render.refreshOpenPreviewMobileActions) render.refreshOpenPreviewMobileActions();
    syncMobileMoreHandoff();
    renderMobileSearchQuick();
  });
}
