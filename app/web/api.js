'use strict';

var state = EagleViewer.state;
var render = EagleViewer.modules.render;
var apiModule = EagleViewer.modules.api = EagleViewer.modules.api || {};
var lastOfflineSnapshotToast = 0;
var OFFLINE_SNAPSHOT_META_KEY = 'eagle-viewer-offline-snapshot-meta';
var OFFLINE_SNAPSHOT_CATALOG_KEY = 'eagle-viewer-offline-snapshot-catalog';
var OFFLINE_SNAPSHOT_CATALOG_LIMIT = 8;

// ===== API =====
function noteOfflineSnapshotResponse(response) {
  if (!response || !response.headers || response.headers.get('X-Eagle-Offline-Cache') !== '1') return false;
  var now = Date.now();
  if (window.showToast && now - lastOfflineSnapshotToast > 12000) {
    window.showToast('正在浏览离线快照，重连后刷新 Vault');
    lastOfflineSnapshotToast = now;
  }
  return true;
}

async function fetchTree() {
  var r = await fetch(API + '/api/tree');
  if (handleAuthResponse(r)) return;
  if (!r.ok) throw new Error('Failed to load library');
  noteOfflineSnapshotResponse(r);
  var data = await r.json();
  state.treeData = data.folders || [];
  return state.treeData;
}

async function fetchTags() {
  var r = await fetch(API + '/api/tags');
  if (handleAuthResponse(r)) return [];
  if (!r.ok) return [];
  noteOfflineSnapshotResponse(r);
  var data = await r.json();
  state.tagData = data.tags || [];
  return state.tagData;
}

async function fetchEagleSmartFolders() {
  var r = await fetch(API + '/api/smart-folders');
  if (handleAuthResponse(r)) return [];
  if (!r.ok) return [];
  noteOfflineSnapshotResponse(r);
  var data = await r.json();
  state.eagleSmartFolders = data.smartFolders || [];
  return state.eagleSmartFolders;
}

async function fetchStats() {
  var r = await fetch(API + '/api/library/stats');
  if (handleAuthResponse(r)) return null;
  if (!r.ok) return null;
  noteOfflineSnapshotResponse(r);
  var data = await r.json();
  state.indexStats = data.stats || null;
  return state.indexStats;
}

async function fetchViewerState() {
  var r = await fetch(API + '/api/state');
  if (handleAuthResponse(r)) return null;
  if (!r.ok) return null;
  var data = await r.json();
  return data.state || null;
}

async function saveViewerState() {
  var r = await fetch(API + '/api/state', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ revision: state.viewerStateRevision, savedViews: state.savedViews, collections: state.collectionIds, ratings: state.itemRatings, notes: state.viewerNotes, reviewMarkers: state.reviewMarkers, workspaces: state.workspaces })
  });
  if (handleAuthResponse(r)) return null;
  var data = await r.json();
  if (r.status === 409) return { conflict: true, state: data.detail && data.detail.state };
  if (!r.ok) return null;
  return data.state || null;
}

async function resolveItems(itemIds) {
  var r = await fetch(API + '/api/items/resolve', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(itemIds)
  });
  if (handleAuthResponse(r) || !r.ok) return [];
  var data = await r.json();
  return data.items || [];
}

async function fetchSimilarItems(itemId, limit) {
  var boundedLimit = Math.max(1, Math.min(Number(limit) || 12, 40));
  var r = await fetch(API + '/api/items/' + encodeURIComponent(itemId) + '/similar?limit=' + boundedLimit);
  if (handleAuthResponse(r)) return [];
  if (!r.ok) throw new Error(r.status === 503 ? 'offline' : 'similarity');
  noteOfflineSnapshotResponse(r);
  var data = await r.json();
  return data.items || [];
}

function buildPagedApiUrl(apiPath, offset) {
  var query = buildListQuery();
  return API + apiPath + (apiPath.indexOf('?') >= 0 ? '&' : '?') + query + '&offset=' + offset + '&limit=' + INCREMENTAL_PAGE_SIZE;
}

