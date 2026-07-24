'use strict';

var state = EagleViewer.state;
var render = EagleViewer.modules.render;
var apiModule = EagleViewer.modules.api = EagleViewer.modules.api || {};

async function fetchJson(path, options) {
  var response = await fetch(API + path, options);
  if (handleAuthResponse(response)) return null;
  if (!response.ok) throw new Error(response.status === 503 ? 'offline' : 'request');
  return response.json();
}

async function fetchTree() {
  var data = await fetchJson('/api/tree');
  state.treeData = data ? (data.folders || []) : [];
  return state.treeData;
}

async function fetchTags() {
  var data = await fetchJson('/api/tags');
  state.tagData = data ? (data.tags || []) : [];
  return state.tagData;
}

async function fetchViewerState() {
  var data = await fetchJson('/api/state');
  return data ? (data.state || null) : null;
}

async function saveViewerState() {
  var response = await fetch(API + '/api/state', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      revision: state.viewerStateRevision
    })
  });
  if (handleAuthResponse(response)) return null;
  var data = await response.json();
  if (response.status === 409) return { conflict: true, state: data.detail && data.detail.state };
  return response.ok ? (data.state || null) : null;
}

async function resolveItems(itemIds) {
  var data = await fetchJson('/api/items/resolve', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(itemIds || [])
  });
  return data ? (data.items || []) : [];
}

async function reloadLibrary() {
  var response = await fetch(API + '/api/library/reload', { method: 'POST' });
  if (handleAuthResponse(response)) return null;
  if (!response.ok) throw new Error('reload');
  await fetchTree();
  render.renderSidebar();
  await fetchTags();
  render.renderTagList();
  await refreshCurrentView();
  return response.json();
}

async function fetchLibraryStatus(deep) {
  return fetchJson('/api/library/status' + (deep ? '?deep=true' : ''));
}

async function refreshCurrentView() {
  if (state.currentView === 'folder' && state.currentFolderId) return loadFolderItems(state.currentFolderId);
  if (state.currentView === 'tag' && state.currentTagName) return loadTagItems(state.currentTagName);
  if (state.currentView === 'recent') return loadRecentItems(state.recentDays);
  if (state.currentView === 'search') return doSearch();
  return loadAllItems(true);
}

function closeMobileSidebarIfNeeded() {
  if (window.innerWidth <= 768) document.getElementById('sidebar').classList.remove('mobile-open');
}

function getViewModeStorageKey() {
  return window.innerWidth <= 768 ? 'eagle-viewer-view-mode-mobile' : 'eagle-viewer-view-mode-desktop';
}

function getPreferredViewMode() {
  var stored = localStorage.getItem(getViewModeStorageKey()) || localStorage.getItem('eagle-viewer-view-mode');
  return stored === 'list' ? 'list' : 'grid';
}

