'use strict';

var EagleViewer = window.EagleViewer = window.EagleViewer || {};

var API = '';
var VERSION = '4.3.3';
var VERSION_DATE = '2026-08-08';
var PREVIEW_IMAGE_EXTS = ['jpg','jpeg','png','gif','webp','svg','bmp'];
var PREVIEW_VIDEO_EXTS = ['mp4','webm','mov','m4v'];
var PREVIEW_AUDIO_EXTS = ['mp3','wav','m4a','aac','flac','ogg'];
var PREVIEW_DOCUMENT_EXTS = ['pdf','txt'];
var COPY_IMAGE_EXTS = ['jpg','jpeg','png','gif','webp','bmp'];

// ===== SVG Icons =====
function iconFolder() {
  return '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M2 4.5C2 3.67 2.67 3 3.5 3H6l1.5 1.5H12.5c.83 0 1.5.67 1.5 1.5v6c0 .83-.67 1.5-1.5 1.5h-9C2.67 13.5 2 12.83 2 12V4.5z"/></svg>';
}
function iconFolderLarge() {
  return '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7c0-1.1.9-2 2-2h4l2 2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V7z"/></svg>';
}
function iconLock() {
  return '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="7" width="10" height="7" rx="2"/><path d="M5.25 7V5.25a2.75 2.75 0 015.5 0V7M8 10v1.5"/></svg>';
}
function iconChevronRight() {
  return '<svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M5 3l4 4-4 4"/></svg>';
}
function iconSearch() {
  return '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="7" cy="7" r="4.5"/><path d="M10.5 10.5L14 14"/></svg>';
}
function iconGrid() {
  return '<svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="2" width="5.5" height="5.5" rx="1"/><rect x="10.5" y="2" width="5.5" height="5.5" rx="1"/><rect x="2" y="10.5" width="5.5" height="5.5" rx="1"/><rect x="10.5" y="10.5" width="5.5" height="5.5" rx="1"/></svg>';
}
function iconList() {
  return '<svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 4.5h12M3 9h12M3 13.5h12"/></svg>';
}
function iconJustified() {
  return '<svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"><rect x="2" y="2.5" width="8" height="5" rx=".8"/><rect x="11.5" y="2.5" width="4.5" height="5" rx=".8"/><rect x="2" y="9.5" width="5" height="6" rx=".8"/><rect x="8.5" y="9.5" width="7.5" height="6" rx=".8"/></svg>';
}
function iconSun() {
  return '<svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="9" r="3.5"/><path d="M9 1.5v2M9 14.5v2M1.5 9h2M14.5 9h2M3.7 3.7l1.4 1.4M12.9 12.9l1.4 1.4M3.7 14.3l1.4-1.4M12.9 5.1l1.4-1.4"/></svg>';
}
function iconMoon() {
  return '<svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M15.1 10.4A6.5 6.5 0 017.6 2.9 7.5 7.5 0 1015.1 10.4z"/></svg>';
}
function iconDownload() {
  return '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M8 2v9M4.5 7.5L8 11l3.5-3.5M3 13h10"/></svg>';
}
function iconClose() {
  return '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4l8 8M12 4l-8 8"/></svg>';
}
function iconMenu() {
  return '<svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M4 6h12M4 10h12M4 14h12"/></svg>';
}
function iconFile() {
  return '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M9 1.5H4.5A1.5 1.5 0 003 3v10a1.5 1.5 0 001.5 1.5h7A1.5 1.5 0 0013 13V5.5L9 1.5z"/><path d="M9 1.5V5.5H13"/></svg>';
}
function iconFileLarge() {
  return '<svg width="40" height="40" viewBox="0 0 40 40" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M23 5H12a3 3 0 00-3 3v24a3 3 0 003 3h16a3 3 0 003-3V13L23 5z"/><path d="M23 5v8h8"/></svg>';
}
function iconTag() {
  return '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M1.5 8.9V2.5a1 1 0 011-1h6.4a1 1 0 01.7.3l5.1 5.1a1 1 0 010 1.4l-6.4 6.4a1 1 0 01-1.4 0L1.8 9.6a1 1 0 01-.3-.7z"/><circle cx="5" cy="5" r="1" fill="currentColor"/></svg>';
}
function iconClock() {
  return '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="8" cy="8" r="6"/><path d="M8 4.5V8l2.5 1.5"/></svg>';
}
function iconExternalLink() {
  return '<svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M10 1.5h2.5V4M6 8l6.5-6.5M8.5 1.5H3a1.5 1.5 0 00-1.5 1.5v8A1.5 1.5 0 003 12.5h8a1.5 1.5 0 001.5-1.5V7.5"/></svg>';
}
function iconExport() {
  return '<svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M6 8l3-3 3 3M9 5v8M3 14h12"/></svg>';
}
function iconRefresh() {
  return '<svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 8.5A5.5 5.5 0 104 13"/><path d="M14 4.5v4h-4"/></svg>';
}
function iconPlay() {
  return '<svg width="20" height="20" viewBox="0 0 20 20" fill="#fff"><path d="M6.5 4.5l10 5.5-10 5.5V4.5z"/></svg>';
}
function iconCopy() {
  return '<svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="4.5" y="4.5" width="8" height="8" rx="1"/><path d="M1.5 9.5V2.5a1 1 0 011-1h7"/></svg>';
}
function iconEye() {
  return '<svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M1 7s2.5-4 6-4 6 4 6 4-2.5 4-6 4S1 7 1 7z"/><circle cx="7" cy="7" r="1.5"/></svg>';
}
function iconChevronLeft() {
  return '<svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M6.5 2L3.5 5l3 3"/></svg>';
}
function iconChevronRightSm() {
  return '<svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3.5 2L6.5 5l-3 3"/></svg>';
}
function iconFolderOutline() {
  return '<svg width="48" height="48" viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M6 14c0-2.2 1.8-4 4-4h8l4 4h16c2.2 0 4 1.8 4 4v16c0 2.2-1.8 4-4 4H10c-2.2 0-4-1.8-4-4V14z"/></svg>';
}
function iconCollection() {
  return '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="9" height="9" rx="1.5"/><path d="M5 2.5h7.5A1.5 1.5 0 0114 4v7.5"/></svg>';
}
function iconSliders() {
  return '<svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M3 5h12M3 13h12M6 3v4M12 11v4"/></svg>';
}
function iconInfo() {
  return '<svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="9" r="6.5"/><path d="M9 8.5v4M9 5.5h.01"/></svg>';
}
function iconCompare() {
  return '<svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="5" height="12" rx="1.5"/><rect x="11" y="3" width="5" height="12" rx="1.5"/><path d="M7 6h4M7 12h4"/></svg>';
}

