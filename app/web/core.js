'use strict';

var EagleViewer = window.EagleViewer = window.EagleViewer || {};

var API = '';
var VERSION = '2.0.4';
var VERSION_DATE = '2026-07-24';
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
function iconBookmark() {
  return '<svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 2.5h8a1 1 0 011 1v12l-5-3-5 3v-12a1 1 0 011-1z"/></svg>';
}
function iconInfo() {
  return '<svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="9" r="6.5"/><path d="M9 8.5v4M9 5.5h.01"/></svg>';
}
function iconCommand() {
  return '<svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M6 6H4.5a2 2 0 110-4A2 2 0 016 4.5V6zm0 0v6m0-6h6m-6 6H4.5a2 2 0 100 4A2 2 0 006 13.5V12zm6-6h1.5a2 2 0 100-4A2 2 0 0012 4.5V6zm0 0v6m0 0h1.5a2 2 0 110 4A2 2 0 0112 13.5V12z"/></svg>';
}
function iconCheck() {
  return '<svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9.3l3.1 3.1L14 5.5"/></svg>';
}
function iconCompare() {
  return '<svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="5" height="12" rx="1.5"/><rect x="11" y="3" width="5" height="12" rx="1.5"/><path d="M7 6h4M7 12h4"/></svg>';
}
function iconPalette() {
  return '<svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="9" r="6.5"/><circle cx="7" cy="6.5" r="1" fill="#ef5350" stroke="none"/><circle cx="11" cy="6.5" r="1" fill="#f6b73c" stroke="none"/><circle cx="12" cy="10" r="1" fill="#4f82d9" stroke="none"/><circle cx="8" cy="11.5" r="1" fill="#55b784" stroke="none"/></svg>';
}
function iconShuffle() {
  return '<svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 5h2.2c3.8 0 4.6 8 8.3 8H15"/><path d="M12.5 10.5L15 13l-2.5 2.5M3 13h2.2c1.7 0 2.8-1.7 3.7-3.5M10.3 6.8c.9-1.1 1.9-1.8 3.2-1.8H15"/><path d="M12.5 2.5L15 5l-2.5 2.5"/></svg>';
}