function getOfflineSnapshotUrls() {
  var urls = [API + '/api/tree', API + '/api/tags', API + '/api/smart-folders'];
  var loadedPages = Math.max(1, Math.ceil(Math.max(state.currentItems.length, INCREMENTAL_PAGE_SIZE) / INCREMENTAL_PAGE_SIZE));
  var maxPages = Math.min(loadedPages, 3);

  function addPaged(apiPath) {
    for (var i = 0; i < maxPages; i++) urls.push(buildPagedApiUrl(apiPath, i * INCREMENTAL_PAGE_SIZE));
  }

  if (state.currentView === 'all') addPaged('/api/items');
  else if (state.currentView === 'recent') addPaged('/api/recent?days=' + (state.recentDays || 7));
  else if (state.currentView === 'folder' && state.currentFolderId) addPaged('/api/folders/' + encodeURIComponent(state.currentFolderId) + '/items');
  else if (state.currentView === 'tag' && state.currentTagName) addPaged('/api/tags/' + encodeURIComponent(state.currentTagName) + '/items');
  else if (state.currentView === 'search' && state.searchQuery) addPaged('/api/search?q=' + encodeURIComponent(state.searchQuery));
  else if (state.currentView === 'smart') {
    var availableSmartViews = (state.savedViews || []).slice();
    if (typeof getPresetViews === 'function') availableSmartViews = availableSmartViews.concat(getPresetViews());
    var smartView = availableSmartViews.find(function(view) { return view && view.name === state.currentSmartViewName; });
    if (smartView && smartView.view === 'folder' && smartView.folderId) addPaged('/api/folders/' + encodeURIComponent(smartView.folderId) + '/items');
    else if (smartView && smartView.view === 'tag' && smartView.tagName) addPaged('/api/tags/' + encodeURIComponent(smartView.tagName) + '/items');
    else if (smartView && smartView.view === 'recent') addPaged('/api/recent?days=' + (smartView.recentDays || 7));
    else if (smartView && smartView.view === 'search' && smartView.searchQuery) addPaged('/api/search?q=' + encodeURIComponent(smartView.searchQuery));
    else addPaged('/api/items');
  }
  else if (state.currentView === 'eagle-smart' && state.currentEagleSmartFolderId) addPaged('/api/smart-folders/' + encodeURIComponent(state.currentEagleSmartFolderId) + '/items');
  else if (state.currentView === 'duplicates') urls.push(API + '/api/duplicates?limit=80');
  else if (state.currentView === 'colors') urls.push(API + '/api/palettes?limit=36');
  else if (state.currentView === 'random' && state.currentRandomSeed) urls.push(API + '/api/random?seed=' + encodeURIComponent(state.currentRandomSeed) + '&limit=24&type=' + encodeURIComponent(state.listType || 'all'));

  (state.currentItems || []).slice(0, 80).forEach(function(item) {
    if (!item || !item.id) return;
    urls.push(API + '/api/items/' + encodeURIComponent(item.id));
    if (item.hasThumbnail || isImageExt(item.ext)) urls.push(API + '/api/items/' + encodeURIComponent(item.id) + '/thumbnail');
  });
  return urls.filter(function(url, index, arr) { return arr.indexOf(url) === index; });
}