// ===== Inject icons into DOM =====
function injectIcons() {
  var el;
  el = document.getElementById('menuBtn'); if (el) el.innerHTML = iconMenu();
  el = document.getElementById('searchIcon'); if (el) el.innerHTML = iconSearch();
  el = document.getElementById('viewGrid'); if (el) el.innerHTML = iconGrid();
  el = document.getElementById('viewJustified'); if (el) el.innerHTML = iconJustified();
  el = document.getElementById('viewList'); if (el) el.innerHTML = iconList();
  el = document.getElementById('inspectorPrev'); if (el) el.innerHTML = iconChevronLeft();
  el = document.getElementById('inspectorNext'); if (el) el.innerHTML = iconChevronRightSm();
  el = document.getElementById('exportListBtn'); if (el) el.innerHTML = iconExport();
  el = document.getElementById('inspectorClose'); if (el) el.innerHTML = iconClose();
  el = document.getElementById('iconAllItems'); if (el) el.innerHTML = iconCollection();
  el = document.getElementById('iconMobileLibrary'); if (el) el.innerHTML = iconCollection();
  el = document.getElementById('iconMobileSearch'); if (el) el.innerHTML = iconSearch();
  el = document.getElementById('iconMobileSearchSheet'); if (el) el.innerHTML = iconSearch();
  el = document.getElementById('iconMobileMore'); if (el) el.innerHTML = iconMenu();
  el = document.getElementById('iconMobileMoreSidebar'); if (el) el.innerHTML = iconMenu();
  el = document.getElementById('iconMobileMoreOffline'); if (el) el.innerHTML = iconDownload();
  el = document.getElementById('iconMobileMoreRefresh'); if (el) el.innerHTML = iconRefresh();
  el = document.getElementById('iconMobileMoreTheme'); if (el) el.innerHTML = iconMoon();
  el = document.getElementById('iconRecent7'); if (el) el.innerHTML = iconClock();
  el = document.getElementById('iconRecent30'); if (el) el.innerHTML = iconClock();
  el = document.getElementById('emptyIcon'); if (el) el.innerHTML = iconFolderOutline();
  el = document.getElementById('returnCurrentIcon'); if (el) el.innerHTML = iconEye();
  el = document.getElementById('installCoachClose'); if (el) el.innerHTML = iconClose();
  el = document.getElementById('sidebarToggle');
  if (el) el.innerHTML = iconChevronLeft();
}

