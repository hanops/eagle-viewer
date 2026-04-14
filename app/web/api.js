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


// ===== Data loading =====
async function loadListAndRender(apiPath, subfolders, emptyMsg, getItemsFromData) {
  var body = document.getElementById('contentBody');
  body.innerHTML = '<div class="loading-spinner">加载中…</div>';
  document.getElementById('contentToolbar').style.display = 'flex';
  try {
    var r = await fetch(API + apiPath);
    if (handleAuthResponse(r)) return;
    if (!r.ok) {
      body.innerHTML = '<div class="empty-state">' + iconFolderOutline() + '<span>加载失败</span></div>';
      return;
    }
    var data = await r.json();
    var items = getItemsFromData(data);
    state.currentTotal = data.total != null ? data.total : items.length;
    if (subfolders !== null && subfolders !== undefined) state.currentSubfolders = subfolders;
    state.currentItems = items;
    state.currentEmptyMsg = emptyMsg;
    render.renderContent();
    updateUrlFromState();
  } catch (err) {
    body.innerHTML = '<div class="empty-state">' + iconFolderOutline() + '<span>加载失败</span></div>';
  }
}

function refreshCurrentView() {
  if (state.currentView === 'all') apiModule.loadAllItems(true);
  else if (state.currentView === 'folder' && state.currentFolderId) apiModule.loadFolderItems(state.currentFolderId);
  else if (state.currentView === 'tag' && state.currentTagName) apiModule.loadTagItems(state.currentTagName);
  else if (state.currentView === 'recent') apiModule.loadRecentItems(state.recentDays);
  else if (state.currentView === 'search') apiModule.doSearch();
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
  if (reset) {
    state.incrementalOffset = 0;
    state.incrementalHasMore = false;
    state.incrementalLoading = false;
  }
  state.currentView = options.view;
  state.currentFolderId = null;
  state.currentTagName = null;
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
    state.currentTitle = options.title;
    state.currentSubfolders = [];
    state.currentEmptyMsg = options.emptyMsg;
    state.currentTotal = data.total != null ? data.total : 0;
    state.incrementalOffset = data.nextOffset != null ? data.nextOffset : ((state.incrementalOffset || 0) + ((data.items || []).length));
    state.incrementalHasMore = !!data.hasMore;
    var newItems = data.items || [];
    state.currentItems = reset ? newItems : state.currentItems.concat(newItems);
    state.incrementalLoading = false;
    render.updateContentTitle();
    if (!reset && state.viewMode === 'grid' && (options.view === 'all' || options.view === 'recent') && render.appendItemsToGrid(newItems)) {
      updateUrlFromState();
      return;
    }
    render.renderContent();
    updateUrlFromState();
  } catch (err) {
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
  if ((state.currentView !== 'all' && state.currentView !== 'recent') || !state.incrementalHasMore || state.incrementalLoading) return;
  var body = document.getElementById('contentBody');
  if (!body) return;
  if (body.scrollHeight - body.scrollTop - body.clientHeight < 600) {
    if (state.currentView === 'all') apiModule.loadAllItems(false);
    else if (state.currentView === 'recent') apiModule.loadRecentItems(state.recentDays, false);
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

async function loadTagItems(tagName) {
  state.currentView = 'tag';
  state.currentTagName = tagName;
  state.currentFolderId = null;
  closeMobileSidebarIfNeeded();
  await loadListAndRender('/api/tags/' + encodeURIComponent(tagName) + '/items?' + buildListQuery(), [], '该标签下暂无素材', function(data) {
    state.currentTitle = '标签「' + tagName + '」';
    return data.items || [];
  });
}

async function loadFolderItems(folderId) {
  state.currentView = 'folder';
  state.currentFolderId = folderId;
  state.currentTagName = null;
  expandFolderPathTo(folderId, state.treeData);
  closeMobileSidebarIfNeeded();
  await loadListAndRender('/api/folders/' + encodeURIComponent(folderId) + '/items?' + buildListQuery(), null, '此文件夹暂无素材', function(data) {
    state.currentSubfolders = data.subfolders || [];
    state.currentTitle = '';
    return data.items || [];
  });
}

async function doSearch() {
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
  state.currentView = 'search';
  await loadListAndRender('/api/search?q=' + encodeURIComponent(q) + '&' + buildListQuery(), [], '无匹配结果', function(data) {
    state.currentTitle = '搜索「' + q + '」';
    return data.items || [];
  });
}

Object.assign(apiModule, {
  fetchTree: fetchTree,
  fetchTags: fetchTags,
  reloadLibrary: reloadLibrary,
  refreshCurrentView: refreshCurrentView,
  getPreferredViewMode: getPreferredViewMode,
  loadAllItems: loadAllItems,
  loadRecentItems: loadRecentItems,
  loadTagItems: loadTagItems,
  loadFolderItems: loadFolderItems,
  doSearch: doSearch,
  maybeLoadMoreIncrementalView: maybeLoadMoreIncrementalView
});