function getOfflineSnapshotRoute() {
  var params = new URLSearchParams(location.hash.replace(/^#/, ''));
  if (!params.get('view')) params.set('view', state.currentView || 'all');
  params.delete('item');
  params.delete('action');
  return '#' + params.toString();
}

function getOfflineSnapshotCatalog() {
  try {
    var catalog = JSON.parse(localStorage.getItem(OFFLINE_SNAPSHOT_CATALOG_KEY) || '[]');
    if (!Array.isArray(catalog)) return [];
    return catalog.filter(function(entry) {
      return entry && entry.savedAt && typeof entry.route === 'string' && entry.route.indexOf('#view=') === 0;
    }).sort(function(a, b) { return Number(b.savedAt) - Number(a.savedAt); }).slice(0, OFFLINE_SNAPSHOT_CATALOG_LIMIT);
  } catch (e) {
    return [];
  }
}

function saveOfflineSnapshotRecord(record) {
  var catalog = getOfflineSnapshotCatalog().filter(function(entry) { return entry.route !== record.route; });
  catalog.unshift(record);
  catalog = catalog.slice(0, OFFLINE_SNAPSHOT_CATALOG_LIMIT);
  localStorage.setItem(OFFLINE_SNAPSHOT_META_KEY, JSON.stringify(record));
  localStorage.setItem(OFFLINE_SNAPSHOT_CATALOG_KEY, JSON.stringify(catalog));
  return catalog;
}

async function warmCurrentOfflineSnapshot() {
  if (!('serviceWorker' in navigator) || !navigator.serviceWorker.controller) {
    if (window.showToast) window.showToast('离线快照将在下次打开后可保存', 'error');
    return { ok: 0, total: 0 };
  }
  var urls = getOfflineSnapshotUrls();
  var ok = 0;
  for (var i = 0; i < urls.length; i++) {
    try {
      var r = await fetch(urls[i], { cache: 'reload' });
      if (r && r.ok) ok++;
    } catch (e) {}
  }
  if (window.showToast) {
    if (ok) window.showToast('已保存离线快照：' + ok + ' / ' + urls.length + ' 项', 'success');
    else window.showToast('保存离线快照失败，请检查远程连接', 'error');
  }
  if (ok) {
    var record = {
      savedAt: Date.now(),
      ok: ok,
      total: urls.length,
      title: state.currentTitle || '当前视图',
      view: state.currentView || 'all',
      route: getOfflineSnapshotRoute()
    };
    var catalog = [];
    try {
      catalog = saveOfflineSnapshotRecord(record);
    } catch (e) {}
    if (EagleViewer.modules.interactions && EagleViewer.modules.interactions.updateMobileRemoteCard) {
      EagleViewer.modules.interactions.updateMobileRemoteCard('online', '远程 Vault 在线');
    }
    window.dispatchEvent(new CustomEvent('eagle-viewer-offline-snapshot', { detail: { ok: ok, total: urls.length, record: record, catalogSize: catalog.length } }));
  }
  return { ok: ok, total: urls.length };
}

function requestServiceWorker(message, timeout) {
  return new Promise(function(resolve) {
    if (!('serviceWorker' in navigator) || !navigator.serviceWorker.controller || typeof MessageChannel === 'undefined') {
      resolve({ ok: false, reason: 'unavailable' });
      return;
    }
    var channel = new MessageChannel();
    var settled = false;
    var timer = setTimeout(function() {
      if (settled) return;
      settled = true;
      resolve({ ok: false, reason: 'timeout' });
    }, timeout || 4000);
    channel.port1.onmessage = function(event) {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve(event.data || { ok: false });
    };
    navigator.serviceWorker.controller.postMessage(message, [channel.port2]);
  });
}

async function clearOfflineSnapshot() {
  var result = await requestServiceWorker({ type: 'CLEAR_OFFLINE_SNAPSHOT' }, 4000);
  if (!result.ok) {
    if (window.showToast) window.showToast('清除失败，请重新打开页面后再试', 'error');
    return result;
  }
  try {
    localStorage.removeItem(OFFLINE_SNAPSHOT_META_KEY);
    localStorage.removeItem(OFFLINE_SNAPSHOT_CATALOG_KEY);
  } catch (e) {}
  if (window.showToast) window.showToast('已清除离线数据，应用仍可离线启动', 'success');
  window.dispatchEvent(new CustomEvent('eagle-viewer-offline-snapshot-cleared', { detail: result }));
  return result;
}

async function reloadLibrary() {
  if (state.reloadInFlight) return;
  state.reloadInFlight = true;
  var btn = document.getElementById('reloadLibraryBtn');
  if (btn) btn.classList.add('busy');
  try {
    var r = await fetch(API + '/api/library/reload', { method: 'POST' });
    if (handleAuthResponse(r)) return;
    if (!r.ok) throw new Error('刷新失败');
    await apiModule.fetchTree();
    render.renderSidebar();
    await apiModule.fetchTags();
    render.renderTagList();
    await apiModule.fetchEagleSmartFolders();
    if (render.renderEagleSmartFolders) render.renderEagleSmartFolders();
    render.syncActiveNavigationState();
    await apiModule.refreshCurrentView();
    window.dispatchEvent(new CustomEvent('eagle-viewer-library-reloaded'));
    if (window.showToast) window.showToast('远程 Vault 已刷新', 'success');
    return true;
  } catch (err) {
    if (window.showToast) window.showToast('刷新资源库失败，请稍后重试', 'error');
    else alert('刷新资源库失败：' + (err && err.message ? err.message : '请稍后重试'));
  } finally {
    state.reloadInFlight = false;
    if (btn) btn.classList.remove('busy');
  }
}

async function fetchLibraryStatus(deep) {
  var r = await fetch(API + '/api/library/status?deep=' + (deep ? 'true' : 'false'), { cache: 'no-store' });
  if (handleAuthResponse(r)) return null;
  if (!r.ok) throw new Error('status failed');
  return r.json();
}


async function refreshCurrentView() {
  if (state.currentView === 'all') return apiModule.loadAllItems(true);
  else if (state.currentView === 'folder' && state.currentFolderId) return apiModule.loadFolderItems(state.currentFolderId);
  else if (state.currentView === 'tag' && state.currentTagName) return apiModule.loadTagItems(state.currentTagName);
  else if (state.currentView === 'recent') return apiModule.loadRecentItems(state.recentDays);
  else if (state.currentView === 'search') return apiModule.doSearch();
  else if (state.currentView === 'duplicates') return apiModule.loadDuplicates();
  else if (state.currentView === 'colors') return apiModule.loadColorAtlas();
  else if (state.currentView === 'random') return apiModule.loadRandomWalk(state.currentRandomSeed, false);
  else if (state.currentView === 'eagle-smart' && state.currentEagleSmartFolderId) return apiModule.loadEagleSmartFolderItems(state.currentEagleSmartFolderId);
  else if (state.currentView === 'collection' && EagleViewer.modules.interactions && EagleViewer.modules.interactions.showCollection) {
    return EagleViewer.modules.interactions.showCollection(state.currentCollection || 'favorite');
  }
  else if (state.currentView === 'collection') return render.renderContent();
  else if (state.currentView === 'smart' && EagleViewer.modules.interactions && EagleViewer.modules.interactions.openSmartViewByName) {
    return EagleViewer.modules.interactions.openSmartViewByName(state.currentSmartViewName);
  }
  else return apiModule.loadAllItems(true);
}

function closeMobileSidebarIfNeeded() {
  if (window.innerWidth <= 768 && window._closeMobileSidebar) window._closeMobileSidebar();
}

function getViewModeStorageKey() {
  if (window.innerWidth <= 768) return 'eagle-viewer-viewmode-mobile';
  return state.currentView === 'all' ? 'eagle-viewer-viewmode-all' : 'eagle-viewer-viewmode-default';
}

function getPreferredViewMode() {
  var key = getViewModeStorageKey();
  var stored = null;
  try { stored = localStorage.getItem(key); } catch (e) {}
  if (stored === 'grid' || stored === 'justified' || stored === 'list') return stored;
  return 'grid';
}

function applyViewerStateFilters(items) {
  var filters = state.advancedFilters || {};
  var favoriteState = filters.favorite_state || '';
  var laterState = filters.later_state || '';
  var doneState = filters.done_state || '';
  var viewerNoteState = filters.viewer_note_state || '';
  var ratingMin = Math.max(0, Math.min(5, Number(filters.rating_min) || 0));
  var sourceDomain = normalizeSourceDomain(filters.source_domain || '');
  var ext = normalizeExtFilter(filters.ext || '');
  if (!favoriteState && !laterState && !doneState && !viewerNoteState && !ratingMin && !sourceDomain && !ext) return items || [];
  var favoriteIds = state.collectionIds.favorite || [];
  var laterIds = state.collectionIds.later || [];
  var doneIds = state.collectionIds.done || [];
  return (items || []).filter(function(item) {
    var id = item && item.id;
    if (!id) return false;
    var isFavorite = favoriteIds.indexOf(id) >= 0;
    var isLater = laterIds.indexOf(id) >= 0;
    var isDone = doneIds.indexOf(id) >= 0;
    if (favoriteState === 'favorited' && !isFavorite) return false;
    if (favoriteState === 'unfavorited' && isFavorite) return false;
    if (laterState === 'later' && !isLater) return false;
    if (laterState === 'not_later' && isLater) return false;
    if (doneState === 'done' && !isDone) return false;
    if (doneState === 'not_done' && isDone) return false;
    var hasViewerNote = !!String((state.viewerNotes || {})[id] || '').trim();
    if (viewerNoteState === 'noted' && !hasViewerNote) return false;
    if (viewerNoteState === 'unnoted' && hasViewerNote) return false;
    if (ratingMin && Number((state.itemRatings || {})[id] || 0) < ratingMin) return false;
    if (sourceDomain && normalizeSourceDomain(item.sourceDomain || item.url || '') !== sourceDomain) return false;
    if (ext && normalizeExtFilter(item.ext || '') !== ext) return false;
    return true;
  });
}

function hasViewerStateFilters() {
  var filters = state.advancedFilters || {};
  return !!(filters.favorite_state || filters.later_state || filters.done_state || filters.viewer_note_state || filters.rating_min || filters.source_domain || filters.ext);
}

function normalizeExtFilter(value) {
  return String(value || '').trim().toLowerCase().replace(/^\./, '').slice(0, 32);
}

function normalizeSourceDomain(value) {
  var raw = String(value || '').trim().toLowerCase();
  if (!raw) return '';
  try {
    var url = raw.indexOf('://') >= 0 ? new URL(raw) : new URL('https://' + raw);
    return url.hostname.replace(/^www\./, '');
  } catch (e) {
    return raw.replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0];
  }
}

function findFolderPathById(folderId, nodes, trail) {
  for (var i = 0; i < (nodes || []).length; i++) {
    var node = nodes[i];
    var nextTrail = trail.concat([node.name || '(未命名)']);
    if (String(node.id) === String(folderId)) return nextTrail.join(' / ');
    var childMatch = findFolderPathById(folderId, node.children || [], nextTrail);
    if (childMatch) return childMatch;
  }
  return '';
}

function findFolderNodeById(folderId, nodes) {
  for (var i = 0; i < (nodes || []).length; i++) {
    var node = nodes[i];
    if (String(node.id) === String(folderId)) return node;
    var child = findFolderNodeById(folderId, node.children || []);
    if (child) return child;
  }
  return null;
}

async function loadIncrementalView(options) {
  var reset = !!options.reset;
  var previousRoute = [state.currentView, state.currentFolderId || '', state.currentTagName || '', state.currentCollection || '', state.currentSmartViewName || '', state.currentEagleSmartFolderId || '', state.searchQuery || '', state.recentDays || 7].join(':');
  if (state.incrementalLoading && !reset) return;
  var requestId = reset ? state.activeListRequest + 1 : state.activeListRequest;
  if (reset) state.activeListRequest = requestId;
  if (reset) {
    state.incrementalOffset = 0;
    state.incrementalHasMore = false;
    state.incrementalLoading = false;
  }
  state.currentView = options.view;
  state.currentCollection = '';
  state.currentSmartViewName = '';
  state.currentEagleSmartFolderId = options.eagleSmartFolderId || '';
  state.currentFolderId = options.folderId || null;
  state.currentTagName = options.tagName || null;
  if (options.searchQuery !== undefined) state.searchQuery = options.searchQuery;
  if (options.days) state.recentDays = options.days;
  var nextRoute = [state.currentView, state.currentFolderId || '', state.currentTagName || '', state.currentCollection || '', state.currentSmartViewName || '', state.currentEagleSmartFolderId || '', state.searchQuery || '', state.recentDays || 7].join(':');
  if (reset && previousRoute !== nextRoute && state.inspectorItem && render.closeInspector) render.closeInspector();
  closeMobileSidebarIfNeeded();
  state.incrementalLoading = true;
  if (reset) {
    var body = document.getElementById('contentBody');
    body.innerHTML = '<div class="loading-spinner">加载中…</div>';
    document.getElementById('contentToolbar').style.display = 'flex';
  }
  try {
    var r = await fetch(API + options.apiPath + (options.apiPath.indexOf('?') >= 0 ? '&' : '?') + buildListQuery() + '&offset=' + state.incrementalOffset + '&limit=' + INCREMENTAL_PAGE_SIZE);
    if (handleAuthResponse(r)) return;
    if (r.status === 503) throw new Error('offline');
    if (!r.ok) throw new Error('加载失败');
    noteOfflineSnapshotResponse(r);
    var data = await r.json();
    if (requestId !== state.activeListRequest) return;
    state.currentTitle = options.title;
    if (reset) state.currentSubfolders = options.getSubfolders ? options.getSubfolders(data) : [];
    state.currentEmptyMsg = options.emptyMsg;
    state.currentTotal = data.total != null ? data.total : 0;
    state.incrementalOffset = data.nextOffset != null ? data.nextOffset : ((state.incrementalOffset || 0) + ((data.items || []).length));
    state.incrementalHasMore = !!data.hasMore;
    var rawItems = data.items || [];
    var newItems = applyViewerStateFilters(rawItems);
    state.currentItems = reset ? newItems : state.currentItems.concat(newItems);
    if (hasViewerStateFilters()) state.currentTotal = state.currentItems.length;
    state.incrementalLoading = false;
    if (reset && render.syncActiveNavigationState) render.syncActiveNavigationState();
    render.updateContentTitle();
    if (!reset && state.viewMode === 'grid' && render.appendItemsToGrid(newItems)) {
      updateUrlFromState();
      return;
    }
    render.renderContent();
    updateUrlFromState();
  } catch (err) {
    if (requestId !== state.activeListRequest) return;
    state.incrementalLoading = false;
    if (reset) {
      var msg = err && err.message === 'offline' ? '当前离线，已保留本地界面；重新连接后再刷新资料库' : '加载失败';
      document.getElementById('contentBody').innerHTML = '<div class="empty-state offline-state">' + iconFolderOutline() + '<strong>' + msg + '</strong><span>如果你正在远程访问 NAS，请检查 VPN、反向代理或局域网连接。</span></div>';
    }
  }
}

async function loadAllItems(reset) {
  await loadIncrementalView({
    view: 'all',
    apiPath: '/api/items',
    title: '全部文件',
    emptyMsg: '资源库中暂无素材',
    reset: reset
  });
}

function maybeLoadMoreIncrementalView() {
  if (['all', 'recent', 'folder', 'tag', 'search', 'eagle-smart'].indexOf(state.currentView) < 0 || !state.incrementalHasMore || state.incrementalLoading) return;
  var body = document.getElementById('contentBody');
  if (!body) return;
  if (body.scrollHeight - body.scrollTop - body.clientHeight < 600) {
    loadNextIncrementalPage();
  }
}

async function loadNextIncrementalPage() {
  if (!state.incrementalHasMore || state.incrementalLoading) return false;
  var before = state.currentItems.length;
  if (state.currentView === 'all') await apiModule.loadAllItems(false);
  else if (state.currentView === 'recent') await apiModule.loadRecentItems(state.recentDays, false);
  else if (state.currentView === 'folder' && state.currentFolderId) await apiModule.loadFolderItems(state.currentFolderId, false);
  else if (state.currentView === 'tag' && state.currentTagName) await apiModule.loadTagItems(state.currentTagName, false);
  else if (state.currentView === 'search') await apiModule.doSearch(false);
  else if (state.currentView === 'eagle-smart' && state.currentEagleSmartFolderId) await apiModule.loadEagleSmartFolderItems(state.currentEagleSmartFolderId, false);
  else return false;
  return state.currentItems.length > before;
}

async function loadRecentItems(days, reset) {
  if (reset !== false) reset = true;
  setRecentActive(days);
  await loadIncrementalView({
    view: 'recent',
    apiPath: '/api/recent?days=' + days,
    title: '最近 ' + days + ' 天',
    emptyMsg: '最近暂无素材',
    reset: reset,
    days: days
  });
}

async function loadTagItems(tagName, reset) {
  if (reset !== false) reset = true;
  await loadIncrementalView({
    view: 'tag',
    apiPath: '/api/tags/' + encodeURIComponent(tagName) + '/items',
    title: '标签「' + tagName + '」',
    emptyMsg: '该标签下暂无素材',
    reset: reset,
    tagName: tagName
  });
}

async function loadFolderItems(folderId, reset) {
  if (reset !== false) reset = true;
  var folder = findFolderNodeById(folderId, state.treeData);
  if (folder && folder.locked) {
    if (render.showLockedFolderNotice) render.showLockedFolderNotice(folder);
    return;
  }
  expandFolderPathTo(folderId, state.treeData);
  await loadIncrementalView({
    view: 'folder',
    apiPath: '/api/folders/' + encodeURIComponent(folderId) + '/items',
    title: findFolderPathById(folderId, state.treeData, []) || '文件夹',
    emptyMsg: '此文件夹暂无素材',
    reset: reset,
    folderId: folderId,
    getSubfolders: function(data) { return data.subfolders || []; }
  });
}

function findEagleSmartFolder(smartFolderId, nodes) {
  for (var i = 0; i < (nodes || []).length; i++) {
    var node = nodes[i];
    if (String(node.id) === String(smartFolderId)) return node;
    var child = findEagleSmartFolder(smartFolderId, node.children || []);
    if (child) return child;
  }
  return null;
}

async function loadEagleSmartFolderItems(smartFolderId, reset) {
  if (reset !== false) reset = true;
  var folder = findEagleSmartFolder(smartFolderId, state.eagleSmartFolders);
  await loadIncrementalView({
    view: 'eagle-smart',
    apiPath: '/api/smart-folders/' + encodeURIComponent(smartFolderId) + '/items',
    title: folder ? folder.name : 'Eagle 智能文件夹',
    emptyMsg: '没有符合 Eagle 智能文件夹规则的素材',
    reset: reset,
    eagleSmartFolderId: smartFolderId
  });
}

async function doSearch(reset) {
  if (reset !== false) reset = true;
  var q = document.getElementById('searchInput').value.trim();
  state.searchQuery = q;
  if (!q) {
    if (document.getElementById('allItems').classList.contains('active')) {
      apiModule.loadAllItems(true);
      return;
    }
    var activeItem = document.querySelector('.sidebar-item.active');
    if (activeItem) {
      var folderNode = activeItem.closest('.folder-node');
      if (folderNode && folderNode.dataset.folderId) {
        apiModule.loadFolderItems(folderNode.dataset.folderId);
        return;
      }
    }
    if (state.currentTagName) { apiModule.loadTagItems(state.currentTagName); return; }
    if (document.getElementById('recent7').classList.contains('active')) { apiModule.loadRecentItems(7); return; }
    if (document.getElementById('recent30').classList.contains('active')) { apiModule.loadRecentItems(30); return; }
    apiModule.loadAllItems(true);
    return;
  }
  if (q.charAt(0) === '#') {
    var tagQuery = q.slice(1).trim().toLowerCase();
    if (tagQuery) {
      var tagMatch = state.tagData.find(function(t) { return String(t.name || '').toLowerCase() === tagQuery; }) ||
        state.tagData.find(function(t) { return String(t.name || '').toLowerCase().indexOf(tagQuery) >= 0; });
      if (tagMatch) {
        apiModule.loadTagItems(tagMatch.name);
        return;
      }
    }
  }
  if (q.charAt(0) === '/') {
    var folderQuery = q.slice(1).trim().toLowerCase();
    if (folderQuery) {
      var matches = [];
      getFolderPathMatches(folderQuery, state.treeData, [], matches);
      if (matches.length) {
        state.currentFolderId = matches[0].id;
        apiModule.loadFolderItems(matches[0].id);
        return;
      }
    }
  }
  await loadIncrementalView({
    view: 'search',
    apiPath: '/api/search?q=' + encodeURIComponent(q),
    title: '搜索「' + q + '」',
    emptyMsg: '无匹配结果',
    reset: reset,
    searchQuery: q
  });
  var lowerQuery = q.toLowerCase();
  var noteIds = Object.keys(state.viewerNotes || {}).filter(function(itemId) {
    return String((state.viewerNotes || {})[itemId] || '').toLowerCase().indexOf(lowerQuery) >= 0;
  });
  var markerIds = Object.keys(state.reviewMarkers || {}).filter(function(itemId) {
    return ((state.reviewMarkers || {})[itemId] || []).some(function(marker) {
      return String((marker && marker.text) || '').toLowerCase().indexOf(lowerQuery) >= 0;
    });
  });
  var viewerTextIds = noteIds.concat(markerIds).filter(function(itemId, index, all) { return all.indexOf(itemId) === index; }).slice(0, 100);
  if (!viewerTextIds.length) return;
  var noteItems = await resolveItems(viewerTextIds);
  if (state.currentView !== 'search' || state.searchQuery !== q) return;
  var existing = {};
  state.currentItems.forEach(function(item) { if (item && item.id) existing[item.id] = true; });
  var additions = applyViewerStateFilters(noteItems).filter(function(item) { return item && item.id && !existing[item.id]; });
  if (!additions.length) return;
  state.currentItems = state.currentItems.concat(additions);
  state.currentTotal = Math.max(state.currentTotal || 0, state.currentItems.length);
  render.renderContent();
  updateUrlFromState();
}

async function loadDuplicates() {
  var leavingAnotherView = state.currentView !== 'duplicates';
  state.currentView = 'duplicates';
  state.currentFolderId = null;
  state.currentTagName = null;
  state.currentCollection = '';
  state.currentSmartViewName = '';
  if (leavingAnotherView && state.inspectorItem && render.closeInspector) render.closeInspector();
  closeMobileSidebarIfNeeded();
  var body = document.getElementById('contentBody');
  body.innerHTML = '<div class="loading-spinner">加载中…</div>';
  document.getElementById('contentToolbar').style.display = 'flex';
  try {
    var r = await fetch(API + '/api/duplicates?limit=80');
    if (handleAuthResponse(r)) return;
    if (r.status === 503) throw new Error('offline');
    if (!r.ok) throw new Error('加载失败');
    noteOfflineSnapshotResponse(r);
    var data = await r.json();
    state.duplicateGroups = data.groups || [];
    state.currentSubfolders = [];
    state.currentItems = [];
    state.currentTotal = state.duplicateGroups.reduce(function(sum, group) { return sum + (group.items || []).length; }, 0);
    state.currentTitle = '疑似重复 · ' + state.duplicateGroups.length + ' 组';
    state.currentEmptyMsg = '暂无疑似重复素材';
    render.renderDuplicates();
    updateUrlFromState();
  } catch (err) {
    var msg = err && err.message === 'offline' ? '当前离线，暂时无法分析重复素材' : '加载失败';
    body.innerHTML = '<div class="empty-state offline-state">' + iconFolderOutline() + '<strong>' + msg + '</strong><span>重新连接到远程 Vault 后再试一次。</span></div>';
  }
}

async function loadColorAtlas() {
  var leavingAnotherView = state.currentView !== 'colors';
  state.currentView = 'colors';
  state.currentFolderId = null;
  state.currentTagName = null;
  state.currentCollection = '';
  state.currentSmartViewName = '';
  if (leavingAnotherView && state.inspectorItem && render.closeInspector) render.closeInspector();
  closeMobileSidebarIfNeeded();
  var body = document.getElementById('contentBody');
  body.innerHTML = '<div class="loading-spinner">正在构建全库色谱…</div>';
  try {
    var r = await fetch(API + '/api/palettes?limit=36');
    if (handleAuthResponse(r)) return;
    if (r.status === 503) throw new Error('offline');
    if (!r.ok) throw new Error('load');
    noteOfflineSnapshotResponse(r);
    state.paletteAtlas = await r.json();
    state.currentSubfolders = [];
    state.currentItems = [];
    state.currentTotal = Number(state.paletteAtlas.coloredItems || 0);
    state.currentTitle = '全库色谱';
    state.currentEmptyMsg = 'Vault 中暂无可用的色板元数据';
    render.renderColorAtlas(state.paletteAtlas);
    if (render.syncActiveNavigationState) render.syncActiveNavigationState();
    updateUrlFromState();
  } catch (err) {
    var msg = err && err.message === 'offline' ? '当前离线，且未保存色谱快照' : '色谱构建失败';
    body.innerHTML = '<div class="empty-state offline-state">' + iconPalette() + '<strong>' + msg + '</strong><span>重新连接远程 Vault 后再试。</span></div>';
  }
}

function createRandomSeed() {
  return Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8);
}