// ===== State =====
var treeData = [];
var tagData = [];
var searchTimeout = null;
var viewMode = 'grid';
var currentSubfolders = [];
var currentItems = [];
var currentTotal = 0;
var currentEmptyMsg = '';
var currentTitle = '';
var selectedIds = new Set();
var lastSelectedId = '';
var currentFolderId = null;
var currentTagName = null;
var currentView = 'all';
var recentDays = 7;
var searchQuery = '';
var listSort = 'mtime';
var listDir = 'desc';
var listType = 'all';
var inspectorItem = null;
var pendingItemId = '';
var pendingLaunchAction = '';
var pendingFocusItemId = '';
var pendingFocusLoads = 0;
var lastFocusedItemId = '';
var lastFocusedItemName = '';
var folderExpanded = {};
var hoverTimer = null;
var hoverPreviewEl = null;
var hoverPreviewRaf = 0;
var hoverPreviewPos = null;
var reloadInFlight = false;
var incrementalOffset = 0;
var incrementalHasMore = false;
var incrementalLoading = false;
var activeListRequest = 0;
var INCREMENTAL_PAGE_SIZE = 120;
var LAST_ROUTE_STORAGE_KEY = 'eagle-viewer-last-route';
var LAST_ROUTE_MAX_AGE_MS = 14 * 24 * 60 * 60 * 1000;
var routeHistoryInitialized = false;
var routeHistorySuspended = 0;

EagleViewer.config = {
  apiBase: API,
  version: VERSION,
  versionDate: VERSION_DATE
};
EagleViewer.modules = EagleViewer.modules || {};

EagleViewer.state = EagleViewer.state || {};
Object.defineProperties(EagleViewer.state, {
  treeData: { get: function() { return treeData; }, set: function(v) { treeData = v; }, enumerable: true },
  tagData: { get: function() { return tagData; }, set: function(v) { tagData = v; }, enumerable: true },
  searchTimeout: { get: function() { return searchTimeout; }, set: function(v) { searchTimeout = v; }, enumerable: true },
  viewMode: { get: function() { return viewMode; }, set: function(v) { viewMode = v; }, enumerable: true },
  currentSubfolders: { get: function() { return currentSubfolders; }, set: function(v) { currentSubfolders = v; }, enumerable: true },
  currentItems: { get: function() { return currentItems; }, set: function(v) { currentItems = v; }, enumerable: true },
  currentTotal: { get: function() { return currentTotal; }, set: function(v) { currentTotal = v; }, enumerable: true },
  currentEmptyMsg: { get: function() { return currentEmptyMsg; }, set: function(v) { currentEmptyMsg = v; }, enumerable: true },
  currentTitle: { get: function() { return currentTitle; }, set: function(v) { currentTitle = v; }, enumerable: true },
  selectedIds: { get: function() { return selectedIds; }, set: function(v) { selectedIds = v; }, enumerable: true },
  lastSelectedId: { get: function() { return lastSelectedId; }, set: function(v) { lastSelectedId = v || ''; }, enumerable: true },
  currentFolderId: { get: function() { return currentFolderId; }, set: function(v) { currentFolderId = v; }, enumerable: true },
  currentTagName: { get: function() { return currentTagName; }, set: function(v) { currentTagName = v; }, enumerable: true },
  currentView: { get: function() { return currentView; }, set: function(v) { currentView = v; }, enumerable: true },
  recentDays: { get: function() { return recentDays; }, set: function(v) { recentDays = v; }, enumerable: true },
  searchQuery: { get: function() { return searchQuery; }, set: function(v) { searchQuery = v; }, enumerable: true },
  listSort: { get: function() { return listSort; }, set: function(v) { listSort = v; }, enumerable: true },
  listDir: { get: function() { return listDir; }, set: function(v) { listDir = v; }, enumerable: true },
  listType: { get: function() { return listType; }, set: function(v) { listType = v; }, enumerable: true },
  inspectorItem: { get: function() { return inspectorItem; }, set: function(v) { inspectorItem = v; }, enumerable: true },
  pendingItemId: { get: function() { return pendingItemId; }, set: function(v) { pendingItemId = v || ''; }, enumerable: true },
  pendingLaunchAction: { get: function() { return pendingLaunchAction; }, set: function(v) { pendingLaunchAction = v || ''; }, enumerable: true },
  pendingFocusItemId: { get: function() { return pendingFocusItemId; }, set: function(v) { pendingFocusItemId = v || ''; }, enumerable: true },
  pendingFocusLoads: { get: function() { return pendingFocusLoads; }, set: function(v) { pendingFocusLoads = Number(v) || 0; }, enumerable: true },
  lastFocusedItemId: { get: function() { return lastFocusedItemId; }, set: function(v) { lastFocusedItemId = v || ''; }, enumerable: true },
  lastFocusedItemName: { get: function() { return lastFocusedItemName; }, set: function(v) { lastFocusedItemName = v || ''; }, enumerable: true },
  folderExpanded: { get: function() { return folderExpanded; }, set: function(v) { folderExpanded = v; }, enumerable: true },
  hoverTimer: { get: function() { return hoverTimer; }, set: function(v) { hoverTimer = v; }, enumerable: true },
  hoverPreviewEl: { get: function() { return hoverPreviewEl; }, set: function(v) { hoverPreviewEl = v; }, enumerable: true },
  hoverPreviewRaf: { get: function() { return hoverPreviewRaf; }, set: function(v) { hoverPreviewRaf = v; }, enumerable: true },
  hoverPreviewPos: { get: function() { return hoverPreviewPos; }, set: function(v) { hoverPreviewPos = v; }, enumerable: true },
  reloadInFlight: { get: function() { return reloadInFlight; }, set: function(v) { reloadInFlight = v; }, enumerable: true },
  incrementalOffset: { get: function() { return incrementalOffset; }, set: function(v) { incrementalOffset = v; }, enumerable: true },
  incrementalHasMore: { get: function() { return incrementalHasMore; }, set: function(v) { incrementalHasMore = v; }, enumerable: true },
  incrementalLoading: { get: function() { return incrementalLoading; }, set: function(v) { incrementalLoading = v; }, enumerable: true },
  activeListRequest: { get: function() { return activeListRequest; }, set: function(v) { activeListRequest = v; }, enumerable: true },
});
EagleViewer.getState = function() {
  return EagleViewer.state;
};