// ===== Inject icons into DOM =====
function injectIcons() {
  var el;
  el = document.getElementById('menuBtn'); if (el) el.innerHTML = iconMenu();
  el = document.getElementById('searchIcon'); if (el) el.innerHTML = iconSearch();
  el = document.getElementById('viewGrid'); if (el) el.innerHTML = iconGrid();
  el = document.getElementById('viewJustified'); if (el) el.innerHTML = iconJustified();
  el = document.getElementById('viewList'); if (el) el.innerHTML = iconList();
  el = document.getElementById('filterPanelBtn'); if (el) el.innerHTML = iconSliders();
  el = document.getElementById('savedViewsBtn'); if (el) el.innerHTML = iconBookmark();
  el = document.getElementById('statsBtn'); if (el) el.innerHTML = iconInfo();
  el = document.getElementById('duplicatesBtn'); if (el) el.innerHTML = iconCollection();
  el = document.getElementById('commandBtn'); if (el) el.innerHTML = iconCommand();
  el = document.getElementById('inspectorPrev'); if (el) el.innerHTML = iconChevronLeft();
  el = document.getElementById('inspectorNext'); if (el) el.innerHTML = iconChevronRightSm();
  el = document.getElementById('exportListBtn'); if (el) el.innerHTML = iconExport();
  el = document.getElementById('inspectorClose'); if (el) el.innerHTML = iconClose();
  el = document.getElementById('iconAllItems'); if (el) el.innerHTML = iconCollection();
  el = document.getElementById('iconFavoriteItems'); if (el) el.innerHTML = iconBookmark();
  el = document.getElementById('iconLaterItems'); if (el) el.innerHTML = iconClock();
  el = document.getElementById('iconDoneItems'); if (el) el.innerHTML = iconCheck();
  el = document.getElementById('iconRecentViewedItems'); if (el) el.innerHTML = iconEye();
  el = document.getElementById('iconSidebarDuplicates'); if (el) el.innerHTML = iconCollection();
  el = document.getElementById('iconSidebarColors'); if (el) el.innerHTML = iconPalette();
  el = document.getElementById('iconSidebarRandom'); if (el) el.innerHTML = iconShuffle();
  el = document.getElementById('iconSidebarSavedViews'); if (el) el.innerHTML = iconBookmark();
  el = document.getElementById('iconMobileLibrary'); if (el) el.innerHTML = iconCollection();
  el = document.getElementById('iconMobileFavorite'); if (el) el.innerHTML = iconBookmark();
  el = document.getElementById('iconMobileLater'); if (el) el.innerHTML = iconClock();
  el = document.getElementById('iconMobileSearch'); if (el) el.innerHTML = iconSearch();
  el = document.getElementById('iconMobileSearchSheet'); if (el) el.innerHTML = iconSearch();
  el = document.getElementById('iconMobileMore'); if (el) el.innerHTML = iconMenu();
  el = document.getElementById('iconMobileMoreSidebar'); if (el) el.innerHTML = iconMenu();
  el = document.getElementById('iconMobileMoreEagleSmart'); if (el) el.innerHTML = iconSliders();
  el = document.getElementById('iconMobileMoreSmart'); if (el) el.innerHTML = iconSliders();
  el = document.getElementById('iconMobileMoreReview'); if (el) el.innerHTML = iconEye();
  el = document.getElementById('iconMobileMoreViewed'); if (el) el.innerHTML = iconEye();
  el = document.getElementById('iconMobileMoreFilter'); if (el) el.innerHTML = iconSliders();
  el = document.getElementById('iconMobileMoreShareView'); if (el) el.innerHTML = iconExternalLink();
  el = document.getElementById('iconMobileMoreDuplicates'); if (el) el.innerHTML = iconCollection();
  el = document.getElementById('iconMobileMoreColors'); if (el) el.innerHTML = iconPalette();
  el = document.getElementById('iconMobileMoreRandom'); if (el) el.innerHTML = iconShuffle();
  el = document.getElementById('iconMobileMoreStats'); if (el) el.innerHTML = iconInfo();
  el = document.getElementById('iconMobileMoreCommand'); if (el) el.innerHTML = iconCommand();
  el = document.getElementById('iconMobileMoreOffline'); if (el) el.innerHTML = iconDownload();
  el = document.getElementById('iconMobileMoreRefresh'); if (el) el.innerHTML = iconRefresh();
  el = document.getElementById('iconMobileMoreTheme'); if (el) el.innerHTML = iconMoon();
  el = document.getElementById('iconRecent7'); if (el) el.innerHTML = iconClock();
  el = document.getElementById('iconRecent30'); if (el) el.innerHTML = iconClock();
  el = document.getElementById('emptyIcon'); if (el) el.innerHTML = iconFolderOutline();
  el = document.getElementById('returnCurrentIcon'); if (el) el.innerHTML = iconEye();
  el = document.getElementById('installCoachClose'); if (el) el.innerHTML = iconClose();
  el = document.getElementById('iconBatchOutputLinks'); if (el) el.innerHTML = iconExternalLink();
  el = document.getElementById('iconBatchOutputInfo'); if (el) el.innerHTML = iconInfo();
  el = document.getElementById('iconBatchOutputRefs'); if (el) el.innerHTML = iconCopy();
  el = document.getElementById('iconBatchOutputCsv'); if (el) el.innerHTML = iconExport();
  el = document.getElementById('iconBatchOutputJson'); if (el) el.innerHTML = iconSliders();
  el = document.getElementById('iconBatchOutputDownload'); if (el) el.innerHTML = iconDownload();
  el = document.getElementById('sidebarToggle');
  if (el) el.innerHTML = iconChevronLeft();
}