async function loadRandomWalk(seed, reshuffle) {
  var leavingAnotherView = state.currentView !== 'random';
  state.currentView = 'random';
  state.currentFolderId = null;
  state.currentTagName = null;
  state.currentCollection = '';
  state.currentSmartViewName = '';
  state.currentRandomSeed = reshuffle || !seed ? createRandomSeed() : String(seed);
  if (leavingAnotherView && state.inspectorItem && render.closeInspector) render.closeInspector();
  closeMobileSidebarIfNeeded();
  var body = document.getElementById('contentBody');
  body.innerHTML = '<div class="loading-spinner">正在打乱 Vault…</div>';
  try {
    var path = '/api/random?seed=' + encodeURIComponent(state.currentRandomSeed) + '&limit=24&type=' + encodeURIComponent(state.listType || 'all');
    var r = await fetch(API + path);
    if (handleAuthResponse(r)) return;
    if (r.status === 503) throw new Error('offline');
    if (!r.ok) throw new Error('load');
    noteOfflineSnapshotResponse(r);
    var data = await r.json();
    state.currentSubfolders = [];
    state.currentItems = data.items || [];
    state.currentTotal = Number(data.totalEligible || 0);
    state.currentTitle = '随机漫游';
    state.currentEmptyMsg = '当前类型暂无可漫游素材';
    render.renderRandomWalk(data);
    if (render.syncActiveNavigationState) render.syncActiveNavigationState();
    updateUrlFromState();
  } catch (err) {
    var msg = err && err.message === 'offline' ? '当前离线，且未保存这次随机漫游' : '随机漫游加载失败';
    body.innerHTML = '<div class="empty-state offline-state">' + iconShuffle() + '<strong>' + msg + '</strong><span>重新连接远程 Vault，或打开已保存的离线漫游。</span></div>';
  }
}