function buildListQuery() {
  var params = new URLSearchParams();
  params.set('sort', listSort);
  params.set('dir', listDir);
  params.set('type', listType);
  return params.toString();
}

function updateUrlFromState() {
  var params = new URLSearchParams();
  params.set('view', currentView);
  params.set('sort', listSort);
  params.set('dir', listDir);
  params.set('type', listType);
  if (currentView === 'folder' && currentFolderId) params.set('id', currentFolderId);
  if (currentView === 'tag' && currentTagName) params.set('tag', currentTagName);
  if (currentView === 'recent') params.set('days', String(recentDays));
  if (currentView === 'search' && searchQuery) params.set('q', searchQuery);
  var itemId = inspectorItem && inspectorItem.id ? inspectorItem.id : pendingItemId;
  if (itemId) params.set('item', itemId);
  var hash = '#' + params.toString();
  var identity = getRouteHistoryIdentity(params);
  var pushedRoute = false;
  if (history && history.replaceState && routeHistorySuspended < 1) {
    var currentHistoryState = history.state && typeof history.state === 'object' ? history.state : {};
    var currentIndex = Number(currentHistoryState.eagleRouteIndex);
    if (!isFinite(currentIndex) || currentIndex < 0) currentIndex = 0;
    var nextHistoryState = Object.assign({}, currentHistoryState, {
      eagleRoute: true,
      eagleRouteIndex: currentIndex,
      eagleRouteIdentity: identity
    });
    var routeUrl = location.pathname + location.search + hash;
    if (!routeHistoryInitialized) {
      history.replaceState(nextHistoryState, '', routeUrl);
      routeHistoryInitialized = true;
    } else if (currentHistoryState.eagleRouteIdentity && currentHistoryState.eagleRouteIdentity !== identity) {
      nextHistoryState.eagleRouteIndex = currentIndex + 1;
      history.pushState(nextHistoryState, '', routeUrl);
      pushedRoute = true;
    } else if (location.hash !== hash || currentHistoryState.eagleRouteIdentity !== identity) {
      history.replaceState(nextHistoryState, '', routeUrl);
    }
  }
  rememberLastRoute(hash);
  if (pushedRoute && EagleViewer.modules.render && EagleViewer.modules.render.updateMobileWorkbar) {
    EagleViewer.modules.render.updateMobileWorkbar();
  }
}

function getRouteHistoryIdentity(params) {
  var view = params.get('view') || 'all';
  var identity = [view];
  if (view === 'folder') identity.push(params.get('id') || '');
  else if (view === 'tag') identity.push(params.get('tag') || '');
  else if (view === 'recent') identity.push(params.get('days') || '7');
  else if (view === 'search') identity.push(params.get('q') || '');
  return identity.join(':');
}

function suspendRouteHistory() {
  routeHistorySuspended += 1;
}

function resumeRouteHistory() {
  routeHistorySuspended = Math.max(0, routeHistorySuspended - 1);
}

function canNavigateBackInApp() {
  var currentHistoryState = history && history.state;
  return !!(currentHistoryState && currentHistoryState.eagleRoute && Number(currentHistoryState.eagleRouteIndex) > 0);
}

function navigateBackInApp() {
  if (!canNavigateBackInApp()) return false;
  history.back();
  return true;
}

