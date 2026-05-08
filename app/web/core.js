'use strict';

var EagleViewer = window.EagleViewer = window.EagleViewer || {};

var API = '';
var VERSION = '1.5.1';
var VERSION_DATE = '2026-05-08';
var PREVIEW_IMAGE_EXTS = ['jpg','jpeg','png','gif','webp','svg','bmp'];
var PREVIEW_VIDEO_EXTS = ['mp4','webm','mov','m4v'];
var PREVIEW_DOCUMENT_EXTS = ['pdf','txt'];
var COPY_IMAGE_EXTS = ['jpg','jpeg','png','gif','webp','bmp'];

// ===== SVG Icons =====
function iconFolder() {
  return '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M2 4.5C2 3.67 2.67 3 3.5 3H6l1.5 1.5H12.5c.83 0 1.5.67 1.5 1.5v6c0 .83-.67 1.5-1.5 1.5h-9C2.67 13.5 2 12.83 2 12V4.5z"/></svg>';
}
function iconFolderLarge() {
  return '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7c0-1.1.9-2 2-2h4l2 2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V7z"/></svg>';
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

// ===== Inject icons into DOM =====
function injectIcons() {
  var el;
  el = document.getElementById('menuBtn'); if (el) el.innerHTML = iconMenu();
  el = document.getElementById('searchIcon'); if (el) el.innerHTML = iconSearch();
  el = document.getElementById('viewGrid'); if (el) el.innerHTML = iconGrid();
  el = document.getElementById('viewList'); if (el) el.innerHTML = iconList();
  el = document.getElementById('reloadLibraryBtn'); if (el) el.innerHTML = iconRefresh();
  el = document.getElementById('themeToggle'); if (el) el.innerHTML = iconSun();
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
  el = document.getElementById('iconRecent7'); if (el) el.innerHTML = iconClock();
  el = document.getElementById('iconRecent30'); if (el) el.innerHTML = iconClock();
  el = document.getElementById('emptyIcon'); if (el) el.innerHTML = iconFolderOutline();
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
var currentFolderId = null;
var currentTagName = null;
var currentView = 'all';
var recentDays = 7;
var searchQuery = '';
var listSort = 'mtime';
var listDir = 'desc';
var listType = 'all';
var inspectorItem = null;
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
var collectionIds = { favorite: [], later: [], items: {} };
var indexStats = null;
var duplicateGroups = [];
var INCREMENTAL_PAGE_SIZE = 120;

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
  currentFolderId: { get: function() { return currentFolderId; }, set: function(v) { currentFolderId = v; }, enumerable: true },
  currentTagName: { get: function() { return currentTagName; }, set: function(v) { currentTagName = v; }, enumerable: true },
  currentView: { get: function() { return currentView; }, set: function(v) { currentView = v; }, enumerable: true },
  recentDays: { get: function() { return recentDays; }, set: function(v) { recentDays = v; }, enumerable: true },
  searchQuery: { get: function() { return searchQuery; }, set: function(v) { searchQuery = v; }, enumerable: true },
  listSort: { get: function() { return listSort; }, set: function(v) { listSort = v; }, enumerable: true },
  listDir: { get: function() { return listDir; }, set: function(v) { listDir = v; }, enumerable: true },
  listType: { get: function() { return listType; }, set: function(v) { listType = v; }, enumerable: true },
  inspectorItem: { get: function() { return inspectorItem; }, set: function(v) { inspectorItem = v; }, enumerable: true },
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
  collectionIds: { get: function() { return collectionIds; }, set: function(v) { collectionIds = v || { favorite: [], later: [] }; }, enumerable: true },
  indexStats: { get: function() { return indexStats; }, set: function(v) { indexStats = v; }, enumerable: true },
  duplicateGroups: { get: function() { return duplicateGroups; }, set: function(v) { duplicateGroups = v || []; }, enumerable: true }
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
  var hash = '#' + params.toString();
  if (location.hash !== hash) location.replace(location.pathname + location.search + hash);
}

function applyStateFromUrl() {
  var hash = location.hash.slice(1);
  if (!hash) return false;
  var params = new URLSearchParams(hash);
  var view = params.get('view') || 'all';
  currentView = view;
  listSort = params.get('sort') || 'mtime';
  listDir = params.get('dir') || 'desc';
  listType = params.get('type') || 'all';
  currentFolderId = params.get('id') || null;
  currentTagName = params.get('tag') || null;
  recentDays = parseInt(params.get('days'), 10) || 7;
  searchQuery = params.get('q') || '';
  return true;
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
  return PREVIEW_IMAGE_EXTS.indexOf(e) >= 0 || PREVIEW_VIDEO_EXTS.indexOf(e) >= 0 || PREVIEW_DOCUMENT_EXTS.indexOf(e) >= 0;
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
  if (e === 'pdf') return 'pdf';
  if (e === 'txt') return 'text';
  if (['doc','docx','xls','xlsx','ppt','pptx','psd','ai','sketch','fig','xd'].indexOf(e) >= 0) return 'document';
  return 'other';
}

function renderFilePlaceholder(item, large) {
  var kind = getItemKind(item.ext);
  var kindClass = (kind === 'pdf' || kind === 'text' || kind === 'document') ? kind : 'other';
  var typeLabel = (item.ext || kind || 'file').toUpperCase();
  var meta = [];
  if (item.width && item.height) meta.push(item.width + ' × ' + item.height);
  if (item.size) meta.push(formatSize(item.size));
  if (!meta.length) meta.push(kind === 'pdf' ? 'PDF 文档' : kind === 'text' ? '文本文件' : kind === 'document' ? '文档文件' : '文件预览');
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
  if (!(item.hasThumbnail || isImageExt(item.ext))) {
    container.innerHTML = renderFilePlaceholder(item, true);
    return;
  }
  var img = document.createElement('img');
  img.alt = item.name || '';
  setImageFallback(img, isImageExt(item.ext) ? fileUrl : '', function() {
    container.innerHTML = renderFilePlaceholder(item, true);
  });
  img.src = thumbUrl;
  container.appendChild(img);
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