Object.assign(apiModule, {
  fetchTree: fetchTree,
  fetchTags: fetchTags,
  fetchEagleSmartFolders: fetchEagleSmartFolders,
  fetchStats: fetchStats,
  fetchViewerState: fetchViewerState,
  saveViewerState: saveViewerState,
  resolveItems: resolveItems,
  fetchSimilarItems: fetchSimilarItems,
  getOfflineSnapshotCatalog: getOfflineSnapshotCatalog,
  warmCurrentOfflineSnapshot: warmCurrentOfflineSnapshot,
  clearOfflineSnapshot: clearOfflineSnapshot,
  reloadLibrary: reloadLibrary,
  fetchLibraryStatus: fetchLibraryStatus,
  refreshCurrentView: refreshCurrentView,
  getPreferredViewMode: getPreferredViewMode,
  loadAllItems: loadAllItems,
  loadRecentItems: loadRecentItems,
  loadTagItems: loadTagItems,
  loadFolderItems: loadFolderItems,
  loadEagleSmartFolderItems: loadEagleSmartFolderItems,
  findEagleSmartFolder: findEagleSmartFolder,
  doSearch: doSearch,
  loadDuplicates: loadDuplicates,
  loadColorAtlas: loadColorAtlas,
  loadRandomWalk: loadRandomWalk,
  loadNextIncrementalPage: loadNextIncrementalPage,
  maybeLoadMoreIncrementalView: maybeLoadMoreIncrementalView
});