function applyStateFromHash(rawHash) {
  var hash = String(rawHash || '').replace(/^#/, '');
  if (!hash) return false;
  var params = new URLSearchParams(hash);
  var view = params.get('view') || 'all';
  currentView = view;
  listSort = params.get('sort') || 'mtime';
  listDir = params.get('dir') || 'desc';
  listType = params.get('type') || 'all';
  currentFolderId = params.get('id') || null;
  currentTagName = params.get('tag') || null;
  pendingItemId = params.get('item') || '';
  pendingLaunchAction = params.get('action') || '';
  recentDays = parseInt(params.get('days'), 10) || 7;
  searchQuery = params.get('q') || '';
  return true;
}

function applyStateFromUrl() {
  return applyStateFromHash(location.hash);
}

function rememberLastRoute(hash) {
  if (!hash || hash === '#view=none' || currentView === 'none') return;
  try {
    localStorage.setItem(LAST_ROUTE_STORAGE_KEY, JSON.stringify({ hash: hash, savedAt: Date.now() }));
  } catch (e) {
    // localStorage may be unavailable in private browsing; route persistence is best-effort.
  }
}

function isStandaloneLaunch() {
  return !!(window.navigator.standalone || (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches));
}

function restoreLastRouteForStandalone() {
  if (location.hash || !isStandaloneLaunch()) return { restored: false, reason: 'skip' };
  var saved = null;
  try {
    saved = JSON.parse(localStorage.getItem(LAST_ROUTE_STORAGE_KEY) || 'null');
  } catch (e) {
    saved = null;
  }
  var hash = saved && typeof saved.hash === 'string' ? saved.hash : '';
  var savedAt = saved && Number(saved.savedAt);
  if (!hash || hash === '#view=none') return { restored: false, reason: 'empty' };
  if (!savedAt || Date.now() - savedAt > LAST_ROUTE_MAX_AGE_MS) {
    try { localStorage.removeItem(LAST_ROUTE_STORAGE_KEY); } catch (e2) {}
    return { restored: false, reason: 'stale' };
  }
  if (history && history.replaceState) history.replaceState(null, '', location.pathname + location.search + hash);
  else location.hash = hash;
  return { restored: true, reason: 'restored' };
}

function handleAuthResponse(r) {
  if (r.status === 401) { window.location.href = '/login'; return true; }
  return false;
}

function escapeHtml(s) {
  var div = document.createElement('div');
  div.textContent = s;
  return div.innerHTML;
}

function isPreviewable(ext) {
  var e = (ext || '').toLowerCase();
  return PREVIEW_IMAGE_EXTS.indexOf(e) >= 0 || PREVIEW_VIDEO_EXTS.indexOf(e) >= 0 || PREVIEW_AUDIO_EXTS.indexOf(e) >= 0 || PREVIEW_DOCUMENT_EXTS.indexOf(e) >= 0;
}
function isItemPreviewable(item) {
  return !!item && isPreviewable(item.ext);
}
function isImageExt(ext) {
  return ext && PREVIEW_IMAGE_EXTS.indexOf((ext || '').toLowerCase()) >= 0;
}
function isVideoExt(ext) {
  return ext && PREVIEW_VIDEO_EXTS.indexOf((ext || '').toLowerCase()) >= 0;
}
function canCopyImage(ext) {
  return ext && COPY_IMAGE_EXTS.indexOf((ext || '').toLowerCase()) >= 0;
}

function getItemKind(ext) {
  var e = (ext || '').toLowerCase();
  if (PREVIEW_IMAGE_EXTS.indexOf(e) >= 0) return 'image';
  if (PREVIEW_VIDEO_EXTS.indexOf(e) >= 0) return 'video';
  if (PREVIEW_AUDIO_EXTS.indexOf(e) >= 0) return 'audio';
  if (e === 'pdf') return 'pdf';
  if (e === 'txt') return 'text';
  if (['doc','docx','xls','xlsx','ppt','pptx','xmind','mindnode','graffle','numbers','psd','ai','sketch','fig','xd'].indexOf(e) >= 0) return 'document';
  return 'other';
}

function renderFilePlaceholder(item, large) {
  var kind = getItemKind(item.ext);
  var kindClass = (kind === 'pdf' || kind === 'text' || kind === 'document') ? kind : 'other';
  var typeLabel = (item.ext || kind || 'file').toUpperCase();
  var meta = [];
  if (item.width && item.height) meta.push(item.width + ' × ' + item.height);
  if (item.size) meta.push(formatSize(item.size));
  if (!meta.length) meta.push(kind === 'pdf' ? 'PDF 文档' : kind === 'text' ? '文本文件' : kind === 'document' ? '下载后查看' : '文件');
  var icon = large ? iconFileLarge() : iconFile();
  var excerptHtml = kind === 'text'
    ? '<div class="file-cover-excerpt" data-snippet-for="' + escapeHtml(item.id) + '">正在加载摘要…</div>'
    : '';
  return (
    '<div class="placeholder"><div class="file-cover ' + kindClass + '">' +
      '<div class="file-cover-head">' +
        '<span class="file-cover-type">' + escapeHtml(typeLabel) + '</span>' +
        '<span class="file-cover-icon">' + icon + '</span>' +
      '</div>' +
      '<div class="file-cover-body">' +
        '<div class="file-cover-name">' + escapeHtml(item.name || '未命名文件') + '</div>' +
        '<div class="file-cover-meta">' + escapeHtml(meta.join(' · ')) + '</div>' +
        excerptHtml +
      '</div>' +
    '</div></div>'
  );
}


function loadTextSnippet(item, container) {
  if (getItemKind(item.ext) !== 'text') return;
  var target = container.querySelector('[data-snippet-for="' + item.id + '"]');
  if (!target || target.dataset.loaded) return;
  target.dataset.loaded = '1';
  fetch(API + '/api/items/' + item.id + '/snippet')
    .then(function(r) {
      if (handleAuthResponse(r)) throw new Error('unauthorized');
      if (!r.ok) throw new Error('snippet');
      return r.json();
    })
    .then(function(data) {
      if (!target.isConnected) return;
      target.textContent = (data && data.snippet) ? data.snippet : '暂无摘要';
    })
    .catch(function() {
      if (!target.isConnected) return;
      target.textContent = '暂无摘要';
    });
}

function setImageFallback(img, fallbackUrl, onFail) {
  img.onerror = function() {
    if (fallbackUrl && !img.dataset.fallbackTried) {
      img.dataset.fallbackTried = '1';
      img.src = fallbackUrl;
      return;
    }
    if (onFail) onFail();
  };
}

function renderInspectorPreview(container, item, thumbUrl, fileUrl) {
  container.innerHTML = '';
  var itemPreviewable = isItemPreviewable(item);
  container.classList.toggle('is-actionable', itemPreviewable);
  if (itemPreviewable) {
    container.setAttribute('role', 'button');
    container.setAttribute('tabindex', '0');
    container.setAttribute('aria-label', '预览 ' + (item.name || '素材'));
  } else {
    container.removeAttribute('role');
    container.removeAttribute('tabindex');
    container.removeAttribute('aria-label');
  }
  if (!(item.hasThumbnail || isImageExt(item.ext))) {
    container.innerHTML = renderFilePlaceholder(item, true);
    if (itemPreviewable) container.insertAdjacentHTML('beforeend', '<span class="inspector-preview-hint">' + iconEye() + ' 点按预览</span>');
    return;
  }
  var img = document.createElement('img');
  img.alt = item.name || '';
  setImageFallback(img, isImageExt(item.ext) ? fileUrl : '', function() {
    container.innerHTML = renderFilePlaceholder(item, true);
  });
  img.src = thumbUrl;
  container.appendChild(img);
  if (itemPreviewable) {
    container.insertAdjacentHTML('beforeend', '<span class="inspector-preview-hint">' + iconEye() + ' 点按预览</span>');
  }
}

function formatDate(ts) {
  if (!ts) return '—';
  var d = new Date(ts);
  return isNaN(d.getTime()) ? '—' : d.toLocaleString(getLang() === 'en' ? 'en' : 'zh-CN', { dateStyle: 'short', timeStyle: 'short' });
}

function formatSize(bytes) {
  if (bytes == null || bytes === 0) return '—';
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
}

// ===== i18n =====
var I18N_DATA = {
  zh: {
    lang_name: '中',
    lang_en: 'English',
    // Sidebar
    sidebar_browse: '浏览',
    sidebar_all: '全部',
    sidebar_recent: '最近添加',
    sidebar_7d: '最近 7 天',
    sidebar_30d: '最近 30 天',
    sidebar_folders: '文件夹',
    sidebar_tags: '标签',
    // Search
    search_placeholder: '搜索名称、标签或备注',
    search_suggest: '搜索建议',
    tag_search_placeholder: '搜索标签…',
    // Sort & filter
    sort_label: '排序',
    sort_mtime: '修改时间',
    sort_btime: '创建时间',
    sort_name: '名称',
    sort_size: '大小',
    sort_ext: '格式',
    sort_desc: '降序',
    sort_asc: '升序',
    filter_label: '类型',
    filter_all: '全部',
    filter_image: '图片',
    filter_video: '视频',
    filter_document: '文档',
    filter_audio: '音频',
    filter_other: '其他',
    // Batch bar
    batch_selected: '已选 {n} 个',
    batch_total: '总大小 {s}',
    batch_type_dist: '类型分布 -',
    batch_current_view: '当前视图',
    batch_select_hint: '⌘/Ctrl+A 全选 · Shift 范围 · Esc 取消',
    batch_sel_all: '全选',
    batch_invert: '反选',
    batch_clear: '取消',
    batch_copy_links: '复制链接',
    // View buttons
    view_grid: '网格视图',
    view_list: '列表视图',
    // Theme
    theme_group_aria: '主题切换',
    theme_light: '浅色',
    theme_dark: '深色',
    // Chrome copy
    appearance_title: '外观',
    mobile_search_heading: '搜索资源库',
    // Remote status
    remote_online: '远程资源库已连接',
    remote_readonly: 'Eagle Vault · 只读挂载',
    remote_retry: '重连',
    // PWA
    pwa_new_version: '新版本已准备好',
    pwa_new_desc: '更新已在后台下载，刷新后会回到当前工作位置。',
    pwa_update_later: '稍后',
    pwa_update_now: '立即更新',
    // Update
    update_available: '新版本可用',
    // Folders sidebar
    folder_loading: '加载中…',
    // Empty states
    empty_sidebar: '选择左侧文件夹查看素材',
    // Inspector
    inspector_prev: '上一项',
    inspector_next: '下一项',
    inspector_title: '详情',
    library_title: '资料库',
    breadcrumb_location: '当前位置',
    breadcrumb_tag: '标签',
    breadcrumb_search: '搜索',
    recent_days: '最近 {n} 天',
    folder_view: '文件夹',
    tag_view: '标签',
    recent_view: '最近素材',
    search_results: '搜索结果',
    loaded_count: '已载入 {loaded}/{total}',
    item_count: '{n} 项',
    folder_count: '{n} 个文件夹',
    no_items: '暂无素材',
    filter_count: '{n} 个筛选',
    // Mobile tabbar & sheets (desktop responsive)
    mobile_tab_library: '资料库',
    mobile_tab_search: '搜索',
    mobile_tab_more: '更多',
    mobile_search_title: '移动搜索',
    mobile_search_close: '关闭搜索',
    mobile_more_settings: '远程资源库设置',
    mobile_more_install: '添加到主屏幕',
    mobile_more_install_desc: '在 iPhone Safari 点“分享”→“添加到主屏幕”，下次就像 App 一样全屏打开。',
    mobile_more_sub: '浏览、显示和外观',
    mobile_more_checking: '检查连接中…',
    // Density
    density_small: '小',
    density_medium: '中',
    density_large: '大',
    // Sync status
    sync_local: '本地',
    sync_synced: '已同步',
    sync_pending: '待同步',
    sync_syncing: '同步中…',
    sync_conflict: '合并中',
    // Canvas
    canvas_grid: '网格视图',
    canvas_list: '列表视图',
  },
  en: {
    lang_name: 'EN',
    lang_en: 'English',
    // Sidebar
    sidebar_browse: 'Browse',
    sidebar_all: 'All Items',
    sidebar_recent: 'Recent',
    sidebar_7d: 'Last 7 Days',
    sidebar_30d: 'Last 30 Days',
    sidebar_folders: 'Folders',
    sidebar_tags: 'Tags',
    // Search
    search_placeholder: 'Search name, tag or notes…',
    search_suggest: 'Search suggestions',
    tag_search_placeholder: 'Search tags…',
    // Sort & filter
    sort_label: 'Sort',
    sort_mtime: 'Date Modified',
    sort_btime: 'Date Created',
    sort_name: 'Name',
    sort_size: 'Size',
    sort_ext: 'Format',
    sort_desc: 'Descending',
    sort_asc: 'Ascending',
    filter_label: 'Type',
    filter_all: 'All',
    filter_image: 'Image',
    filter_video: 'Video',
    filter_document: 'Document',
    filter_audio: 'Audio',
    filter_other: 'Other',
    // Batch bar
    batch_selected: '{n} selected',
    batch_total: '{s} total',
    batch_type_dist: 'Types -',
    batch_current_view: 'Current view',
    batch_select_hint: '⌘/Ctrl+A Select all · Shift Range · Esc Cancel',
    batch_sel_all: 'Select All',
    batch_invert: 'Invert',
    batch_clear: 'Clear',
    batch_copy_links: 'Copy Links',
    // View buttons
    view_grid: 'Grid View',
    view_list: 'List View',
    // Theme
    theme_group_aria: 'Theme',
    theme_light: 'Light',
    theme_dark: 'Dark',
    // Chrome copy
    appearance_title: 'Appearance',
    mobile_search_heading: 'Search Vault',
    // Remote status
    remote_online: 'Remote Vault Online',
    remote_readonly: 'Eagle Vault · Read-only',
    remote_retry: 'Reconnect',
    // PWA
    pwa_new_version: 'New version ready',
    pwa_new_desc: 'Update downloaded in background. Refresh returns to your current position.',
    pwa_update_later: 'Later',
    pwa_update_now: 'Update Now',
    // Update
    update_available: 'Update available',
    // Folders sidebar
    folder_loading: 'Loading…',
    // Empty states
    empty_sidebar: 'Select a folder from the sidebar',
    // Inspector
    inspector_prev: 'Previous',
    inspector_next: 'Next',
    inspector_title: 'Details',
    library_title: 'Library',
    breadcrumb_location: 'Current location',
    breadcrumb_tag: 'Tags',
    breadcrumb_search: 'Search',
    recent_days: 'Last {n} days',
    folder_view: 'Folder',
    tag_view: 'Tag',
    recent_view: 'Recent assets',
    search_results: 'Search results',
    loaded_count: 'Loaded {loaded}/{total}',
    item_count: '{n} items',
    folder_count: '{n} folders',
    no_items: 'No assets',
    filter_count: '{n} filters',
    // Mobile tabbar & sheets (desktop responsive)
    mobile_tab_library: 'Library',
    mobile_tab_search: 'Search',
    mobile_tab_more: 'More',
    mobile_search_title: 'Mobile Search',
    mobile_search_close: 'Close Search',
    mobile_more_settings: 'Remote Vault Settings',
    mobile_more_install: 'Add to Home Screen',
    mobile_more_install_desc: 'In iPhone Safari tap Share → “Add to Home Screen” to open full-screen like an app.',
    mobile_more_sub: 'Browse, display & appearance',
    mobile_more_checking: 'Checking connection…',
    // Density
    density_small: 'Small',
    density_medium: 'Medium',
    density_large: 'Large',
    // Sync status
    sync_local: 'Local',
    sync_synced: 'Synced',
    sync_pending: 'Pending sync',
    sync_syncing: 'Syncing…',
    sync_conflict: 'Merging',
    // Canvas
    canvas_grid: 'Grid View',
    canvas_list: 'List View',
  }
};

var _lang = 'zh';

function getLang() { return _lang; }

function setLang(lang) {
  if (lang !== 'zh' && lang !== 'en') lang = 'zh';
  _lang = lang;
  try { localStorage.setItem('eagle-viewer-lang', lang); } catch (e) {}
  document.documentElement.setAttribute('lang', lang === 'en' ? 'en' : 'zh-CN');
}

function t(key) {
  var map = I18N_DATA[_lang] || I18N_DATA.zh;
  return map[key] || key;
}

function tFmt(key, params) {
  var s = t(key);
  for (var k in params) {
    s = s.replace('{' + k + '}', params[k]);
  }
  return s;
}

// Load saved language preference
try {
  var savedLang = localStorage.getItem('eagle-viewer-lang');
  if (savedLang === 'en' || savedLang === 'zh') setLang(savedLang);
} catch (e) {}
// Default to browser language preference
if (_lang === 'zh' && navigator.language && navigator.language.startsWith('en')) {
  _lang = 'en';
  try { localStorage.setItem('eagle-viewer-lang', 'en'); } catch (e) {}
  document.documentElement.setAttribute('lang', 'en');
}

// Apply i18n to static DOM elements with data-i18n attributes
function applyStaticI18n(root) {
  root = root || document;
  var els = root.querySelectorAll('[data-i18n]');
  for (var i = 0; i < els.length; i++) {
    var el = els[i];
    var key = el.getAttribute('data-i18n');
    var text = t(key);
    if (el.hasAttribute('placeholder')) {
      el.setAttribute('placeholder', text);
    } else if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
      el.setAttribute('placeholder', text);
    } else if (el.tagName === 'OPTION') {
      el.textContent = text;
    } else {
      // Preserve inner HTML for elements with bold/span children
      var hasRich = el.querySelector('b, strong, span, i, em');
      if (!hasRich) el.textContent = text;
    }
  }
  // Update aria-label attributes
  var ariaEls = root.querySelectorAll('[data-i18n-aria]');
  for (var j = 0; j < ariaEls.length; j++) {
    ariaEls[j].setAttribute('aria-label', t(ariaEls[j].getAttribute('data-i18n-aria')));
  }
  // Update title attributes
  var titleEls = root.querySelectorAll('[data-i18n-title]');
  for (var k = 0; k < titleEls.length; k++) {
    titleEls[k].setAttribute('title', t(titleEls[k].getAttribute('data-i18n-title')));
  }
  // Update language button text
  var langBtn = document.getElementById('langBtn');
  if (langBtn) langBtn.textContent = getLang() === 'zh' ? I18N_DATA.zh.lang_name : I18N_DATA.en.lang_name;
}

// Expose helpers for automated behavior tests (Node only; a no-op in the browser).
// Some helpers read EagleViewer.state / localStorage, so they are not pure functions.
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    config: EagleViewer.config,
    state: EagleViewer.state,
    getState: EagleViewer.getState,
    formatSize: formatSize,
    getItemKind: getItemKind,
    isPreviewable: isPreviewable,
    isItemPreviewable: isItemPreviewable,
    isImageExt: isImageExt,
    isVideoExt: isVideoExt,
    canCopyImage: canCopyImage,
    escapeHtml: escapeHtml,
    getLang: getLang,
    setLang: setLang,
    t: t,
    tFmt: tFmt,
    getRouteHistoryIdentity: getRouteHistoryIdentity,
    applyStateFromHash: applyStateFromHash,
    buildListQuery: buildListQuery,
    applyStaticI18n: applyStaticI18n,
  };
}