// ===== State =====
var treeData = [];
var tagData = [];
var eagleSmartFolders = [];
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
var currentSmartViewName = '';
var currentEagleSmartFolderId = '';
var currentRandomSeed = '';
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
var advancedFilters = {};
var savedViews = [];
var collectionIds = { favorite: [], later: [], done: [], recentViewed: [], items: {} };
var itemRatings = {};
var viewerNotes = {};
var reviewMarkers = {};
var indexStats = null;
var duplicateGroups = [];
var paletteAtlas = null;
var viewerStateRevision = 0;
var INCREMENTAL_PAGE_SIZE = 120;
var LAST_ROUTE_STORAGE_KEY = 'eagle-viewer-last-route';
var LAST_ROUTE_MAX_AGE_MS = 14 * 24 * 60 * 60 * 1000;
var routeHistoryInitialized = false;
var routeHistorySuspended = 0;
var URL_FILTER_KEYS = [
  'min_size', 'max_size', 'min_width', 'min_height', 'mtime_from', 'mtime_to',
  'shape', 'tag_state', 'annotation_state', 'viewer_note_state', 'source_state',
  'source_domain', 'ext', 'rating_min', 'color', 'color_tolerance'
];
var NUMERIC_FILTER_KEYS = ['min_size', 'max_size', 'min_width', 'min_height', 'mtime_from', 'mtime_to', 'rating_min', 'color_tolerance'];

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
  eagleSmartFolders: { get: function() { return eagleSmartFolders; }, set: function(v) { eagleSmartFolders = Array.isArray(v) ? v : []; }, enumerable: true },
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
  currentSmartViewName: { get: function() { return currentSmartViewName; }, set: function(v) { currentSmartViewName = v || ''; }, enumerable: true },
  currentEagleSmartFolderId: { get: function() { return currentEagleSmartFolderId; }, set: function(v) { currentEagleSmartFolderId = v || ''; }, enumerable: true },
  currentRandomSeed: { get: function() { return currentRandomSeed; }, set: function(v) { currentRandomSeed = v || ''; }, enumerable: true },
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
  advancedFilters: { get: function() { return advancedFilters; }, set: function(v) { advancedFilters = v || {}; }, enumerable: true },
  savedViews: { get: function() { return savedViews; }, set: function(v) { savedViews = v || []; }, enumerable: true },
  collectionIds: { get: function() { return collectionIds; }, set: function(v) { collectionIds = v || { favorite: [], later: [], done: [], recentViewed: [], items: {} }; }, enumerable: true },
  itemRatings: { get: function() { return itemRatings; }, set: function(v) { itemRatings = v && typeof v === 'object' ? v : {}; }, enumerable: true },
  viewerNotes: { get: function() { return viewerNotes; }, set: function(v) { viewerNotes = v && typeof v === 'object' ? v : {}; }, enumerable: true },
  reviewMarkers: { get: function() { return reviewMarkers; }, set: function(v) { reviewMarkers = v && typeof v === 'object' ? v : {}; }, enumerable: true },
  indexStats: { get: function() { return indexStats; }, set: function(v) { indexStats = v; }, enumerable: true },
  duplicateGroups: { get: function() { return duplicateGroups; }, set: function(v) { duplicateGroups = v || []; }, enumerable: true },
  paletteAtlas: { get: function() { return paletteAtlas; }, set: function(v) { paletteAtlas = v || null; }, enumerable: true },
  viewerStateRevision: { get: function() { return viewerStateRevision; }, set: function(v) { viewerStateRevision = Number(v) || 0; }, enumerable: true }
});
EagleViewer.getState = function() {
  return EagleViewer.state;
};

function buildListQuery() {
  var params = new URLSearchParams();
  params.set('sort', listSort);
  params.set('dir', listDir);
  params.set('type', listType);
  Object.keys(advancedFilters || {}).forEach(function(key) {
    if (key === 'rating_min' || key === 'viewer_note_state') return;
    var val = advancedFilters[key];
    if (val !== null && val !== undefined && val !== '') params.set(key, val);
  });
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
  if (currentView === 'smart' && currentSmartViewName) params.set('smart', currentSmartViewName);
  if (currentView === 'eagle-smart' && currentEagleSmartFolderId) params.set('eagleSmart', currentEagleSmartFolderId);
  if (currentView === 'random' && currentRandomSeed) params.set('seed', currentRandomSeed);
  URL_FILTER_KEYS.forEach(function(key) {
    var val = (advancedFilters || {})[key];
    if (val !== null && val !== undefined && val !== '') params.set(key, val);
  });
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
  else if (view === 'smart') identity.push(params.get('smart') || '');
  else if (view === 'eagle-smart') identity.push(params.get('eagleSmart') || '');
  else if (view === 'random') identity.push(params.get('seed') || '');
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
  currentSmartViewName = params.get('smart') || '';
  currentEagleSmartFolderId = params.get('eagleSmart') || '';
  currentRandomSeed = params.get('seed') || '';
  pendingItemId = params.get('item') || '';
  pendingLaunchAction = params.get('action') || '';
  recentDays = parseInt(params.get('days'), 10) || 7;
  searchQuery = params.get('q') || '';
  advancedFilters = {};
  URL_FILTER_KEYS.forEach(function(key) {
    if (!params.has(key)) return;
    var val = params.get(key);
    if (NUMERIC_FILTER_KEYS.indexOf(key) >= 0) {
      var num = parseInt(val, 10);
      if (!isNaN(num)) advancedFilters[key] = num;
    } else if (val) {
      advancedFilters[key] = val;
    }
  });
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
  return isNaN(d.getTime()) ? '—' : d.toLocaleString('zh-CN', { dateStyle: 'short', timeStyle: 'short' });
}

function formatSize(bytes) {
  if (bytes == null || bytes === 0) return '—';
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
}