function findFolderPathById(folderId, nodes, trail) {
  for (var i = 0; i < (nodes || []).length; i++) {
    var node = nodes[i];
    var next = trail.concat(node.name || '文件夹');
    if (String(node.id) === String(folderId)) return next.join(' / ');
    var child = findFolderPathById(folderId, node.children || [], next);
    if (child) return child;
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

function buildBasicListQuery() {
  var params = new URLSearchParams();
  params.set('sort', state.sortKey || 'mtime');
  params.set('dir', state.sortDir || 'desc');
  params.set('type', state.listType || 'all');
  params.set('offset', String(state.incrementalOffset || 0));
  params.set('limit', String(INCREMENTAL_PAGE_SIZE));
  return params.toString();
}

async function loadIncrementalView(options) {
  var reset = options.reset !== false;
  if (state.incrementalLoading && !reset) return;
  var requestId = reset ? state.activeListRequest + 1 : state.activeListRequest;
  if (reset) {
    state.activeListRequest = requestId;
    state.incrementalOffset = 0;
    state.incrementalHasMore = false;
    state.currentItems = [];
  }
  state.currentView = options.view;
  state.currentCollection = '';
  state.currentFolderId = options.folderId || null;
  state.currentTagName = options.tagName || null;
  if (options.searchQuery !== undefined) state.searchQuery = options.searchQuery;
  if (options.days) state.recentDays = options.days;
  closeMobileSidebarIfNeeded();
  state.incrementalLoading = true;
  if (reset) {
    document.getElementById('contentBody').innerHTML = '<div class="loading-spinner">加载中…</div>';
    document.getElementById('contentToolbar').style.display = 'flex';
  }
  try {
    var separator = options.apiPath.indexOf('?') >= 0 ? '&' : '?';
    var data = await fetchJson(options.apiPath + separator + buildBasicListQuery());
    if (!data || requestId !== state.activeListRequest) return;
    var newItems = data.items || [];
    state.currentTitle = options.title;
    state.currentSubfolders = reset && options.getSubfolders ? options.getSubfolders(data) : (reset ? [] : state.currentSubfolders);
    state.currentEmptyMsg = options.emptyMsg;
    state.currentTotal = Number(data.total || 0);
    state.incrementalOffset = Number(data.nextOffset != null ? data.nextOffset : state.incrementalOffset + newItems.length);
    state.incrementalHasMore = !!data.hasMore;
    state.currentItems = reset ? newItems : state.currentItems.concat(newItems);
    state.incrementalLoading = false;
    if (reset && render.syncActiveNavigationState) render.syncActiveNavigationState();
    render.updateContentTitle();
    if (!reset && state.viewMode === 'grid' && render.appendItemsToGrid(newItems)) {
      updateUrlFromState();
      return;
    }
    render.renderContent();
    updateUrlFromState();
  } catch (error) {
    if (requestId !== state.activeListRequest) return;
    state.incrementalLoading = false;
    if (reset) {
      var title = error && error.message === 'offline' ? '远程 Vault 暂不可达' : '加载失败';
      document.getElementById('contentBody').innerHTML = '<div class="empty-state offline-state">' + iconFolderOutline() + '<strong>' + title + '</strong><span>请检查网络连接、VPN 或远程挂载状态。</span></div>';
    }
  }
}

function loadAllItems(reset) {
  return loadIncrementalView({ view: 'all', apiPath: '/api/items', title: '全部文件', emptyMsg: '资源库中暂无素材', reset: reset });
}

function loadRecentItems(days, reset) {
  days = Number(days) === 30 ? 30 : 7;
  setRecentActive(days);
  return loadIncrementalView({ view: 'recent', apiPath: '/api/recent?days=' + days, title: '最近 ' + days + ' 天', emptyMsg: '最近暂无素材', reset: reset, days: days });
}

function loadTagItems(tagName, reset) {
  return loadIncrementalView({ view: 'tag', apiPath: '/api/tags/' + encodeURIComponent(tagName) + '/items', title: '标签「' + tagName + '」', emptyMsg: '该标签下暂无素材', reset: reset, tagName: tagName });
}

function loadFolderItems(folderId, reset) {
  var folder = findFolderNodeById(folderId, state.treeData);
  if (folder && folder.locked) {
    if (render.showLockedFolderNotice) render.showLockedFolderNotice(folder);
    return Promise.resolve();
  }
  expandFolderPathTo(folderId, state.treeData);
  return loadIncrementalView({
    view: 'folder',
    apiPath: '/api/folders/' + encodeURIComponent(folderId) + '/items',
    title: findFolderPathById(folderId, state.treeData, []) || '文件夹',
    emptyMsg: '此文件夹暂无素材',
    reset: reset,
    folderId: folderId,
    getSubfolders: function(data) { return data.subfolders || []; }
  });
}

function doSearch(reset) {
  var input = document.getElementById('searchInput');
  var query = String((input && input.value) || state.searchQuery || '').trim();
  if (!query) return loadAllItems(true);
  return loadIncrementalView({ view: 'search', apiPath: '/api/search?q=' + encodeURIComponent(query), title: '搜索「' + query + '」', emptyMsg: '没有匹配的素材', reset: reset, searchQuery: query });
}

function maybeLoadMoreIncrementalView() {
  if (['all', 'recent', 'folder', 'tag', 'search'].indexOf(state.currentView) < 0 || !state.incrementalHasMore || state.incrementalLoading) return;
  var body = document.getElementById('contentBody');
  if (body && body.scrollHeight - body.scrollTop - body.clientHeight < 600) loadNextIncrementalPage();
}

async function loadNextIncrementalPage() {
  if (!state.incrementalHasMore || state.incrementalLoading) return false;
  var before = state.currentItems.length;
  if (state.currentView === 'all') await loadAllItems(false);
  else if (state.currentView === 'recent') await loadRecentItems(state.recentDays, false);
  else if (state.currentView === 'folder') await loadFolderItems(state.currentFolderId, false);
  else if (state.currentView === 'tag') await loadTagItems(state.currentTagName, false);
  else if (state.currentView === 'search') await doSearch(false);
  return state.currentItems.length > before;
}

function unavailableView() {
  return loadAllItems(true);
}

Object.assign(apiModule, {
  fetchTree: fetchTree,
  fetchTags: fetchTags,
  fetchViewerState: fetchViewerState,
  saveViewerState: saveViewerState,
  resolveItems: resolveItems,
  reloadLibrary: reloadLibrary,
  fetchLibraryStatus: fetchLibraryStatus,
  refreshCurrentView: refreshCurrentView,
  getPreferredViewMode: getPreferredViewMode,
  loadAllItems: loadAllItems,
  loadRecentItems: loadRecentItems,
  loadTagItems: loadTagItems,
  loadFolderItems: loadFolderItems,
  doSearch: doSearch,
  loadNextIncrementalPage: loadNextIncrementalPage,
  maybeLoadMoreIncrementalView: maybeLoadMoreIncrementalView,
  fetchStats: async function() { return null; },
  fetchSimilarItems: async function() { return []; },
  fetchEagleSmartFolders: async function() { return []; },
  findEagleSmartFolder: function() { return null; },
  loadEagleSmartFolderItems: unavailableView,
  loadDuplicates: unavailableView,
  loadColorAtlas: unavailableView,
  loadRandomWalk: unavailableView,
  getOfflineSnapshotCatalog: function() { return []; },
  warmCurrentOfflineSnapshot: async function() { return { ok: 0, total: 0 }; },
  clearOfflineSnapshot: async function() { return { ok: true }; }
});
