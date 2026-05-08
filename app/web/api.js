'use strict';

var state = EagleViewer.state;
var render = EagleViewer.modules.render;
var apiModule = EagleViewer.modules.api = EagleViewer.modules.api || {};

// ===== API =====
async function fetchTree() {
  var r = await fetch(API + '/api/tree');
  if (handleAuthResponse(r)) return;
  if (!r.ok) throw new Error('Failed to load library');
  var data = await r.json();
  state.treeData = data.folders || [];
  return state.treeData;
}

async function fetchTags() {
  var r = await fetch(API + '/api/tags');
  if (handleAuthResponse(r)) return [];
  if (!r.ok) return [];
  var data = await r.json();
  state.tagData = data.tags || [];
  return state.tagData;
}

async function fetchStats() {
  var r = await fetch(API + '/api/library/stats');
  if (handleAuthResponse(r)) return null;
  if (!r.ok) return null;
  var data = await r.json();
  state.indexStats = data.stats || null;
  return state.indexStats;
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
    render.syncActiveNavigationState();
    apiModule.refreshCurrentView();
  } catch (err) {
    alert('刷新资源库失败：' + (err && err.message ? err.message : '请稍后重试'));
  } finally {
    state.reloadInFlight = false;
    if (btn) btn.classList.remove('busy');
  }
}


function refreshCurrentView() {
  if (state.currentView === 'all') apiModule.loadAllItems(true);
  else if (state.currentView === 'folder' && state.currentFolderId) apiModule.loadFolderItems(state.currentFolderId);
  else if (state.currentView === 'tag' && state.currentTagName) apiModule.loadTagItems(state.currentTagName);
  else if (state.currentView === 'recent') apiModule.loadRecentItems(state.recentDays);
  else if (state.currentView === 'search') apiModule.doSearch();
  else if (state.currentView === 'duplicates') apiModule.loadDuplicates();
  else if (state.currentView === 'collection') render.renderContent();
  else apiModule.loadAllItems(true);
}

function closeMobileSidebarIfNeeded() {
  if (window.innerWidth <= 768 && window._closeMobileSidebar) window._closeMobileSidebar();
}

function getViewModeStorageKey() {
  return state.currentView === 'all' ? 'eagle-viewer-viewmode-all' : 'eagle-viewer-viewmode-default';
}

function getPreferredViewMode() {
  var key = getViewModeStorageKey();
  var stored = null;
  try { stored = localStorage.getItem(key); } catch (e) {}
  if (stored === 'grid' || stored === 'list') return stored;
  return state.currentView === 'all' ? 'list' : 'grid';
}

async function loadIncrementalView(options) {
  var reset = !!options.reset;
  if (state.incrementalLoading && !reset) return;
  var requestId = reset ? state.activeListRequest + 1 : state.activeListRequest;
  if (reset) state.activeListRequest = requestId;
  if (reset) {
    state.incrementalOffset = 0;
    state.incrementalHasMore = false;
    state.incrementalLoading = false;
  }
  state.currentView = options.view;
  state.currentFolderId = options.folderId || null;
  state.currentTagName = options.tagName || null;
  if (options.searchQuery !== undefined) state.searchQuery = options.searchQuery;
  if (options.days) state.recentDays = options.days;
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
    if (!r.ok) throw new Error('加载失败');
    var data = await r.json();
    if (requestId !== state.activeListRequest) return;
    state.currentTitle = options.title;
    if (reset) state.currentSubfolders = options.getSubfolders ? options.getSubfolders(data) : [];
    state.currentEmptyMsg = options.emptyMsg;
    state.currentTotal = data.total != null ? data.total : 0;
    state.incrementalOffset = data.nextOffset != null ? data.nextOffset : ((state.incrementalOffset || 0) + ((data.items || []).length));
    state.incrementalHasMore = !!data.hasMore;
    var newItems = data.items || [];
    state.currentItems = reset ? newItems : state.currentItems.concat(newItems);
    state.incrementalLoading = false;
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
      document.getElementById('contentBody').innerHTML = '<div class="empty-state">' + iconFolderOutline() + '<span>加载失败</span></div>';
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
  if (['all', 'recent', 'folder', 'tag', 'search'].indexOf(state.currentView) < 0 || !state.incrementalHasMore || state.incrementalLoading) return;
  var body = document.getElementById('contentBody');
  if (!body) return;
  if (body.scrollHeight - body.scrollTop - body.clientHeight < 600) {
    if (state.currentView === 'all') apiModule.loadAllItems(false);
    else if (state.currentView === 'recent') apiModule.loadRecentItems(state.recentDays, false);
    else if (state.currentView === 'folder' && state.currentFolderId) apiModule.loadFolderItems(state.currentFolderId, false);
    else if (state.currentView === 'tag' && state.currentTagName) apiModule.loadTagItems(state.currentTagName, false);
    else if (state.currentView === 'search') apiModule.doSearch(false);
  }
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
  expandFolderPathTo(folderId, state.treeData);
  await loadIncrementalView({
    view: 'folder',
    apiPath: '/api/folders/' + encodeURIComponent(folderId) + '/items',
    title: '',
    emptyMsg: '此文件夹暂无素材',
    reset: reset,
    folderId: folderId,
    getSubfolders: function(data) { return data.subfolders || []; }
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
}

async function loadDuplicates() {
  state.currentView = 'duplicates';
  state.currentFolderId = null;
  state.currentTagName = null;
  closeMobileSidebarIfNeeded();
  var body = document.getElementById('contentBody');
  body.innerHTML = '<div class="loading-spinner">加载中…</div>';
  document.getElementById('contentToolbar').style.display = 'flex';
  try {
    var r = await fetch(API + '/api/duplicates?limit=80');
    if (handleAuthResponse(r)) return;
    if (!r.ok) throw new Error('加载失败');
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
    body.innerHTML = '<div class="empty-state">' + iconFolderOutline() + '<span>加载失败</span></div>';
  }
}

Object.assign(apiModule, {
  fetchTree: fetchTree,
  fetchTags: fetchTags,
  fetchStats: fetchStats,
  reloadLibrary: reloadLibrary,
  refreshCurrentView: refreshCurrentView,
  getPreferredViewMode: getPreferredViewMode,
  loadAllItems: loadAllItems,
  loadRecentItems: loadRecentItems,
  loadTagItems: loadTagItems,
  loadFolderItems: loadFolderItems,
  doSearch: doSearch,
  loadDuplicates: loadDuplicates,
  maybeLoadMoreIncrementalView: maybeLoadMoreIncrementalView
});
