'use strict';

var state = EagleViewer.state;
var api = EagleViewer.modules.api;
var render = EagleViewer.modules.render;
var interactionModule = EagleViewer.modules.interactions = EagleViewer.modules.interactions || {};
var canvasPrefs = { fit: 'cover', names: true, meta: true, badges: true, markers: true };
var canvasPrefsDevice = '';

function getCanvasDevice() {
  return window.innerWidth <= 768 ? 'mobile' : 'desktop';
}

function getCanvasPrefsStorageKey() {
  return 'eagle-viewer-canvas-prefs-' + getCanvasDevice();
}

function getDensityStorageKey() {
  return 'eagle-viewer-grid-density-' + getCanvasDevice();
}

function normalizeCanvasPrefs(value) {
  var raw = value && typeof value === 'object' ? value : {};
  return {
    fit: raw.fit === 'contain' ? 'contain' : 'cover',
    names: raw.names !== false,
    meta: raw.meta !== false,
    badges: raw.badges !== false,
    markers: raw.markers !== false
  };
}

function syncCanvasSettings() {
  var panel = document.getElementById('canvasSettingsPanel');
  if (!panel) return;
  panel.querySelectorAll('[data-canvas-layout]').forEach(function(btn) {
    var active = btn.dataset.canvasLayout === state.viewMode;
    btn.classList.toggle('active', active);
    btn.setAttribute('aria-pressed', active ? 'true' : 'false');
  });
  panel.querySelectorAll('[data-canvas-fit]').forEach(function(btn) {
    var active = btn.dataset.canvasFit === canvasPrefs.fit;
    btn.classList.toggle('active', active);
    btn.setAttribute('aria-pressed', active ? 'true' : 'false');
  });
  panel.querySelectorAll('[data-canvas-pref]').forEach(function(input) {
    input.checked = canvasPrefs[input.dataset.canvasPref] !== false;
  });
  var mainDensity = document.getElementById('gridDensityRange');
  var panelDensity = document.getElementById('canvasDensityRange');
  var densityValue = mainDensity ? mainDensity.value : '164';
  if (panelDensity) panelDensity.value = densityValue;
  var output = document.getElementById('canvasDensityValue');
  if (output) output.value = densityValue;
  var device = document.getElementById('canvasSettingsDevice');
  if (device) device.textContent = getCanvasDevice() === 'mobile' ? 'iPhone / 移动设备' : '桌面浏览器';
}

function applyCanvasPrefs(refreshLayout) {
  var body = document.body;
  if (!body) return;
  body.classList.toggle('canvas-fit-contain', canvasPrefs.fit === 'contain');
  body.classList.toggle('canvas-hide-names', !canvasPrefs.names);
  body.classList.toggle('canvas-hide-meta', !canvasPrefs.meta);
  body.classList.toggle('canvas-hide-badges', !canvasPrefs.badges);
  body.classList.toggle('canvas-hide-markers', !canvasPrefs.markers);
  syncCanvasSettings();
  if (refreshLayout !== false && render && render.refreshMasonryLayout) requestAnimationFrame(render.refreshMasonryLayout);
}

function saveCanvasPrefs() {
  try { localStorage.setItem(getCanvasPrefsStorageKey(), JSON.stringify(canvasPrefs)); } catch (e) {}
}

function loadCanvasPrefs() {
  canvasPrefsDevice = getCanvasDevice();
  var stored = null;
  try { stored = JSON.parse(localStorage.getItem(getCanvasPrefsStorageKey()) || 'null'); } catch (e) {}
  canvasPrefs = normalizeCanvasPrefs(stored);
  var density = document.getElementById('gridDensityRange');
  var savedDensity = null;
  try { savedDensity = localStorage.getItem(getDensityStorageKey()) || localStorage.getItem('eagle-viewer-grid-density'); } catch (e2) {}
  if (density) density.value = savedDensity || '164';
  applyCanvasPrefs(false);
}

function setCanvasDensity(value) {
  var density = document.getElementById('gridDensityRange');
  var normalized = String(Math.max(116, Math.min(260, Number(value) || 164)));
  if (density) density.value = normalized;
  try { localStorage.setItem(getDensityStorageKey(), normalized); } catch (e) {}
  syncCanvasSettings();
  if (render && render.refreshMasonryLayout) render.refreshMasonryLayout();
}

// ===== Export =====
function buildExportRows(items) {
  return items.map(function(it) {
    var paths = (it.folderPaths || []).join(' ; ');
    return { name: it.name, path: paths, tags: (it.tags || []).join(','), sourceDomain: it.sourceDomain || '', ext: it.ext || '', size: it.size || 0, btime: it.btime, mtime: it.mtime };
  });
}

function exportRows(rows, format, filenameBase) {
  if (!rows.length) { alert('当前列表为空'); return; }
  var blob, name;
  if (format === 'json') {
    blob = new Blob([JSON.stringify(rows, null, 2)], { type: 'application/json' });
    name = filenameBase + '.json';
  } else {
    var BOM = '\uFEFF';
    var header = '名称,路径,标签,来源站点,格式,大小,创建时间,修改时间\n';
    var body = rows.map(function(r) {
      return '"' + (r.name || '').replace(/"/g, '""') + '","' + (r.path || '').replace(/"/g, '""') + '","' + (r.tags || '').replace(/"/g, '""') + '","' + (r.sourceDomain || '').replace(/"/g, '""') + '","' + (r.ext || '') + '",' + (r.size || 0) + ',"' + (r.btime ? new Date(r.btime).toISOString() : '') + '","' + (r.mtime ? new Date(r.mtime).toISOString() : '') + '"';
    }).join('\n');
    blob = new Blob([BOM + header + body], { type: 'text/csv;charset=utf-8' });
    name = filenameBase + '.csv';
  }
  var a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  URL.revokeObjectURL(a.href);
}

function exportList(format) {
  var items = state.currentView === 'duplicates'
    ? state.duplicateGroups.reduce(function(out, group) { return out.concat(group.items || []); }, [])
    : state.currentItems;
  exportRows(buildExportRows(items), format, 'eagle-list');
}

function exportSelected(format) {
  var items = getSelectedItems();
  if (!items.length) { alert('当前没有已选文件'); return; }
  exportRows(buildExportRows(items), format, 'eagle-selected');
}

// ===== Marquee selection =====
var isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

function showToast(message, tone) {
  var stack = document.getElementById('toastStack');
  if (!stack || !message) return;
  var toast = document.createElement('div');
  toast.className = 'toast' + (tone ? ' ' + tone : '');
  toast.innerHTML = '<span></span><strong>' + escapeHtml(message) + '</strong>';
  stack.appendChild(toast);
  requestAnimationFrame(function() { toast.classList.add('show'); });
  setTimeout(function() {
    toast.classList.remove('show');
    setTimeout(function() {
      if (toast.parentNode) toast.parentNode.removeChild(toast);
    }, 220);
  }, tone === 'error' ? 3400 : 2200);
}
window.showToast = showToast;

function rectsOverlap(a, b) {
  return !(a.right < b.left || a.left > b.right || a.bottom < b.top || a.top > b.bottom);
}

function setupMarquee(wrap, getTargets) {
  if (isTouchDevice) return;
  var overlay = null;
  var startX = 0, startY = 0;
  var dragStarted = false;
  var DRAG_THRESHOLD = 6;
  function onMouseDown(e) {
    if (e.button !== 0) return;
    if (e.target.closest('input, a, button, .folder-card')) return;
    if (!wrap.contains(e.target)) return;
    startX = e.clientX;
    startY = e.clientY;
    dragStarted = false;
    overlay = document.createElement('div');
    overlay.className = 'marquee';
    overlay.style.left = startX + 'px';
    overlay.style.top = startY + 'px';
    overlay.style.width = '0';
    overlay.style.height = '0';
    document.body.appendChild(overlay);
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  }
  function onMouseMove(e) {
    var x = Math.min(startX, e.clientX);
    var y = Math.min(startY, e.clientY);
    var w = Math.abs(e.clientX - startX);
    var h = Math.abs(e.clientY - startY);
    if (!dragStarted && Math.max(w, h) < DRAG_THRESHOLD) return;
    dragStarted = true;
    overlay.style.left = x + 'px';
    overlay.style.top = y + 'px';
    overlay.style.width = w + 'px';
    overlay.style.height = h + 'px';
  }
  function onMouseUp() {
    if (dragStarted) {
      var rect = overlay.getBoundingClientRect();
      var targets = getTargets();
      for (var i = 0; i < targets.length; i++) {
        if (targets[i].id && rectsOverlap(rect, targets[i].element.getBoundingClientRect())) {
          state.selectedIds.add(targets[i].id);
          state.lastSelectedId = targets[i].id;
        }
      }
      updateBatchBar();
      updateCheckboxesInView();
    }
    overlay.remove();
    overlay = null;
    dragStarted = false;
    document.removeEventListener('mousemove', onMouseMove);
    document.removeEventListener('mouseup', onMouseUp);
  }
  wrap.addEventListener('mousedown', onMouseDown);
}

function setupGridMarquee(wrap, grid) {
  setupMarquee(wrap, function() {
    return Array.prototype.map.call(grid.querySelectorAll('.card .item-cb'), function(cb) {
      var card = cb.closest('.card');
      return card && cb.dataset.id ? { element: card, id: cb.dataset.id } : null;
    }).filter(Boolean);
  });
}

function setupListMarquee(wrap) {
  var listWrap = wrap.querySelector('.list-wrap');
  if (!listWrap) return;
  setupMarquee(wrap, function() {
    return Array.prototype.map.call(listWrap.querySelectorAll('tbody tr:not(.folder-row)'), function(tr) {
      var cb = tr.querySelector('.item-cb');
      return cb && cb.dataset.id ? { element: tr, id: cb.dataset.id } : null;
    }).filter(Boolean);
  });
}

// ===== Theme =====
function setTheme(theme) {
  theme = theme === 'light' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', theme);
  document.documentElement.style.colorScheme = theme;
  var themeBtn = document.getElementById('themeToggle');
  var nextThemeLabel = theme === 'dark' ? '切换到浅色主题' : '切换到深色主题';
  if (themeBtn) {
    themeBtn.innerHTML = theme === 'dark' ? iconSun() : iconMoon();
    themeBtn.title = nextThemeLabel;
    themeBtn.setAttribute('aria-label', nextThemeLabel);
    themeBtn.dataset.theme = theme;
  }
  var mobileThemeIcon = document.getElementById('iconMobileMoreTheme');
  if (mobileThemeIcon) mobileThemeIcon.innerHTML = theme === 'dark' ? iconSun() : iconMoon();
  var mobileThemeButton = mobileThemeIcon && mobileThemeIcon.closest('[data-mobile-more-action="theme"]');
  if (mobileThemeButton) {
    var mobileThemeCopy = mobileThemeButton.querySelector('small');
    if (mobileThemeCopy) mobileThemeCopy.textContent = nextThemeLabel.replace('主题', '');
    mobileThemeButton.setAttribute('aria-label', nextThemeLabel);
  }
  var themeMeta = document.querySelector('meta[name="theme-color"]');
  if (themeMeta) themeMeta.content = theme === 'dark' ? '#191a1d' : '#f4f4f1';
  try { localStorage.setItem('eagle-viewer-theme', theme); } catch (e) {}
}

// ===== Local app data =====
var viewerStateSaveTimer = null;
var viewerStateSaveInFlight = false;
var viewerStateMutationVersion = 0;
var VIEWER_STATE_BASELINE_KEY = 'eagle-viewer-state-baseline';
var VIEWER_STATE_PENDING_KEY = 'eagle-viewer-state-pending';

function cloneJson(value, fallback) {
  try { return JSON.parse(JSON.stringify(value)); } catch (e) { return fallback; }
}

function getViewerStateSnapshot() {
  return {
    revision: state.viewerStateRevision || 0,
    savedViews: cloneJson(state.savedViews || [], []),
    collections: {
      favorite: (state.collectionIds.favorite || []).slice(),
      later: (state.collectionIds.later || []).slice(),
      done: (state.collectionIds.done || []).slice(),
      recentViewed: (state.collectionIds.recentViewed || []).slice()
    },
    ratings: cloneJson(state.itemRatings || {}, {}),
    notes: cloneJson(state.viewerNotes || {}, {}),
    reviewMarkers: cloneJson(state.reviewMarkers || {}, {}),
    workspaces: cloneJson(state.workspaces || [], [])
  };
}

function readStoredViewerState(key) {
  try {
    var value = JSON.parse(localStorage.getItem(key) || 'null');
    return value && typeof value === 'object' ? value : null;
  } catch (e) { return null; }
}

function persistViewerStateBaseline(value) {
  try { localStorage.setItem(VIEWER_STATE_BASELINE_KEY, JSON.stringify(value)); } catch (e) {}
}

function persistPendingViewerState() {
  var pending = { savedAt: Date.now(), state: getViewerStateSnapshot() };
  try { localStorage.setItem(VIEWER_STATE_PENDING_KEY, JSON.stringify(pending)); } catch (e) {}
  return pending;
}

function clearPendingViewerState() {
  try { localStorage.removeItem(VIEWER_STATE_PENDING_KEY); } catch (e) {}
}

function sameJson(left, right) {
  return JSON.stringify(left === undefined ? null : left) === JSON.stringify(right === undefined ? null : right);
}

function mergeIdList(remoteList, localList, baselineList) {
  var remote = uniqueIdList(remoteList);
  var local = uniqueIdList(localList);
  var baseline = uniqueIdList(baselineList);
  var result = remote.slice();
  var candidates = baseline.concat(local).filter(function(id, index, all) { return all.indexOf(id) === index; });
  candidates.forEach(function(id) {
    var locallyPresent = local.indexOf(id) >= 0;
    var baselinePresent = baseline.indexOf(id) >= 0;
    if (locallyPresent === baselinePresent) return;
    var resultIndex = result.indexOf(id);
    if (locallyPresent && resultIndex < 0) result.push(id);
    if (!locallyPresent && resultIndex >= 0) result.splice(resultIndex, 1);
  });
  return result.slice(0, 500);
}

function mergeObjectMap(remoteValue, localValue, baselineValue) {
  var remote = cloneJson(remoteValue || {}, {});
  var local = localValue || {};
  var baseline = baselineValue || {};
  Object.keys(baseline).concat(Object.keys(local)).filter(function(key, index, all) { return all.indexOf(key) === index; }).forEach(function(key) {
    if (sameJson(local[key], baseline[key])) return;
    if (Object.prototype.hasOwnProperty.call(local, key)) remote[key] = cloneJson(local[key], local[key]);
    else delete remote[key];
  });
  return remote;
}

function mergeKeyedArray(remoteValue, localValue, baselineValue, keyName) {
  var remote = Array.isArray(remoteValue) ? cloneJson(remoteValue, []) : [];
  var local = Array.isArray(localValue) ? localValue : [];
  var baseline = Array.isArray(baselineValue) ? baselineValue : [];
  var remoteByKey = {};
  var localByKey = {};
  var baselineByKey = {};
  remote.forEach(function(entry) { if (entry && entry[keyName]) remoteByKey[entry[keyName]] = entry; });
  local.forEach(function(entry) { if (entry && entry[keyName]) localByKey[entry[keyName]] = entry; });
  baseline.forEach(function(entry) { if (entry && entry[keyName]) baselineByKey[entry[keyName]] = entry; });
  Object.keys(baselineByKey).concat(Object.keys(localByKey)).filter(function(key, index, all) { return all.indexOf(key) === index; }).forEach(function(key) {
    if (sameJson(localByKey[key], baselineByKey[key])) return;
    if (localByKey[key]) remoteByKey[key] = cloneJson(localByKey[key], localByKey[key]);
    else delete remoteByKey[key];
  });
  var order = remote.map(function(entry) { return entry && entry[keyName]; }).filter(Boolean);
  local.forEach(function(entry) { if (entry && entry[keyName] && order.indexOf(entry[keyName]) < 0) order.push(entry[keyName]); });
  return order.filter(function(key) { return remoteByKey[key]; }).map(function(key) { return remoteByKey[key]; });
}

function mergeWorkspaces(remoteValue, localValue, baselineValue) {
  var merged = mergeKeyedArray(remoteValue, localValue, baselineValue, 'id');
  var remoteById = {};
  var localById = {};
  var baselineById = {};
  (remoteValue || []).forEach(function(entry) { if (entry && entry.id) remoteById[entry.id] = entry; });
  (localValue || []).forEach(function(entry) { if (entry && entry.id) localById[entry.id] = entry; });
  (baselineValue || []).forEach(function(entry) { if (entry && entry.id) baselineById[entry.id] = entry; });
  return merged.map(function(workspace) {
    var local = localById[workspace.id];
    var baseline = baselineById[workspace.id];
    var remote = remoteById[workspace.id];
    if (!local || !baseline || !remote) return workspace;
    var out = cloneJson(remote, workspace);
    ['name', 'color', 'createdAt'].forEach(function(key) {
      if (!sameJson(local[key], baseline[key])) out[key] = local[key];
    });
    out.itemIds = mergeIdList(remote.itemIds, local.itemIds, baseline.itemIds);
    out.updatedAt = Math.max(Number(remote.updatedAt) || 0, Number(local.updatedAt) || 0);
    return out;
  });
}

function mergeReviewMarkers(remoteValue, localValue, baselineValue) {
  var remote = remoteValue || {};
  var local = localValue || {};
  var baseline = baselineValue || {};
  var out = {};
  Object.keys(remote).concat(Object.keys(local), Object.keys(baseline)).filter(function(itemId, index, all) {
    return all.indexOf(itemId) === index;
  }).forEach(function(itemId) {
    var merged = mergeKeyedArray(remote[itemId], local[itemId], baseline[itemId], 'id');
    if (merged.length) out[itemId] = merged;
  });
  return normalizeReviewMarkers(out);
}

function mergePendingViewerState(remoteState, localState, baselineState) {
  var remote = remoteState || {};
  var local = localState || {};
  var baseline = baselineState || { savedViews: [], collections: {}, ratings: {}, notes: {}, reviewMarkers: {}, workspaces: [] };
  var remoteCollections = remote.collections || {};
  var localCollections = local.collections || {};
  var baselineCollections = baseline.collections || {};
  return {
    revision: remote.revision || 0,
    savedViews: mergeKeyedArray(remote.savedViews, local.savedViews, baseline.savedViews, 'name'),
    collections: {
      favorite: mergeIdList(remoteCollections.favorite, localCollections.favorite, baselineCollections.favorite),
      later: mergeIdList(remoteCollections.later, localCollections.later, baselineCollections.later),
      done: mergeIdList(remoteCollections.done, localCollections.done, baselineCollections.done),
      recentViewed: mergeIdList(remoteCollections.recentViewed, localCollections.recentViewed, baselineCollections.recentViewed)
    },
    ratings: mergeObjectMap(remote.ratings, local.ratings, baseline.ratings),
    notes: mergeObjectMap(remote.notes, local.notes, baseline.notes),
    reviewMarkers: mergeReviewMarkers(remote.reviewMarkers, local.reviewMarkers, baseline.reviewMarkers),
    workspaces: mergeWorkspaces(remote.workspaces, local.workspaces, baseline.workspaces)
  };
}

function setSyncStatus(status, label) {
  var el = document.getElementById('syncStatus');
  if (!el) return;
  el.dataset.state = status;
  el.textContent = label;
  var remoteCard = document.getElementById('mobileRemoteCard');
  if (remoteCard) {
    var title = document.getElementById('mobileRemoteTitle');
    updateMobileRemoteCard(remoteCard.dataset.state || 'checking', title ? title.textContent : '远程 Vault');
  }
}

function applyRemoteViewerState(remoteState, options) {
  var opts = options || {};
  state.viewerStateRevision = remoteState.revision || 0;
  state.savedViews = remoteState.savedViews || [];
  state.itemRatings = normalizeRatingsMap(remoteState.ratings);
  state.viewerNotes = normalizeViewerNotes(remoteState.notes);
  state.reviewMarkers = normalizeReviewMarkers(remoteState.reviewMarkers);
  state.workspaces = normalizeWorkspaces(remoteState.workspaces);
  state.collectionIds = remoteState.collections || { favorite: [], later: [], done: [], recentViewed: [] };
  state.collectionIds.favorite = state.collectionIds.favorite || [];
  state.collectionIds.later = state.collectionIds.later || [];
  state.collectionIds.done = state.collectionIds.done || [];
  state.collectionIds.recentViewed = state.collectionIds.recentViewed || [];
  state.collectionIds.items = state.collectionIds.items || {};
  saveLocalData(false);
  if (opts.updateBaseline !== false) persistViewerStateBaseline(getViewerStateSnapshot());
  renderSmartViewsSidebar();
  renderWorkspaceSidebar();
}

function hasViewerState() {
  return state.savedViews.length || state.workspaces.length || Object.keys(state.itemRatings || {}).length || Object.keys(state.viewerNotes || {}).length || Object.keys(state.reviewMarkers || {}).length || state.collectionIds.favorite.length || state.collectionIds.later.length || (state.collectionIds.done || []).length || (state.collectionIds.recentViewed || []).length;
}

function normalizeRatingsMap(value) {
  var out = {};
  if (!value || typeof value !== 'object' || Array.isArray(value)) return out;
  Object.keys(value).slice(0, 500).forEach(function(itemId) {
    var rating = Math.round(Number(value[itemId]) || 0);
    if (itemId && itemId.length <= 200 && rating >= 1 && rating <= 5) out[itemId] = rating;
  });
  return out;
}

function normalizeViewerNotes(value) {
  var out = {};
  if (!value || typeof value !== 'object' || Array.isArray(value)) return out;
  Object.keys(value).slice(0, 500).forEach(function(itemId) {
    var note = typeof value[itemId] === 'string' ? value[itemId].trim().slice(0, 4000) : '';
    if (itemId && itemId.length <= 200 && note) out[itemId] = note;
  });
  return out;
}

function normalizeReviewMarkers(value) {
  var out = {};
  if (!value || typeof value !== 'object' || Array.isArray(value)) return out;
  Object.keys(value).slice(0, 500).forEach(function(itemId) {
    if (!itemId || itemId.length > 200 || !Array.isArray(value[itemId])) return;
    var seen = {};
    var markers = value[itemId].slice(0, 100).map(function(raw) {
      if (!raw || typeof raw !== 'object') return null;
      var id = String(raw.id || '').trim().slice(0, 80);
      var text = String(raw.text || '').trim().slice(0, 1000);
      var kind = ['point', 'time', 'general'].indexOf(raw.kind) >= 0 ? raw.kind : 'general';
      if (!id || seen[id] || !text) return null;
      seen[id] = true;
      var marker = {
        id: id,
        kind: kind,
        text: text,
        createdAt: Math.max(0, Math.min(Number(raw.createdAt) || 0, 1e15)),
        updatedAt: Math.max(0, Math.min(Number(raw.updatedAt) || 0, 1e15))
      };
      if (kind === 'point') {
        marker.x = Math.max(0, Math.min(1, Number(raw.x) || 0));
        marker.y = Math.max(0, Math.min(1, Number(raw.y) || 0));
      }
      if (kind === 'time') marker.time = Math.max(0, Math.min(86400, Number(raw.time) || 0));
      return marker;
    }).filter(Boolean);
    if (markers.length) out[itemId] = markers;
  });
  return out;
}

function normalizeWorkspaces(value) {
  if (!Array.isArray(value)) return [];
  var seen = {};
  return value.slice(0, 50).map(function(raw) {
    if (!raw || typeof raw !== 'object') return null;
    var id = String(raw.id || '').trim().slice(0, 80);
    var name = String(raw.name || '').trim().slice(0, 80);
    if (!id || !name || seen[id]) return null;
    seen[id] = true;
    var color = /^#[0-9a-f]{6}$/i.test(String(raw.color || '')) ? String(raw.color).toLowerCase() : '#4f82d9';
    return {
      id: id,
      name: name,
      color: color,
      itemIds: uniqueIdList(raw.itemIds).slice(0, 500),
      createdAt: Math.max(0, Number(raw.createdAt) || 0),
      updatedAt: Math.max(0, Number(raw.updatedAt) || 0)
    };
  }).filter(Boolean);
}

async function loadLocalData() {
  loadCanvasPrefs();
  try { state.savedViews = JSON.parse(localStorage.getItem('eagle-viewer-saved-views') || '[]'); } catch (e) { state.savedViews = []; }
  try { state.collectionIds = JSON.parse(localStorage.getItem('eagle-viewer-collections') || '{"favorite":[],"later":[],"done":[],"recentViewed":[]}'); } catch (e2) { state.collectionIds = { favorite: [], later: [], done: [], recentViewed: [] }; }
  try { state.itemRatings = normalizeRatingsMap(JSON.parse(localStorage.getItem('eagle-viewer-ratings') || '{}')); } catch (ratingError) { state.itemRatings = {}; }
  try { state.viewerNotes = normalizeViewerNotes(JSON.parse(localStorage.getItem('eagle-viewer-notes') || '{}')); } catch (noteError) { state.viewerNotes = {}; }
  try { state.reviewMarkers = normalizeReviewMarkers(JSON.parse(localStorage.getItem('eagle-viewer-review-markers') || '{}')); } catch (markerError) { state.reviewMarkers = {}; }
  try { state.workspaces = normalizeWorkspaces(JSON.parse(localStorage.getItem('eagle-viewer-workspaces') || '[]')); } catch (workspaceError) { state.workspaces = []; }
  if (!state.collectionIds.favorite) state.collectionIds.favorite = [];
  if (!state.collectionIds.later) state.collectionIds.later = [];
  if (!state.collectionIds.done) state.collectionIds.done = [];
  if (!state.collectionIds.recentViewed) state.collectionIds.recentViewed = [];
  if (!state.collectionIds.items) state.collectionIds.items = {};
  renderSmartViewsSidebar();
  renderWorkspaceSidebar();
  var pending = readStoredViewerState(VIEWER_STATE_PENDING_KEY);
  if (pending && pending.state) {
    applyRemoteViewerState(pending.state, { updateBaseline: false });
    setSyncStatus('pending', '待同步');
  }
  try {
    var remoteState = await api.fetchViewerState();
    if (remoteState && remoteState.updatedAt) {
      if (pending && pending.state) {
        var baseline = readStoredViewerState(VIEWER_STATE_BASELINE_KEY);
        var merged = mergePendingViewerState(remoteState, pending.state, baseline);
        applyRemoteViewerState(merged, { updateBaseline: false });
        state.viewerStateRevision = remoteState.revision || 0;
        persistPendingViewerState();
        setSyncStatus('pending', '待同步');
        scheduleViewerStateSave(0);
      } else {
        applyRemoteViewerState(remoteState);
        clearPendingViewerState();
        setSyncStatus('synced', '已同步');
      }
    } else if (hasViewerState()) {
      persistPendingViewerState();
      scheduleViewerStateSave();
    } else {
      setSyncStatus('synced', '已同步');
    }
  } catch (e3) {
    if (hasViewerState()) persistPendingViewerState();
    setSyncStatus(hasViewerState() ? 'pending' : 'local', hasViewerState() ? '待同步' : '本机');
  }
}

function saveLocalData(syncRemote) {
  try { localStorage.setItem('eagle-viewer-saved-views', JSON.stringify(state.savedViews)); } catch (e) {}
  try { localStorage.setItem('eagle-viewer-collections', JSON.stringify(state.collectionIds)); } catch (e2) {}
  try { localStorage.setItem('eagle-viewer-ratings', JSON.stringify(state.itemRatings || {})); } catch (ratingError) {}
  try { localStorage.setItem('eagle-viewer-notes', JSON.stringify(state.viewerNotes || {})); } catch (noteError) {}
  try { localStorage.setItem('eagle-viewer-review-markers', JSON.stringify(state.reviewMarkers || {})); } catch (markerError) {}
  try { localStorage.setItem('eagle-viewer-workspaces', JSON.stringify(state.workspaces || [])); } catch (workspaceError) {}
  renderSmartViewsSidebar();
  renderWorkspaceSidebar();
  if (syncRemote !== false) {
    viewerStateMutationVersion++;
    persistPendingViewerState();
    scheduleViewerStateSave();
  }
}

function scheduleViewerStateSave(delay) {
  clearTimeout(viewerStateSaveTimer);
  if (navigator.onLine === false) {
    setSyncStatus('pending', '待同步');
    return;
  }
  setSyncStatus('syncing', '同步中');
  viewerStateSaveTimer = setTimeout(async function() {
    if (viewerStateSaveInFlight) {
      scheduleViewerStateSave(350);
      return;
    }
    viewerStateSaveInFlight = true;
    var submittedMutationVersion = viewerStateMutationVersion;
    var pendingBefore = readStoredViewerState(VIEWER_STATE_PENDING_KEY) || persistPendingViewerState();
    try {
      var result = await api.saveViewerState();
      if (result && result.conflict && result.state) {
        var baseline = readStoredViewerState(VIEWER_STATE_BASELINE_KEY);
        var currentPending = readStoredViewerState(VIEWER_STATE_PENDING_KEY) || pendingBefore;
        var merged = mergePendingViewerState(result.state, currentPending.state || getViewerStateSnapshot(), baseline);
        applyRemoteViewerState(merged, { updateBaseline: false });
        state.viewerStateRevision = result.state.revision || 0;
        persistPendingViewerState();
        setSyncStatus('conflict', '正在合并');
        scheduleViewerStateSave(80);
      } else if (result) {
        state.viewerStateRevision = result.revision || state.viewerStateRevision;
        persistViewerStateBaseline(result);
        if (submittedMutationVersion === viewerStateMutationVersion) {
          applyRemoteViewerState(result);
          clearPendingViewerState();
          setSyncStatus('synced', '已同步');
        } else {
          persistPendingViewerState();
          setSyncStatus('pending', '待同步');
          scheduleViewerStateSave(80);
        }
      } else {
        setSyncStatus('pending', '待同步');
      }
    } catch (e) {
      persistPendingViewerState();
      setSyncStatus('pending', '待同步');
    } finally {
      viewerStateSaveInFlight = false;
    }
  }, typeof delay === 'number' ? delay : 300);
}

function flushPendingViewerState() {
  if (!readStoredViewerState(VIEWER_STATE_PENDING_KEY)) return false;
  scheduleViewerStateSave(0);
  return true;
}

window.addEventListener('online', flushPendingViewerState);

function openPanel(id) {
  document.querySelectorAll('.utility-panel.open').forEach(function(panel) {
    if (panel.id !== id) panel.classList.remove('open');
  });
  var panel = document.getElementById(id);
  if (panel) panel.classList.toggle('open');
}

function closePanel(id) {
  var panel = document.getElementById(id);
  if (panel) panel.classList.remove('open');
}

function toggleTheme() {
  var cur = document.documentElement.getAttribute('data-theme') || 'light';
  interactionModule.setTheme(cur === 'light' ? 'dark' : 'light');
}

function readFiltersFromForm() {
  var mb = 1024 * 1024;
  var out = {};
  function num(id) {
    var val = parseFloat((document.getElementById(id) || {}).value || '');
    return isNaN(val) ? null : val;
  }
  var minWidth = num('filterMinWidth');
  var minHeight = num('filterMinHeight');
  var minSize = num('filterMinSize');
  var maxSize = num('filterMaxSize');
  var ratingMin = num('filterRatingMin');
  if (minWidth !== null) out.min_width = Math.round(minWidth);
  if (minHeight !== null) out.min_height = Math.round(minHeight);
  if (minSize !== null) out.min_size = Math.round(minSize * mb);
  if (maxSize !== null) out.max_size = Math.round(maxSize * mb);
  if (ratingMin !== null && ratingMin >= 1) out.rating_min = Math.min(5, Math.round(ratingMin));
  var colorEnabled = document.getElementById('filterColorEnabled');
  var colorInput = document.getElementById('filterColor');
  var colorTolerance = num('filterColorTolerance');
  if (colorEnabled && colorEnabled.checked && colorInput) {
    out.color = colorInput.value;
    out.color_tolerance = colorTolerance === null ? 72 : Math.round(colorTolerance);
  }
  var sourceDomain = normalizeFilterSourceDomain((document.getElementById('filterSourceDomain') || {}).value || '');
  if (sourceDomain) out.source_domain = sourceDomain;
  var ext = normalizeFilterExt((document.getElementById('filterExt') || {}).value || '');
  if (ext) out.ext = ext;
  ['Shape', 'TagState', 'AnnotationState', 'ViewerNoteState', 'SourceState', 'FavoriteState', 'LaterState', 'DoneState'].forEach(function(name) {
    var el = document.getElementById('filter' + name);
    if (!el || !el.value) return;
    var key = name === 'Shape' ? 'shape' :
      name === 'TagState' ? 'tag_state' :
      name === 'AnnotationState' ? 'annotation_state' :
      name === 'ViewerNoteState' ? 'viewer_note_state' :
      name === 'SourceState' ? 'source_state' :
      name === 'FavoriteState' ? 'favorite_state' :
      name === 'LaterState' ? 'later_state' : 'done_state';
    out[key] = el.value;
  });
  return out;
}

function normalizeFilterSourceDomain(value) {
  var raw = String(value || '').trim().toLowerCase();
  if (!raw) return '';
  try {
    var parsed = raw.indexOf('://') >= 0 ? new URL(raw) : new URL('https://' + raw);
    return parsed.hostname.replace(/^www\./, '');
  } catch (e) {
    return raw.replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0];
  }
}

function normalizeFilterExt(value) {
  return String(value || '').trim().toLowerCase().replace(/^\./, '').slice(0, 32);
}

function getFilterChipSpecs(filters) {
  var f = filters || {};
  var specs = [];
  var mb = 1024 * 1024;
  function add(key, label, value) {
    if (value === null || value === undefined || value === '') return;
    specs.push({ key: key, label: label, value: value });
  }
  add('min_width', '宽', f.min_width ? '≥ ' + f.min_width + 'px' : '');
  add('min_height', '高', f.min_height ? '≥ ' + f.min_height + 'px' : '');
  add('min_size', '大小', f.min_size ? '≥ ' + Math.round(f.min_size / mb) + 'MB' : '');
  add('max_size', '大小', f.max_size ? '≤ ' + Math.round(f.max_size / mb) + 'MB' : '');
  var shapeLabels = { landscape: '横图', portrait: '竖图', square: '方图' };
  add('shape', '形状', shapeLabels[f.shape] || f.shape || '');
  var tagLabels = { tagged: '有标签', untagged: '无标签' };
  add('tag_state', '标签', tagLabels[f.tag_state] || f.tag_state || '');
  var annotationLabels = { annotated: '有备注', unannotated: '无备注' };
  add('annotation_state', '备注', annotationLabels[f.annotation_state] || f.annotation_state || '');
  var viewerNoteLabels = { noted: '有 Viewer 笔记', unnoted: '无 Viewer 笔记' };
  add('viewer_note_state', 'Viewer 笔记', viewerNoteLabels[f.viewer_note_state] || f.viewer_note_state || '');
  var sourceLabels = { sourced: '有来源', unsourced: '无来源' };
  add('source_state', '来源', sourceLabels[f.source_state] || f.source_state || '');
  add('source_domain', '来源站点', f.source_domain || '');
  add('ext', '格式', f.ext ? '.' + f.ext : '');
  var favoriteLabels = { favorited: '已收藏', unfavorited: '未收藏' };
  add('favorite_state', '收藏', favoriteLabels[f.favorite_state] || f.favorite_state || '');
  var laterLabels = { later: '已待整理', not_later: '未待整理' };
  add('later_state', '待整理', laterLabels[f.later_state] || f.later_state || '');
  var doneLabels = { done: '已处理', not_done: '未处理' };
  add('done_state', '处理', doneLabels[f.done_state] || f.done_state || '');
  add('rating_min', '评分', f.rating_min ? '≥ ' + f.rating_min + ' 星' : '');
  if (f.color) add('color', '主色', String(f.color).toUpperCase() + ' ±' + (f.color_tolerance || 72));
  return specs;
}

function renderActiveFilterChips() {
  var wrap = document.getElementById('activeFilterChips');
  if (!wrap) return;
  var specs = getFilterChipSpecs(state.advancedFilters);
  wrap.hidden = !specs.length;
  wrap.innerHTML = specs.map(function(spec) {
    return '<button type="button" class="active-filter-chip" data-clear-filter="' + escapeHtml(spec.key) + '">' +
      '<span>' + escapeHtml(spec.label) + '</span><strong>' + escapeHtml(String(spec.value)) + '</strong>' + iconClose() +
    '</button>';
  }).join('') + (specs.length > 1 ? '<button type="button" class="active-filter-clear" data-clear-all-filters>清空</button>' : '');
}

function renderAdvancedFilterSummary(filters, pending) {
  var box = document.getElementById('advancedFilterSummary');
  if (!box) return;
  var specs = getFilterChipSpecs(filters || {});
  box.dataset.state = specs.length ? (pending ? 'pending' : 'active') : 'empty';
  if (!specs.length) {
    box.innerHTML = '<span>规则</span><strong>未启用高级筛选</strong><small>设置尺寸、状态、来源或主色后，可保存成智能视图。</small>';
    return;
  }
  box.innerHTML =
    '<span>' + (pending ? '待应用规则' : '已应用规则') + ' · ' + specs.length + '</span>' +
    '<strong>' + specs.slice(0, 3).map(function(spec) { return escapeHtml(spec.label + ' ' + spec.value); }).join(' · ') + (specs.length > 3 ? ' · +' + (specs.length - 3) : '') + '</strong>' +
    '<small>' + (pending ? '点击“应用筛选”后刷新当前视图。' : '当前视图正在按这些规则过滤，可保存为智能视图。') + '</small>';
}

function clearAdvancedFilter(key) {
  var next = Object.assign({}, state.advancedFilters || {});
  if (key === 'color') {
    delete next.color;
    delete next.color_tolerance;
  } else {
    delete next[key];
  }
  state.advancedFilters = next;
  syncFilterForm();
  api.refreshCurrentView();
}

function isMobileQuickFilterActive(key) {
  var f = state.advancedFilters || {};
  if (key === 'not_done') return f.done_state === 'not_done';
  if (key === 'later') return f.later_state === 'later';
  if (key === 'untagged') return f.tag_state === 'untagged';
  if (key === 'unsourced') return f.source_state === 'unsourced';
  if (key === 'sourced') return f.source_state === 'sourced';
  if (key === 'clear') return Object.keys(f).length > 0;
  return false;
}

function syncMobileQuickFilters() {
  document.querySelectorAll('[data-mobile-filter]').forEach(function(btn) {
    var active = isMobileQuickFilterActive(btn.dataset.mobileFilter || '');
    btn.classList.toggle('active', active);
    btn.setAttribute('aria-pressed', active ? 'true' : 'false');
  });
}

function toggleMobileQuickFilter(key) {
  var next = Object.assign({}, state.advancedFilters || {});
  if (key === 'clear') {
    next = {};
  } else if (key === 'not_done') {
    if (next.done_state === 'not_done') delete next.done_state;
    else next.done_state = 'not_done';
  } else if (key === 'later') {
    if (next.later_state === 'later') delete next.later_state;
    else next.later_state = 'later';
  } else if (key === 'untagged') {
    if (next.tag_state === 'untagged') delete next.tag_state;
    else next.tag_state = 'untagged';
  } else if (key === 'unsourced' || key === 'sourced') {
    if (next.source_state === key) delete next.source_state;
    else next.source_state = key;
  }
  state.advancedFilters = next;
  syncFilterForm();
  api.refreshCurrentView();
}

function syncFilterForm() {
  var f = state.advancedFilters || {};
  function setVal(id, val) {
    var el = document.getElementById(id);
    if (el) el.value = val || '';
  }
  setVal('filterMinWidth', f.min_width);
  setVal('filterMinHeight', f.min_height);
  setVal('filterMinSize', f.min_size ? Math.round(f.min_size / 1024 / 1024) : '');
  setVal('filterMaxSize', f.max_size ? Math.round(f.max_size / 1024 / 1024) : '');
  setVal('filterShape', f.shape);
  setVal('filterTagState', f.tag_state);
  setVal('filterAnnotationState', f.annotation_state);
  setVal('filterViewerNoteState', f.viewer_note_state);
  setVal('filterSourceState', f.source_state);
  setVal('filterSourceDomain', f.source_domain);
  setVal('filterExt', f.ext);
  setVal('filterFavoriteState', f.favorite_state);
  setVal('filterLaterState', f.later_state);
  setVal('filterDoneState', f.done_state);
  setVal('filterRatingMin', f.rating_min);
  var colorEnabled = document.getElementById('filterColorEnabled');
  var colorInput = document.getElementById('filterColor');
  var toleranceOutput = document.getElementById('filterColorToleranceValue');
  if (colorEnabled) colorEnabled.checked = !!f.color;
  if (colorInput && f.color) colorInput.value = f.color;
  setVal('filterColorTolerance', f.color_tolerance || 72);
  if (toleranceOutput) toleranceOutput.value = String(f.color_tolerance || 72);
  var filterButton = document.getElementById('filterPanelBtn');
  if (filterButton) filterButton.classList.toggle('active', Object.keys(f).length > 0);
  syncMobileQuickFilters();
  renderActiveFilterChips();
  renderAdvancedFilterSummary(f, false);
  if (render && render.updateMobileWorkbar) render.updateMobileWorkbar();
}

function getSavedViewSourceLabel(view) {
  if (!view || !view.view || view.view === 'all') return '全部';
  if (view.view === 'folder') {
    var path = view.folderId && typeof findFolderPathById === 'function' ? findFolderPathById(view.folderId, state.treeData, []) : '';
    return path ? path.split(' / ').pop() : '文件夹';
  }
  if (view.view === 'tag') return view.tagName ? '#' + view.tagName : '标签';
  if (view.view === 'eagle-smart') {
    var eagleFolder = api.findEagleSmartFolder ? api.findEagleSmartFolder(view.eagleSmartFolderId, state.eagleSmartFolders) : null;
    return eagleFolder ? ('Eagle · ' + eagleFolder.name) : 'Eagle 智能文件夹';
  }
  if (view.view === 'recent') return '最近 ' + (view.recentDays || 7) + ' 天';
  if (view.view === 'search') return view.searchQuery ? '搜索「' + view.searchQuery + '」' : '搜索';
  return '资料库';
}

function getSavedViewSummary(view) {
  var parts = [getSavedViewSourceLabel(view)];
  var typeLabels = { all: '全部格式', image: '图片', video: '视频', document: '文档', audio: '音频', other: '其他' };
  if (view && view.type && view.type !== 'all') parts.push(typeLabels[view.type] || view.type);
  getFilterChipSpecs((view && view.filters) || {}).forEach(function(spec) {
    parts.push(spec.label + ' ' + spec.value);
  });
  var sortLabels = { mtime: '修改时间', btime: '创建时间', name: '名称', size: '大小', ext: '格式' };
  parts.push((sortLabels[(view && view.sort) || 'mtime'] || '修改时间') + ((view && view.dir) === 'asc' ? '升序' : '降序'));
  return parts.join(' · ');
}

function renderSavedViewRulePills(view) {
  var typeLabels = { all: '全部格式', image: '图片', video: '视频', document: '文档', audio: '音频', other: '其他' };
  var sortLabels = { mtime: '修改时间', btime: '创建时间', name: '名称', size: '大小', ext: '格式' };
  var pills = [
    { label: '范围', value: getSavedViewSourceLabel(view) },
    { label: '类型', value: typeLabels[(view && view.type) || 'all'] || ((view && view.type) || '全部格式') }
  ];
  getFilterChipSpecs((view && view.filters) || {}).slice(0, 5).forEach(function(spec) {
    pills.push({ label: spec.label, value: spec.value });
  });
  var filterCount = getFilterChipSpecs((view && view.filters) || {}).length;
  if (filterCount > 5) pills.push({ label: '筛选', value: '+' + (filterCount - 5) });
  pills.push({ label: '排序', value: (sortLabels[(view && view.sort) || 'mtime'] || '修改时间') + ((view && view.dir) === 'asc' ? ' ↑' : ' ↓') });
  return '<div class="saved-view-rule-pills" aria-label="智能视图规则">' + pills.map(function(pill) {
    return '<span class="saved-view-rule-pill"><em>' + escapeHtml(pill.label) + '</em><strong>' + escapeHtml(String(pill.value)) + '</strong></span>';
  }).join('') + '</div>';
}

function getPresetViews() {
  return [
    { name: '未标签素材', description: '快速补标签', filters: { tag_state: 'untagged' } },
    { name: '未来源素材', description: '补齐引用来源', filters: { source_state: 'unsourced' } },
    { name: '无备注素材', description: '补充说明文字', filters: { annotation_state: 'unannotated' } },
    { name: 'Viewer 审片笔记', description: '回看远程审片意见', filters: { viewer_note_state: 'noted' } },
    { name: '未收藏素材', description: '从大库里挑精品', filters: { favorite_state: 'unfavorited' } },
    { name: '待整理队列', description: '继续处理 later 清单', filters: { later_state: 'later' } },
    { name: '未处理队列', description: '还没进入完成池', filters: { done_state: 'not_done' } },
    { name: '已处理成果池', description: '回看整理完成素材', filters: { done_state: 'done' } }
  ].map(function(view) {
    return Object.assign({
      view: 'all',
      sort: 'mtime',
      dir: 'desc',
      type: 'all',
      recentDays: 7,
      folderId: '',
      tagName: '',
      searchQuery: ''
    }, view);
  });
}

function openPresetViewByName(name) {
  var preset = getPresetViews().find(function(view) { return view.name === name; });
  if (!preset) return;
  return applySavedView(preset);
}

function markSmartViewActive(name) {
  if (!name) return;
  clearAllActive();
  document.querySelectorAll('.smart-view-item').forEach(function(el) {
    el.classList.toggle('active', el.dataset.smartViewName === name);
  });
}

function renderSmartViewsSidebar() {
  var list = document.getElementById('smartViewList');
  if (!list) return;
  var views = state.savedViews || [];
  list.innerHTML = '';
  var savedLabel = document.createElement('div');
  savedLabel.className = 'smart-view-subtitle';
  savedLabel.textContent = '我的智能视图';
  list.appendChild(savedLabel);
  if (!views.length) {
    var emptyBtn = document.createElement('button');
    emptyBtn.type = 'button';
    emptyBtn.className = 'smart-view-empty';
    emptyBtn.textContent = '保存当前筛选为智能视图';
    emptyBtn.onclick = function() { renderSavedViews(); openPanel('savedViewsPanel'); };
    list.appendChild(emptyBtn);
    if (state.currentView === 'smart' && state.currentSmartViewName) markSmartViewActive(state.currentSmartViewName);
    return;
  }
  views.slice(0, 12).forEach(function(view, idx) {
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'smart-view-item';
    btn.dataset.smartViewName = view.name || '';
    btn.dataset.smartViewIndex = String(idx);
    btn.innerHTML = '<span class="sidebar-item-icon">' + iconSliders() + '</span>' +
      '<span class="smart-view-copy"><strong>' + escapeHtml(view.name || '未命名视图') + '</strong><small>' + escapeHtml(getSavedViewSummary(view)) + '</small></span>';
    btn.onclick = function() { applySavedView(view); };
    list.appendChild(btn);
  });
  if (views.length > 12) {
    var more = document.createElement('button');
    more.type = 'button';
    more.className = 'smart-view-empty';
    more.textContent = '还有 ' + (views.length - 12) + ' 个，打开管理';
    more.onclick = function() { renderSavedViews(); openPanel('savedViewsPanel'); };
    list.appendChild(more);
  }
  if (state.currentView === 'smart' && state.currentSmartViewName) markSmartViewActive(state.currentSmartViewName);
}

var workspaceContextItemIds = [];

function getWorkspace(workspaceId) {
  return (state.workspaces || []).find(function(workspace) { return workspace.id === workspaceId; }) || null;
}

function getWorkspaceFromCollection(collectionName) {
  if (String(collectionName || '').indexOf('workspace:') !== 0) return null;
  return getWorkspace(String(collectionName).substring(10));
}

function renderWorkspaceSidebar() {
  var list = document.getElementById('workspaceSidebarList');
  if (!list) return;
  var workspaces = state.workspaces || [];
  if (!workspaces.length) {
    list.innerHTML = '<button type="button" class="workspace-sidebar-empty">＋ 新建第一个工作集</button>';
    list.firstChild.onclick = function() { openWorkspacesPanel([]); };
    return;
  }
  list.innerHTML = workspaces.map(function(workspace) {
    return '<button type="button" class="workspace-sidebar-item" data-workspace-id="' + escapeHtml(workspace.id) + '" style="--workspace-color:' + escapeHtml(workspace.color) + '">' +
      '<i aria-hidden="true"></i><span><strong>' + escapeHtml(workspace.name) + '</strong><small>' + workspace.itemIds.length + ' 项</small></span>' +
    '</button>';
  }).join('');
  list.querySelectorAll('[data-workspace-id]').forEach(function(button) {
    button.onclick = function() { showCollection('workspace:' + button.dataset.workspaceId); };
  });
  if (state.currentView === 'collection') {
    var active = getWorkspaceFromCollection(state.currentCollection);
    if (active) {
      var activeButton = list.querySelector('[data-workspace-id="' + CSS.escape(active.id) + '"]');
      if (activeButton) activeButton.classList.add('active');
    }
  }
}

function cacheWorkspaceItems(itemIds) {
  state.collectionIds.items = state.collectionIds.items || {};
  (itemIds || []).forEach(function(itemId) {
    var item = findCurrentItem(itemId);
    if (item && item.id) state.collectionIds.items[item.id] = item;
  });
}

function toggleWorkspaceItems(workspaceId, itemIds) {
  var workspace = getWorkspace(workspaceId);
  var ids = uniqueIdList(itemIds).slice(0, 500);
  if (!workspace || !ids.length) return;
  var allIncluded = ids.every(function(id) { return workspace.itemIds.indexOf(id) >= 0; });
  if (allIncluded) workspace.itemIds = workspace.itemIds.filter(function(id) { return ids.indexOf(id) < 0; });
  else {
    workspace.itemIds = mergeCollectionList(workspace.itemIds, ids).slice(0, 500);
    cacheWorkspaceItems(ids);
  }
  workspace.updatedAt = Date.now();
  saveLocalData();
  ids.forEach(function(id) { if (render.updateCollectionMarkersInView) render.updateCollectionMarkersInView(id); });
  syncMobileCollectionSurfaces();
  renderWorkspacesPanel();
  if (state.currentView === 'collection' && state.currentCollection === 'workspace:' + workspace.id) showCollection(state.currentCollection);
  showToast((allIncluded ? '已从“' : '已加入“') + workspace.name + (allIncluded ? '”移出' : '”'), allIncluded ? '' : 'success');
}

function createWorkspace(name, color) {
  var cleanName = String(name || '').trim().slice(0, 80);
  if (!cleanName) {
    showToast('请输入工作集名称', 'error');
    return null;
  }
  var now = Date.now();
  var workspace = {
    id: 'ws-' + now.toString(36) + '-' + Math.random().toString(36).slice(2, 7),
    name: cleanName,
    color: /^#[0-9a-f]{6}$/i.test(String(color || '')) ? String(color).toLowerCase() : '#4f82d9',
    itemIds: uniqueIdList(workspaceContextItemIds).slice(0, 500),
    createdAt: now,
    updatedAt: now
  };
  state.workspaces = (state.workspaces || []).concat([workspace]).slice(0, 50);
  cacheWorkspaceItems(workspace.itemIds);
  saveLocalData();
  renderWorkspacesPanel();
  showToast('已创建工作集：' + workspace.name, 'success');
  return workspace;
}

function deleteWorkspace(workspaceId) {
  var workspace = getWorkspace(workspaceId);
  if (!workspace || !window.confirm('删除工作集“' + workspace.name + '”？素材仍保留在 Vault 中。')) return;
  state.workspaces = (state.workspaces || []).filter(function(entry) { return entry.id !== workspaceId; });
  saveLocalData();
  renderWorkspacesPanel();
  if (state.currentView === 'collection' && state.currentCollection === 'workspace:' + workspaceId) api.loadAllItems(true);
  showToast('已删除工作集');
}

function renderWorkspacesPanel() {
  var list = document.getElementById('workspaceList');
  var context = document.getElementById('workspaceContext');
  if (!list || !context) return;
  var contextCount = workspaceContextItemIds.length;
  context.hidden = !contextCount;
  if (contextCount) context.innerHTML = '<span>ADD TO WORKSPACE</span><strong>将 ' + contextCount + ' 个素材加入工作集</strong><small>再次点击已包含全部素材的工作集可移出。</small>';
  var workspaces = state.workspaces || [];
  if (!workspaces.length) {
    list.innerHTML = '<div class="workspace-empty"><strong>还没有工作集</strong><span>用工作集临时组织项目、灵感板或交付素材，不改变 Eagle 文件夹。</span></div>';
    return;
  }
  list.innerHTML = workspaces.map(function(workspace) {
    var includedCount = contextCount ? workspaceContextItemIds.filter(function(id) { return workspace.itemIds.indexOf(id) >= 0; }).length : 0;
    var allIncluded = contextCount && includedCount === contextCount;
    return '<article class="workspace-card" style="--workspace-color:' + escapeHtml(workspace.color) + '">' +
      '<i class="workspace-card-color" aria-hidden="true"></i>' +
      '<div><strong>' + escapeHtml(workspace.name) + '</strong><span>' + workspace.itemIds.length + ' 项' + (contextCount ? ' · 已包含 ' + includedCount + '/' + contextCount : '') + '</span></div>' +
      '<div class="workspace-card-actions">' +
        (contextCount ? '<button type="button" class="' + (allIncluded ? 'active' : 'primary') + '" data-workspace-toggle="' + escapeHtml(workspace.id) + '">' + (allIncluded ? '移出' : '加入') + '</button>' : '') +
        '<button type="button" data-workspace-open="' + escapeHtml(workspace.id) + '">打开</button>' +
        '<button type="button" class="danger" data-workspace-delete="' + escapeHtml(workspace.id) + '">删除</button>' +
      '</div>' +
    '</article>';
  }).join('');
  list.querySelectorAll('[data-workspace-toggle]').forEach(function(button) { button.onclick = function() { toggleWorkspaceItems(button.dataset.workspaceToggle, workspaceContextItemIds); }; });
  list.querySelectorAll('[data-workspace-open]').forEach(function(button) { button.onclick = function() { closePanel('workspacesPanel'); showCollection('workspace:' + button.dataset.workspaceOpen); }; });
  list.querySelectorAll('[data-workspace-delete]').forEach(function(button) { button.onclick = function() { deleteWorkspace(button.dataset.workspaceDelete); }; });
}

function openWorkspacesPanel(itemIds) {
  workspaceContextItemIds = uniqueIdList(itemIds || []);
  renderWorkspacesPanel();
  openPanel('workspacesPanel');
  var input = document.getElementById('workspaceName');
  if (input && window.innerWidth > 768) setTimeout(function() { input.focus(); }, 40);
}

function renderSavedViews() {
  var list = document.getElementById('savedViewList');
  if (!list) return;
  list.innerHTML = '';
  if (!state.savedViews.length) {
    list.innerHTML = '<div class="saved-view-empty"><strong>还没有智能视图</strong><span>先设置排序、格式或高级筛选，然后把当前结果保存成一个侧栏入口。</span></div>';
    return;
  }
  state.savedViews.forEach(function(view, idx) {
    var card = document.createElement('div');
    card.className = 'saved-view-card';
    card.innerHTML = '<div class="saved-view-card-main"><strong>' + escapeHtml(view.name) + '</strong><span>' + escapeHtml(getSavedViewSummary(view)) + '</span>' + renderSavedViewRulePills(view) + '</div>' +
      '<div class="saved-view-card-actions"><button type="button">打开</button><button type="button">复制链接</button><button type="button" class="danger">删除</button></div>';
    card.querySelectorAll('button')[0].onclick = function() { applySavedView(view); closePanel('savedViewsPanel'); };
    card.querySelectorAll('button')[1].onclick = function() { copySmartViewLink(view, this); };
    card.querySelectorAll('button')[2].onclick = function() {
      state.savedViews.splice(idx, 1);
      saveLocalData();
      renderSavedViews();
      if (state.currentView === 'smart' && state.currentSmartViewName === view.name) {
        state.currentSmartViewName = '';
        api.loadAllItems(true);
      }
    };
    list.appendChild(card);
  });
}

function buildSmartViewUrl(view) {
  var params = new URLSearchParams();
  params.set('view', 'smart');
  params.set('smart', view && view.name ? view.name : '');
  return location.origin + location.pathname + location.search + '#' + params.toString();
}

function copySmartViewLink(view, button) {
  if (!view || !view.name) return;
  copyTextToClipboard(buildSmartViewUrl(view), '智能视图链接', button);
}

function buildCurrentViewUrl() {
  var params = new URLSearchParams();
  params.set('view', state.currentView || 'all');
  params.set('sort', state.listSort || 'mtime');
  params.set('dir', state.listDir || 'desc');
  params.set('type', state.listType || 'all');
  if (state.currentView === 'folder' && state.currentFolderId) params.set('id', state.currentFolderId);
  if (state.currentView === 'tag' && state.currentTagName) params.set('tag', state.currentTagName);
  if (state.currentView === 'recent') params.set('days', String(state.recentDays || 7));
  if (state.currentView === 'search' && state.searchQuery) params.set('q', state.searchQuery);
  if (state.currentView === 'collection' && state.currentCollection) params.set('collection', state.currentCollection);
  if (state.currentView === 'smart' && state.currentSmartViewName) params.set('smart', state.currentSmartViewName);
  if (state.currentView === 'eagle-smart' && state.currentEagleSmartFolderId) params.set('eagleSmart', state.currentEagleSmartFolderId);
  if (state.currentView === 'random' && state.currentRandomSeed) params.set('seed', state.currentRandomSeed);
  (window.URL_FILTER_KEYS || [
    'min_size', 'max_size', 'min_width', 'min_height', 'mtime_from', 'mtime_to',
    'shape', 'tag_state', 'annotation_state', 'viewer_note_state', 'source_state', 'favorite_state', 'later_state', 'done_state',
    'source_domain', 'ext', 'color', 'color_tolerance'
  ]).forEach(function(key) {
    var val = (state.advancedFilters || {})[key];
    if (val !== null && val !== undefined && val !== '') params.set(key, val);
  });
  return location.origin + location.pathname + location.search + '#' + params.toString();
}

function copyCurrentViewLink(button) {
  copyTextToClipboard(buildCurrentViewUrl(), '当前视图链接', button);
}

function getDefaultSmartViewName() {
  var title = typeof getMobileWorkbarTitle === 'function' ? getMobileWorkbarTitle() : (state.currentTitle || '当前视图');
  var base = String(title || '当前视图').replace(/\s+/g, ' ').trim() || '当前视图';
  var name = base;
  var n = 2;
  var existing = state.savedViews || [];
  while (existing.some(function(view) { return view && view.name === name; })) {
    name = base + ' ' + n;
    n += 1;
  }
  return name;
}

function saveCurrentViewAsSmartView(name) {
  var smartName = String(name || '').trim();
  if (!smartName) return false;
  var next = captureCurrentView(smartName);
  var existingIdx = state.savedViews.findIndex(function(view) { return view.name === smartName; });
  if (existingIdx >= 0) state.savedViews.splice(existingIdx, 1, next);
  else state.savedViews.push(next);
  saveLocalData();
  renderSavedViews();
  if (render.updateSidebarCounts) render.updateSidebarCounts();
  renderSmartViewsSidebar();
  renderMobileSearchQuick();
  syncMobileMoreHandoff();
  if (window.showToast) showToast('已保存智能视图：' + smartName, 'success');
  return true;
}

function promptSaveCurrentSmartView() {
  var name = window.prompt('保存当前视图为智能视图', getDefaultSmartViewName());
  if (name === null) return;
  saveCurrentViewAsSmartView(name);
}

function getCurrentViewShareTitle() {
  var title = '全部文件';
  if (state.currentView === 'folder') {
    var folderPath = typeof findFolderPathById === 'function' ? findFolderPathById(state.currentFolderId, state.treeData, []) : '';
    var folderParts = folderPath ? folderPath.split(' / ') : [];
    title = folderParts.length ? folderParts[folderParts.length - 1] : '文件夹';
  } else if (state.currentView === 'tag') {
    title = '#' + (state.currentTagName || '标签');
  } else if (state.currentView === 'recent') {
    title = '最近 ' + (state.recentDays || 7) + ' 天';
  } else if (state.currentView === 'search') {
    title = state.searchQuery ? ('搜索：' + state.searchQuery) : '搜索结果';
  } else if (state.currentView === 'collection') {
    var collectionLabels = {
      favorite: '收藏',
      later: '待整理',
      done: '已处理成果池',
      recentViewed: '最近查看'
    };
    var workspace = getWorkspaceFromCollection(state.currentCollection);
    title = workspace ? workspace.name + ' · 工作集' : (collectionLabels[state.currentCollection] || '清单');
  } else if (state.currentView === 'smart') {
    title = state.currentSmartViewName || '智能视图';
  } else if (state.currentView === 'eagle-smart') {
    title = state.currentTitle || 'Eagle 智能文件夹';
  } else if (state.currentView === 'duplicates') {
    title = '疑似重复';
  } else if (state.currentView === 'colors') {
    title = '全库色谱';
  } else if (state.currentView === 'random') {
    title = '随机漫游 · ' + String(state.currentRandomSeed || '').slice(0, 8);
  }
  return 'Eagle Vault · ' + title;
}

async function shareCurrentViewLink(button) {
  var url = buildCurrentViewUrl();
  var title = getCurrentViewShareTitle();
  try {
    if (navigator.share && window.innerWidth <= 768) {
      await navigator.share({ title: title, text: title, url: url });
      showToast('已打开系统分享', 'success');
      return;
    }
  } catch (err) {
    if (err && err.name === 'AbortError') return;
  }
  copyCurrentViewLink(button);
}

function exportSavedViewsConfig() {
  var payload = {
    app: 'eagle-viewer',
    kind: 'smart-views',
    exportedAt: new Date().toISOString(),
    views: state.savedViews || []
  };
  var blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  var a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'eagle-smart-views.json';
  a.click();
  URL.revokeObjectURL(a.href);
  if (window.showToast) showToast('智能视图已导出', 'success');
}

function normalizeImportedSavedViews(raw) {
  var views = Array.isArray(raw) ? raw : (raw && Array.isArray(raw.views) ? raw.views : []);
  return views.filter(function(view) {
    return view && typeof view.name === 'string' && view.name.trim();
  }).map(function(view) {
    return {
      name: view.name.trim(),
      view: view.view || 'all',
      folderId: view.folderId || null,
      tagName: view.tagName || null,
      recentDays: Number(view.recentDays) || 7,
      searchQuery: view.searchQuery || '',
      sort: view.sort || 'mtime',
      dir: view.dir === 'asc' ? 'asc' : 'desc',
      type: view.type || 'all',
      filters: view.filters && typeof view.filters === 'object' ? view.filters : {}
    };
  });
}

async function importSavedViewsFile(file) {
  if (!file) return;
  try {
    var raw = JSON.parse(await file.text());
    var incoming = normalizeImportedSavedViews(raw);
    if (!incoming.length) throw new Error('empty');
    incoming.forEach(function(view) {
      var idx = state.savedViews.findIndex(function(existing) { return existing.name === view.name; });
      if (idx >= 0) state.savedViews.splice(idx, 1, view);
      else state.savedViews.push(view);
    });
    await saveLocalData();
    renderSavedViews();
    renderSmartViewsSidebar();
    if (window.showToast) showToast('已导入 ' + incoming.length + ' 个智能视图', 'success');
  } catch (err) {
    if (window.showToast) showToast('导入智能视图失败，请检查 JSON', 'error');
  }
}

function uniqueIdList(ids) {
  var seen = {};
  return (ids || []).filter(function(id) {
    id = String(id || '');
    if (!id || seen[id]) return false;
    seen[id] = true;
    return true;
  });
}

function exportCollectionsConfig() {
  var payload = {
    app: 'eagle-viewer',
    kind: 'collections',
    exportedAt: new Date().toISOString(),
    collections: state.collectionIds || { favorite: [], later: [], done: [], recentViewed: [], items: {} },
    ratings: state.itemRatings || {},
    notes: state.viewerNotes || {},
    reviewMarkers: state.reviewMarkers || {},
    workspaces: state.workspaces || []
  };
  var blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  var a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'eagle-viewer-collections.json';
  a.click();
  URL.revokeObjectURL(a.href);
  if (window.showToast) showToast('整理清单已导出', 'success');
}

function normalizeImportedCollections(raw) {
  var input = raw && raw.collections ? raw.collections : raw;
  input = input && typeof input === 'object' ? input : {};
  var collections = {
    favorite: uniqueIdList(input.favorite),
    later: uniqueIdList(input.later),
    done: uniqueIdList(input.done),
    recentViewed: uniqueIdList(input.recentViewed),
    items: {}
  };
  var items = input.items && typeof input.items === 'object' ? input.items : {};
  Object.keys(items).forEach(function(id) {
    var item = items[id];
    if (item && item.id) collections.items[item.id] = item;
  });
  return { collections: collections, ratings: normalizeRatingsMap(raw && raw.ratings), notes: normalizeViewerNotes(raw && raw.notes), reviewMarkers: normalizeReviewMarkers(raw && raw.reviewMarkers), workspaces: normalizeWorkspaces(raw && raw.workspaces) };
}

function mergeCollectionList(current, incoming) {
  return uniqueIdList((current || []).concat(incoming || []));
}

async function importCollectionsFile(file) {
  if (!file) return;
  try {
    var imported = normalizeImportedCollections(JSON.parse(await file.text()));
    var incoming = imported.collections;
    var total = incoming.favorite.length + incoming.later.length + incoming.done.length + incoming.recentViewed.length;
    if (!total && !Object.keys(incoming.items || {}).length && !Object.keys(imported.ratings || {}).length && !Object.keys(imported.notes || {}).length && !Object.keys(imported.reviewMarkers || {}).length && !imported.workspaces.length) throw new Error('empty');
    state.collectionIds = state.collectionIds || {};
    state.collectionIds.favorite = mergeCollectionList(state.collectionIds.favorite, incoming.favorite);
    state.collectionIds.later = mergeCollectionList(state.collectionIds.later, incoming.later);
    state.collectionIds.done = mergeCollectionList(state.collectionIds.done, incoming.done);
    state.collectionIds.recentViewed = mergeCollectionList(state.collectionIds.recentViewed, incoming.recentViewed).slice(0, 40);
    state.collectionIds.items = Object.assign({}, state.collectionIds.items || {}, incoming.items || {});
    state.itemRatings = Object.assign({}, state.itemRatings || {}, imported.ratings || {});
    state.viewerNotes = Object.assign({}, state.viewerNotes || {}, imported.notes || {});
    state.reviewMarkers = state.reviewMarkers || {};
    Object.keys(imported.reviewMarkers || {}).forEach(function(itemId) {
      state.reviewMarkers[itemId] = mergeKeyedArray(state.reviewMarkers[itemId], imported.reviewMarkers[itemId], [], 'id').slice(0, 100);
    });
    imported.workspaces.forEach(function(workspace) {
      var existing = (state.workspaces || []).find(function(entry) { return entry.id === workspace.id; });
      if (existing) {
        existing.name = workspace.name;
        existing.color = workspace.color;
        existing.itemIds = mergeCollectionList(existing.itemIds, workspace.itemIds).slice(0, 500);
        existing.updatedAt = Math.max(existing.updatedAt || 0, workspace.updatedAt || 0);
      } else if ((state.workspaces || []).length < 50) state.workspaces.push(workspace);
    });
    saveLocalData();
    if (render.updateSidebarCounts) render.updateSidebarCounts();
    if (state.currentView === 'collection') showCollection(state.currentCollection || 'favorite');
    if (window.showToast) showToast('已导入整理清单', 'success');
  } catch (err) {
    if (window.showToast) showToast('导入整理清单失败，请检查 JSON', 'error');
  }
}

function captureCurrentView(name) {
  if (state.currentView === 'smart' && state.currentSmartViewName) {
    var source = (state.savedViews || []).find(function(view) { return view.name === state.currentSmartViewName; });
    if (source) {
      var copy = Object.assign({}, source);
      copy.name = name;
      copy.filters = Object.assign({}, source.filters || {});
      return copy;
    }
  }
  return {
    name: name,
    view: state.currentView,
    folderId: state.currentFolderId,
    tagName: state.currentTagName,
    recentDays: state.recentDays,
    searchQuery: state.searchQuery,
    eagleSmartFolderId: state.currentEagleSmartFolderId,
    sort: state.listSort,
    dir: state.listDir,
    type: state.listType,
    filters: state.advancedFilters || {}
  };
}

async function applySavedView(view) {
  if (!view) return;
  var smartName = view.name || '';
  state.listSort = view.sort || 'mtime';
  state.listDir = view.dir || 'desc';
  state.listType = view.type || 'all';
  state.advancedFilters = view.filters || {};
  state.currentSmartViewName = smartName;
  syncToolbarSelects();
  syncFilterForm();
  suspendRouteHistory();
  try {
    if (view.view === 'folder' && view.folderId) await api.loadFolderItems(view.folderId);
    else if (view.view === 'tag' && view.tagName) await api.loadTagItems(view.tagName);
    else if (view.view === 'eagle-smart' && view.eagleSmartFolderId) await api.loadEagleSmartFolderItems(view.eagleSmartFolderId);
    else if (view.view === 'recent') await api.loadRecentItems(view.recentDays || 7);
    else if (view.view === 'search') {
      document.getElementById('searchInput').value = view.searchQuery || '';
      await api.doSearch();
    } else await api.loadAllItems(true);
  } finally {
    resumeRouteHistory();
  }
  state.currentView = 'smart';
  state.currentSmartViewName = smartName;
  state.currentTitle = '智能视图「' + smartName + '」';
  markSmartViewActive(smartName);
  if (render.updateContentTitle) render.updateContentTitle();
  updateUrlFromState();
  syncMobileTabbar();
  if (window.innerWidth <= 768 && window._closeMobileSidebar) window._closeMobileSidebar();
}

async function openSmartViewByName(name) {
  var target = getPresetViews().find(function(view) { return view.name === name; }) ||
    (state.savedViews || []).find(function(view) { return view.name === name; });
  if (!target && state.savedViews && state.savedViews.length) target = state.savedViews[0];
  if (!target) return api.loadAllItems(true);
  return applySavedView(target);
}

async function startUndoneReview() {
  await openSmartViewByName('未处理队列');
  var first = (state.currentItems || []).find(function(item) { return isItemPreviewable(item); });
  if (!first) {
    if (window.showToast) window.showToast('未处理队列暂无可预览素材');
    return;
  }
  render.previewItem(first, API + '/api/items/' + first.id + '/file');
}

async function runPendingLaunchAction() {
  var action = state.pendingLaunchAction || '';
  if (!action) return false;
  state.pendingLaunchAction = '';
  if (action === 'search') {
    if (window._openMobileSearchSheet) {
      window._openMobileSearchSheet();
    } else {
      var searchInput = document.getElementById('searchInput');
      if (searchInput) searchInput.focus();
    }
    if (window.showToast) window.showToast('已打开 Vault 搜索');
    return true;
  }
  if (action === 'recent') {
    await showCollection('recentViewed');
    if (window.showToast) window.showToast('已打开最近查看');
    return true;
  }
  return false;
}

function renderStatsPanel(stats) {
  var grid = document.getElementById('statsGrid');
  if (!grid) return;
  if (!stats) {
    grid.textContent = '暂无索引状态';
    return;
  }
  var parts = [
    ['文件', stats.items],
    ['文件夹', stats.folders],
    ['标签', stats.tags],
    ['扫描耗时', (stats.loadDurationMs || 0) + ' ms'],
    ['目录', stats.info_dirs],
    ['跳过', (stats.skipped_missing_metadata || 0) + (stats.skipped_bad_metadata || 0) + (stats.skipped_deleted || 0) + (stats.skipped_missing_file || 0)]
  ];
  grid.innerHTML = parts.map(function(p) { return '<span class="stat-pill"><strong>' + escapeHtml(p[0]) + '</strong> ' + escapeHtml(String(p[1] == null ? '-' : p[1])) + '</span>'; }).join('');
}

function collectionActionAffectsCurrentSmartView(listName) {
  if (state.currentView !== 'smart') return false;
  var filters = state.advancedFilters || {};
  if (listName === 'favorite') return !!filters.favorite_state;
  if (listName === 'later') return !!filters.later_state;
  if (listName === 'done') return !!filters.done_state;
  return false;
}

function refreshSmartQueueAfterCollectionChange(listName) {
  if (!collectionActionAffectsCurrentSmartView(listName)) return false;
  state.selectedIds.clear();
  state.lastSelectedId = '';
  api.refreshCurrentView();
  return true;
}

var batchFeedbackTimer = null;

function flashBatchCompletion(message) {
  var bar = document.getElementById('batchBar');
  if (bar) {
    var hint = document.getElementById('selectedHint');
    bar.classList.remove('batch-confirmed');
    void bar.offsetWidth;
    bar.classList.add('batch-confirmed');
    if (message && hint) {
      bar.dataset.batchFeedback = 'true';
      hint.textContent = message;
      hint.classList.add('batch-hint-confirmed');
      if (batchFeedbackTimer) clearTimeout(batchFeedbackTimer);
      batchFeedbackTimer = setTimeout(function() {
        bar.classList.remove('batch-confirmed');
        hint.classList.remove('batch-hint-confirmed');
        delete bar.dataset.batchFeedback;
        batchFeedbackTimer = null;
        updateBatchBar();
      }, 1200);
    } else {
      setTimeout(function() { bar.classList.remove('batch-confirmed'); }, 700);
    }
  }
  if (window.innerWidth <= 768 && navigator.vibrate) {
    try { navigator.vibrate(12); } catch (e) {}
  }
}

function syncMobileCollectionSurfaces() {
  if (render.updateSidebarCounts) render.updateSidebarCounts();
  if (render.updateMobileContinueRail) render.updateMobileContinueRail();
  syncMobileTabbar();
  renderMobileSearchQuick();
  syncMobileMoreHandoff();
}

function toggleCollection(listName, id) {
  if (listName !== 'favorite' && listName !== 'later' && listName !== 'done') return;
  var list = state.collectionIds[listName] || [];
  var idx = list.indexOf(id);
  var added = idx < 0;
  if (idx >= 0) list.splice(idx, 1);
  else {
    list.push(id);
    var item = state.currentItems.find(function(it) { return it.id === id; }) || state.inspectorItem;
    if (item && item.id === id) state.collectionIds.items[id] = item;
  }
  state.collectionIds[listName] = list;
  saveLocalData();
  syncMobileCollectionSurfaces();
  if (render.updateCollectionMarkersInView) render.updateCollectionMarkersInView(id);
  var label = listName === 'favorite' ? '收藏' : (listName === 'later' ? '待整理' : '已处理');
  showToast((added ? '已加入' : '已移出') + label, added ? 'success' : '');
  if (window.innerWidth <= 768) {
    try { if (navigator.vibrate) navigator.vibrate(8); } catch (e) {}
  }
  refreshSmartQueueAfterCollectionChange(listName);
}

function applyBatchCollection(listName, mode) {
  if (listName !== 'favorite' && listName !== 'later' && listName !== 'done') return;
  var ids = Array.from(state.selectedIds || []);
  if (!ids.length) return;
  var list = state.collectionIds[listName] || [];
  var changed = [];
  ids.forEach(function(id) {
    var idx = list.indexOf(id);
    if (mode === 'remove') {
      if (idx >= 0) {
        list.splice(idx, 1);
        changed.push(id);
      }
      return;
    }
    if (idx < 0) {
      list.push(id);
      changed.push(id);
    }
    var item = state.currentItems.find(function(it) { return it.id === id; }) ||
      (state.collectionIds.items && state.collectionIds.items[id]);
    if (item && item.id === id) state.collectionIds.items[id] = item;
  });
  state.collectionIds[listName] = list;
  if (!changed.length) return;
  saveLocalData();
  syncMobileCollectionSurfaces();
  changed.forEach(function(id) {
    if (render.updateCollectionMarkersInView) render.updateCollectionMarkersInView(id);
  });
  var label = listName === 'favorite' ? '收藏' : (listName === 'later' ? '待整理' : '已处理');
  var message = (mode === 'remove' ? '已移出 ' : '已加入 ') + changed.length + ' 个素材' + (mode === 'remove' ? '' : '到' + label);
  showToast(message, mode === 'remove' ? '' : 'success');
  if (mode === 'remove' && state.currentView === 'collection' && state.currentCollection === listName) {
    state.selectedIds.clear();
    showCollection(listName);
    flashBatchCompletion(message);
    return;
  }
  if (refreshSmartQueueAfterCollectionChange(listName)) return;
  updateBatchBar();
  updateCheckboxesInView();
  flashBatchCompletion(message);
}

function rememberViewedItem(item) {
  if (!item || !item.id) return;
  var recent = state.collectionIds.recentViewed || [];
  recent = recent.filter(function(id) { return id !== item.id; });
  recent.unshift(item.id);
  state.collectionIds.recentViewed = recent.slice(0, 40);
  state.collectionIds.items = state.collectionIds.items || {};
  state.collectionIds.items[item.id] = item;
  saveLocalData();
  syncMobileCollectionSurfaces();
}

async function showCollection(listName) {
  var workspace = getWorkspaceFromCollection(listName);
  if (listName !== 'favorite' && listName !== 'later' && listName !== 'done' && listName !== 'recentViewed' && !workspace) listName = 'favorite';
  var leavingAnotherView = state.currentView !== 'collection' || state.currentCollection !== listName;
  var ids = workspace ? workspace.itemIds : (state.collectionIds[listName] || []);
  var itemMap = state.collectionIds.items || {};
  state.currentView = 'collection';
  state.currentCollection = listName;
  state.currentSmartViewName = '';
  state.currentFolderId = null;
  state.currentTagName = null;
  state.currentTitle = workspace ? workspace.name : (listName === 'favorite' ? '收藏' : (listName === 'later' ? '待整理' : (listName === 'done' ? '已处理' : '最近查看')));
  state.currentSubfolders = [];
  state.currentItems = ids.map(function(id) { return itemMap[id]; }).filter(Boolean);
  state.currentTotal = state.currentItems.length;
  state.currentEmptyMsg = workspace ? '从素材详情、右键菜单或长按面板把素材加入这个工作集' : (listName === 'recentViewed' ? '打开素材详情或预览后，会自动出现在这里' : (listName === 'done' ? '把素材标记为已处理后，会出现在这里' : '当前清单暂无素材'));
  if (leavingAnotherView && state.inspectorItem && render.closeInspector) render.closeInspector();
  render.renderContent();
  if (render.syncActiveNavigationState) render.syncActiveNavigationState();
  updateBatchBar();
  updateCheckboxesInView();
  updateUrlFromState();
  syncMobileTabbar();
  if (window.innerWidth <= 768 && window._closeMobileSidebar) window._closeMobileSidebar();
  if (!ids.length) return;
  var resolved = await api.resolveItems(ids);
  if (state.currentView !== 'collection') return;
  if (!resolved.length && state.currentItems.length) {
    if (window.showToast) window.showToast('正在使用本地清单快照，重连后更新');
    return;
  }
  resolved.forEach(function(item) { itemMap[item.id] = item; });
  state.collectionIds.items = itemMap;
  state.currentItems = resolved;
  state.currentTotal = resolved.length;
  saveLocalData(false);
  render.renderContent();
  if (render.syncActiveNavigationState) render.syncActiveNavigationState();
  updateBatchBar();
  updateCheckboxesInView();
}

async function getLastViewedResolvedItem() {
  var recent = state.collectionIds.recentViewed || [];
  var itemId = recent[0] || '';
  if (!itemId) return null;
  var item = findCurrentItem(itemId);
  if (!item) {
    var resolved = await api.resolveItems([itemId]);
    item = resolved && resolved[0];
  }
  if (!item || !item.id) return null;
  state.collectionIds.items = state.collectionIds.items || {};
  state.collectionIds.items[item.id] = item;
  saveLocalData(false);
  return item;
}

async function resumeLastViewedItem() {
  var recent = state.collectionIds.recentViewed || [];
  if (!recent[0]) {
    showCollection('recentViewed');
    return;
  }
  var item = await getLastViewedResolvedItem();
  if (!item) {
    showToast('最近查看素材暂时不可用，已打开最近查看列表', 'error');
    showCollection('recentViewed');
    return;
  }
  render.openInspector(item);
}

async function previewLastViewedItem() {
  var recent = state.collectionIds.recentViewed || [];
  if (!recent[0]) {
    startUndoneReview();
    return;
  }
  var item = await getLastViewedResolvedItem();
  if (!item) {
    showToast('最近查看素材暂时不可用，已打开最近查看列表', 'error');
    showCollection('recentViewed');
    return;
  }
  if (!isItemPreviewable(item)) {
    showToast('上次素材不可预览，已打开详情', 'error');
    render.openInspector(item);
    return;
  }
  render.previewItem(item, API + '/api/items/' + item.id + '/file');
}

function setMobileTabActive(activeId) {
  document.querySelectorAll('.mobile-tab').forEach(function(btn) {
    var active = btn.id === activeId;
    btn.classList.toggle('active', active);
    btn.setAttribute('aria-current', active ? 'page' : 'false');
  });
}

function pulseMobileTab(btn) {
  if (!btn) return;
  btn.classList.remove('tab-pressed');
  void btn.offsetWidth;
  btn.classList.add('tab-pressed');
  clearTimeout(btn._tabPressedTimer);
  btn._tabPressedTimer = setTimeout(function() { btn.classList.remove('tab-pressed'); }, 220);
}

function syncMobileTabbar() {
  var activeId = 'mobileLibraryBtn';
  if (state.currentView === 'collection' && state.currentCollection === 'favorite') activeId = 'mobileFavoriteBtn';
  else if (state.currentView === 'collection' && state.currentCollection === 'later') activeId = 'mobileLaterBtn';
  else if (state.currentView === 'collection' && (state.currentCollection === 'done' || state.currentCollection === 'recentViewed')) activeId = 'mobileMoreBtn';
  else if (state.currentView === 'search') activeId = 'mobileSearchBtn';
  else if (state.currentView === 'smart') activeId = 'mobileMoreBtn';
  else if (state.currentView === 'eagle-smart') activeId = 'mobileMoreBtn';
  else if (state.currentView === 'collection' && state.currentCollection && state.currentCollection.indexOf('workspace:') === 0) activeId = 'mobileMoreBtn';
  else if (state.currentView === 'duplicates') activeId = 'mobileMoreBtn';
  else if (state.currentView === 'colors') activeId = 'mobileMoreBtn';
  else if (state.currentView === 'random') activeId = 'mobileMoreBtn';
  setMobileTabActive(activeId);
}

function buildCommandItems(query) {
  var q = (query || '').toLowerCase();
  var folderMatches = [];
  var items = [
    { title: '全部文件', hint: '视图', run: function() { api.loadAllItems(true); } },
    { title: '最近 7 天', hint: '视图', run: function() { api.loadRecentItems(7); } },
    { title: '最近 30 天', hint: '视图', run: function() { api.loadRecentItems(30); } },
    { title: '疑似重复', hint: '工具', run: function() { api.loadDuplicates(); } },
    { title: '全库色谱', hint: '工具 · 按颜色探索', run: function() { api.loadColorAtlas(); } },
    { title: '随机漫游', hint: '工具 · 从 Vault 重新发现', run: function() { api.loadRandomWalk('', true); } },
    { title: '画布显示设置', hint: '工具 · 布局与素材信息', run: function() { syncCanvasSettings(); openPanel('canvasSettingsPanel'); } },
    { title: '索引状态', hint: '工具', run: function() { openPanel('statsPanel'); api.fetchStats().then(renderStatsPanel); } },
    { title: '高级筛选', hint: '工具', run: function() { openPanel('advancedPanel'); } },
    { title: '收藏清单', hint: '本地清单', run: function() { showCollection('favorite'); } },
    { title: '待整理清单', hint: '本地清单', run: function() { showCollection('later'); } },
    { title: '已处理清单', hint: '整理完成', run: function() { showCollection('done'); } },
    { title: '最近查看', hint: '继续浏览', run: function() { showCollection('recentViewed'); } }
  ];
  getEagleSmartFolderQuickItems(80).forEach(function(item) {
    items.push({ title: item.title, hint: 'Eagle 智能文件夹 · ' + item.hint, run: item.run });
  });
  state.savedViews.forEach(function(view) { items.push({ title: view.name, hint: '保存视图', run: function() { applySavedView(view); } }); });
  (state.workspaces || []).forEach(function(workspace) { items.push({ title: workspace.name, hint: '工作集 · ' + workspace.itemIds.length + ' 项', run: function() { showCollection('workspace:' + workspace.id); } }); });
  state.tagData.slice(0, 100).forEach(function(tag) { items.push({ title: tag.name, hint: '标签', run: function() { api.loadTagItems(tag.name); } }); });
  if (q) getFolderPathMatches(q, state.treeData, [], folderMatches);
  folderMatches.forEach(function(match) {
    items.push({ title: match.path, hint: match.locked ? 'Eagle 保护文件夹' : '文件夹', run: function() { api.loadFolderItems(match.id); } });
  });
  return items.filter(function(item) { return !q || item.title.toLowerCase().indexOf(q) >= 0 || item.hint.toLowerCase().indexOf(q) >= 0; }).slice(0, 30);
}

function getSearchSuggestItems(query) {
  var q = String(query || '').trim();
  if (!q) {
    return [{ title: '输入关键词', hint: '搜索名称、标签或备注', type: 'hint' }];
  }
  return [{ title: q, hint: '搜索关键词', type: 'search', value: q }];
}

function closeSearchSuggest() {
  var suggest = document.getElementById('searchSuggest');
  if (!suggest) return;
  suggest.classList.remove('open');
  suggest.innerHTML = '';
  suggest.dataset.activeIndex = '-1';
}

function runSearchSuggest(item) {
  if (!item || item.type === 'hint') return;
  var search = document.getElementById('searchInput');
  closeSearchSuggest();
  if (item.type === 'tag') {
    if (search) search.value = '#' + item.value;
    api.loadTagItems(item.value);
  } else if (item.type === 'folder') {
    if (search) search.value = '/' + item.title;
    api.loadFolderItems(item.value);
  } else if (item.type === 'search') {
    if (search) search.value = item.value;
    api.doSearch();
  }
}

function setSearchSuggestActive(index) {
  var suggest = document.getElementById('searchSuggest');
  if (!suggest) return;
  var rows = suggest.querySelectorAll('.search-suggest-item');
  if (!rows.length) return;
  var next = Math.max(0, Math.min(rows.length - 1, index));
  suggest.dataset.activeIndex = String(next);
  rows.forEach(function(row, idx) { row.classList.toggle('active', idx === next); });
  rows[next].scrollIntoView({ block: 'nearest' });
}

function renderSearchSuggest() {
  var input = document.getElementById('searchInput');
  var suggest = document.getElementById('searchSuggest');
  if (!input || !suggest) return;
  var q = input.value || '';
  var items = getSearchSuggestItems(q);
  if (!document.activeElement || document.activeElement !== input || (!q && window.innerWidth > 768)) {
    closeSearchSuggest();
    return;
  }
  suggest.innerHTML = items.map(function(item, idx) {
    var attrs = ' data-suggest-index="' + idx + '" data-suggest-type="' + escapeHtml(item.type) + '"';
    if (item.value) attrs += ' data-suggest-value="' + escapeHtml(String(item.value)) + '"';
    return '<button type="button" class="search-suggest-item" role="option"' + attrs + '>' +
      '<span>' + escapeHtml(item.title) + '</span><small>' + escapeHtml(item.hint) + '</small>' +
    '</button>';
  }).join('');
  suggest._items = items;
  suggest.dataset.activeIndex = items.length && items[0].type !== 'hint' ? '0' : '-1';
  suggest.classList.toggle('open', items.length > 0);
  if (items.length && items[0].type !== 'hint') setSearchSuggestActive(0);
}

function renderCommandList() {
  var input = document.getElementById('commandInput');
  var list = document.getElementById('commandList');
  if (!input || !list) return;
  var commands = buildCommandItems(input.value);
  list.innerHTML = '';
  commands.forEach(function(cmd) {
    var row = document.createElement('div');
    row.className = 'command-item';
    row.innerHTML = '<span>' + escapeHtml(cmd.title) + '</span><small>' + escapeHtml(cmd.hint) + '</small>';
    row.onclick = function() {
      closeCommandPalette();
      cmd.run();
    };
    list.appendChild(row);
  });
}

function openCommandPalette() {
  var overlay = document.getElementById('commandOverlay');
  var input = document.getElementById('commandInput');
  if (!overlay || !input) return;
  overlay.classList.add('open');
  input.value = '';
  renderCommandList();
  setTimeout(function() { input.focus(); }, 0);
}

function closeCommandPalette() {
  var overlay = document.getElementById('commandOverlay');
  if (overlay) overlay.classList.remove('open');
}

// ===== View mode =====
function setViewMode(mode, skipPersist) {
  if (['grid', 'list'].indexOf(mode) < 0) mode = 'grid';
  state.viewMode = mode;
  if (!skipPersist) {
    try { localStorage.setItem(getViewModeStorageKey(), mode); } catch (e) {}
  }
  var gridBtn = document.getElementById('viewGrid');
  var justifiedBtn = document.getElementById('viewJustified');
  var listBtn = document.getElementById('viewList');
  if (gridBtn) gridBtn.classList.toggle('active', mode === 'grid');
  if (justifiedBtn) justifiedBtn.classList.toggle('active', mode === 'justified');
  if (listBtn) listBtn.classList.toggle('active', mode === 'list');
  syncCanvasSettings();
}

// ===== Keyboard shortcuts =====
function setupKeyboard() {
  document.addEventListener('keydown', function(e) {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable) return;
    var overlay = document.querySelector('.preview-overlay');
    if (overlay) {
      if (e.key === 'Escape') render.closePreviewOverlay(overlay);
      return;
    }
    if (e.key === 'Escape') {
      if (state.selectedIds.size) {
        state.selectedIds.clear();
        state.lastSelectedId = '';
        updateBatchBar();
        updateCheckboxesInView();
        e.preventDefault();
        return;
      }
      if (document.getElementById('inspector').classList.contains('open')) {
        render.closeInspector();
        return;
      }
    }
    if (document.getElementById('inspector').classList.contains('open')) {
      if (e.key === 'ArrowLeft') {
        navigateInspector(-1);
        e.preventDefault();
        return;
      }
      if (e.key === 'ArrowRight') {
        navigateInspector(1);
        e.preventDefault();
        return;
      }
    }
  });
}

function navigateItems(direction) {
  var cards = document.querySelectorAll('.card, .list-table tbody tr:not(.folder-row)');
  if (!cards.length) return;
  var focused = document.querySelector('.keyboard-focus');
  var idx = -1;
  if (focused) {
    for (var i = 0; i < cards.length; i++) {
      if (cards[i] === focused || cards[i].contains(focused)) { idx = i; break; }
    }
  }
  var newIdx = idx + direction;
  if (newIdx < 0) newIdx = 0;
  if (newIdx >= cards.length) newIdx = cards.length - 1;
  if (newIdx !== idx || !focused) {
    document.querySelectorAll('.keyboard-focus').forEach(function(el) { el.classList.remove('keyboard-focus'); });
    cards[newIdx].classList.add('keyboard-focus');
    cards[newIdx].scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }
}

// ===== Sidebar resize =====
function setupSidebarResize() {
  var sidebar = document.getElementById('sidebar');
  var resizer = document.getElementById('sidebarResizer');
  if (!sidebar || !resizer) return;
  var minW = 180, maxW = 480;
  var stored = localStorage.getItem('eagle-viewer-sidebar-width');
  if (stored) {
    var w = parseInt(stored, 10);
    if (w >= minW && w <= maxW) sidebar.style.width = w + 'px';
  }
  var startX = 0, startW = 0;
  resizer.addEventListener('mousedown', function(e) {
    e.preventDefault();
    startX = e.clientX;
    startW = sidebar.offsetWidth;
    function onMove(e2) {
      var dx = e2.clientX - startX;
      var newW = Math.max(minW, Math.min(maxW, startW + dx));
      sidebar.style.width = newW + 'px';
      try { localStorage.setItem('eagle-viewer-sidebar-width', String(newW)); } catch (err) {}
    }
    function onUp() {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    }
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  });
}

// ===== Sidebar toggle =====
function setupSidebarToggle() {
  var wrap = document.getElementById('sidebarWrap');
  var btn = document.getElementById('sidebarToggle');
  if (!wrap || !btn) return;
  var visible = localStorage.getItem('eagle-viewer-sidebar-visible');
  if (visible === 'false') {
    wrap.classList.add('hidden');
    btn.innerHTML = iconChevronRightSm();
  }
  btn.addEventListener('click', function() {
    if (wrap.classList.contains('hidden')) {
      wrap.classList.remove('hidden');
      btn.innerHTML = iconChevronLeft();
      try { localStorage.setItem('eagle-viewer-sidebar-visible', 'true'); } catch (e) {}
    } else {
      wrap.classList.add('hidden');
      btn.innerHTML = iconChevronRightSm();
      try { localStorage.setItem('eagle-viewer-sidebar-visible', 'false'); } catch (e) {}
    }
  });
}

// ===== Mobile menu =====
function setupMobileMenu() {
  var menuBtn = document.getElementById('menuBtn');
  var wrap = document.getElementById('sidebarWrap');
  var overlay = document.getElementById('sidebarOverlay');
  if (!menuBtn || !wrap || !overlay) return;
  function openSidebar() {
    wrap.classList.add('mobile-open');
    overlay.classList.add('visible');
    setMobileTabActive('mobileMoreBtn');
  }
  function closeSidebar() {
    wrap.classList.remove('mobile-open');
    overlay.classList.remove('visible');
    syncMobileTabbar();
  }
  menuBtn.onclick = function() {
    if (wrap.classList.contains('mobile-open')) closeSidebar();
    else openSidebar();
  };
  overlay.onclick = closeSidebar;
  window._closeMobileSidebar = closeSidebar;
  window._openMobileSidebar = openSidebar;
}

function getTopSourceDomainQuickItems(limit) {
  var counts = {};
  (state.currentItems || []).forEach(function(item) {
    var domain = getItemSourceDomain(item);
    if (!domain) return;
    counts[domain] = (counts[domain] || 0) + 1;
  });
  return Object.keys(counts).sort(function(a, b) {
    if (counts[b] !== counts[a]) return counts[b] - counts[a];
    return a.localeCompare(b);
  }).slice(0, limit || 4).map(function(domain) {
    return {
      key: 'source:' + domain,
      group: 'source',
      title: domain,
      hint: counts[domain] + ' 项 · 当前视图',
      meta: '来源',
      run: function() { openSourceDomainView(domain); }
    };
  });
}

function openSourceDomainView(domain) {
  var normalized = normalizeFilterSourceDomain(domain || '');
  if (!normalized) return;
  var search = document.getElementById('searchInput');
  if (search) search.value = '';
  clearAllActive();
  state.advancedFilters = Object.assign({}, state.advancedFilters || {}, { source_domain: normalized });
  syncFilterForm();
  syncToolbarSelects();
  api.refreshCurrentView();
}

function paletteColorToHex(color) {
  if (!Array.isArray(color) || color.length !== 3) return '';
  return '#' + color.map(function(channel) {
    var value = Math.max(0, Math.min(255, Math.round(Number(channel) || 0)));
    return value.toString(16).padStart(2, '0');
  }).join('');
}

function normalizePaletteBucket(hex) {
  var raw = String(hex || '').replace('#', '').trim();
  if (!/^[0-9a-f]{6}$/i.test(raw)) return '';
  var r = parseInt(raw.slice(0, 2), 16);
  var g = parseInt(raw.slice(2, 4), 16);
  var b = parseInt(raw.slice(4, 6), 16);
  var bucket = [r, g, b].map(function(value) {
    return Math.max(0, Math.min(255, Math.round(value / 48) * 48));
  });
  return '#' + bucket.map(function(value) {
    return value.toString(16).padStart(2, '0');
  }).join('');
}

function getItemPrimaryPaletteColor(item) {
  var palettes = (item && item.palettes) || [];
  for (var i = 0; i < palettes.length; i += 1) {
    var hex = paletteColorToHex(palettes[i] && palettes[i].color);
    if (normalizePaletteBucket(hex)) return hex;
  }
  return '';
}

function getTopPaletteQuickItems(limit) {
  var buckets = {};
  (state.currentItems || []).forEach(function(item) {
    (item.palettes || []).slice(0, 3).forEach(function(entry) {
      var hex = paletteColorToHex(entry && entry.color);
      var bucket = normalizePaletteBucket(hex);
      if (!bucket) return;
      if (!buckets[bucket]) buckets[bucket] = { count: 0, ratio: 0, color: hex || bucket };
      buckets[bucket].count += 1;
      buckets[bucket].ratio += Number((entry && entry.ratio) || 0);
    });
  });
  return Object.keys(buckets).sort(function(a, b) {
    if (buckets[b].count !== buckets[a].count) return buckets[b].count - buckets[a].count;
    return buckets[b].ratio - buckets[a].ratio;
  }).slice(0, limit || 5).map(function(bucket) {
    var data = buckets[bucket];
    return {
      key: 'color:' + data.color,
      group: 'color',
      title: data.color.toUpperCase(),
      hint: data.count + ' 项 · 相近主色',
      meta: '主色',
      color: data.color,
      run: function() { openPaletteColorView(data.color); }
    };
  });
}

function openPaletteColorView(color) {
  var normalized = String(color || '').trim();
  if (!/^#[0-9a-f]{6}$/i.test(normalized)) return;
  var search = document.getElementById('searchInput');
  if (search) search.value = '';
  clearAllActive();
  if (render && render.closeInspector) render.closeInspector();
  state.listType = 'all';
  state.advancedFilters = { color: normalized, color_tolerance: 72 };
  syncToolbarSelects();
  syncFilterForm();
  api.loadAllItems(true);
}

function getSavedViewQuickItems(limit) {
  var max = limit || 4;
  var views = state.savedViews || [];
  var quickViews = views.slice(-max).reverse();
  var items = quickViews.map(function(view, idx) {
    return {
      key: 'saved:' + idx + ':' + (view.name || ''),
      group: 'saved',
      title: view.name || '未命名视图',
      hint: getSavedViewSummary(view),
      meta: 'Smart',
      run: function() { applySavedView(view); }
    };
  });
  if (views.length > max) {
    items.push({
      key: 'saved:manage',
      group: 'saved',
      title: '管理全部',
      hint: '还有 ' + (views.length - max) + ' 个智能视图',
      meta: 'More',
      run: function() { renderSavedViews(); openPanel('savedViewsPanel'); }
    });
  }
  return items;
}

function getEagleSmartFolderQuickItems(limit) {
  var flattened = [];
  function collect(nodes) {
    (nodes || []).forEach(function(node) {
      flattened.push(node);
      collect(node.children || []);
    });
  }
  collect(state.eagleSmartFolders || []);
  return flattened.slice(0, limit || 6).map(function(node) {
    return {
      key: 'eagle-smart:' + node.id,
      group: 'eagle-smart',
      title: node.name || 'Eagle 智能文件夹',
      hint: (node.count || 0) + ' 项 · ' + (node.ruleSummary || '自动规则'),
      meta: 'Eagle',
      run: function() { api.loadEagleSmartFolderItems(node.id); }
    };
  });
}

function getMobileSearchQuickItems() {
  var recentCount = (state.collectionIds.recentViewed || []).length || 0;
  var favoriteCount = (state.collectionIds.favorite || []).length || 0;
  return [
    { key: 'recentViewed', group: 'continue', title: '最近查看', hint: recentCount + ' 项', meta: recentCount ? '继续' : '空', run: function() { showCollection('recentViewed'); } },
    { key: 'favorite', group: 'browse', title: '收藏', hint: favoriteCount + ' 项', run: function() { showCollection('favorite'); } },
    { key: 'recent7', group: 'browse', title: '最近 7 天', hint: '新增素材', run: function() { api.loadRecentItems(7); } }
  ];
}

function renderMobileSearchQuick() {
  var quick = document.getElementById('mobileSearchQuick');
  if (!quick) return;
  var groups = [
    { key: 'continue', title: '继续浏览', hint: '回到最近内容' },
    { key: 'browse', title: '快速浏览', hint: '常用入口' }
  ];
  var items = getMobileSearchQuickItems();
  quick.innerHTML = renderMobileSearchStatusCard() + groups.map(function(group) {
    var groupItems = items.filter(function(item) { return item.group === group.key; });
    if (!groupItems.length) return '';
    return '<section class="mobile-search-quick-group" data-quick-group="' + escapeHtml(group.key) + '">' +
      '<div class="mobile-search-quick-title"><span>' + escapeHtml(group.title) + '</span><em>' + escapeHtml(group.hint) + '</em></div>' +
      '<div class="mobile-search-quick-grid">' +
        groupItems.map(function(item) {
          return '<button type="button" data-mobile-search-quick="' + escapeHtml(item.key) + '"' + (item.tone ? ' data-tone="' + escapeHtml(item.tone) + '"' : '') + (item.color ? ' data-color-quick="true" style="--quick-color:' + escapeHtml(item.color) + '"' : '') + '>' +
            '<strong>' + escapeHtml(item.title) + '</strong><span>' + escapeHtml(item.hint) + '</span>' +
            (item.meta ? '<em>' + escapeHtml(item.meta) + '</em>' : '') +
          '</button>';
        }).join('') +
      '</div>' +
    '</section>';
  }).join('');
}

function renderMobileSearchStatusCard() {
  var snapshot = getOfflineSnapshotMeta();
  var strip = document.getElementById('remoteStatusStrip');
  var stripState = strip && !strip.hidden ? strip.dataset.state : '';
  var offline = navigator.onLine === false || stripState === 'offline';
  var checking = stripState === 'checking';
  if (!offline && !checking && !snapshot) return '';
  var title = offline ? (snapshot ? '正在使用可用快照' : '远程 Vault 暂不可达') : (checking ? '正在检查远程连接' : '离线快照已准备');
  var meta = offline
    ? (snapshot ? ('最近快照 · ' + formatSnapshotAge(snapshot.savedAt) + ' · ' + (snapshot.ok || 0) + ' 项') : '没有可用快照，建议回到内网或 VPN 后保存')
    : (checking ? '检查完成前可继续浏览已缓存内容' : ('保存于 ' + formatSnapshotAge(snapshot.savedAt) + ' · ' + (snapshot.ok || 0) + ' 项'));
  return '<div class="mobile-search-status-card" data-state="' + (offline ? 'offline' : (checking ? 'checking' : 'ready')) + '">' +
    '<span></span>' +
    '<div><strong>' + escapeHtml(title) + '</strong><small>' + escapeHtml(meta) + '</small></div>' +
    '<button type="button" data-mobile-search-status-action="reconnect">' + (offline ? '重连' : '检查') + '</button>' +
    '<button type="button" data-mobile-search-status-action="snapshot">保存</button>' +
  '</div>';
}

function syncMobileSearchTypes() {
  var wrap = document.getElementById('mobileSearchTypes');
  if (!wrap) return;
  wrap.querySelectorAll('[data-mobile-type]').forEach(function(btn) {
    var active = btn.dataset.mobileType === state.listType;
    btn.classList.toggle('active', active);
    btn.setAttribute('aria-pressed', active ? 'true' : 'false');
  });
}

function syncMobileSearchSort() {
  var wrap = document.getElementById('mobileSearchSort');
  if (!wrap) return;
  wrap.querySelectorAll('[data-mobile-sort]').forEach(function(btn) {
    var active = btn.dataset.mobileSort === state.listSort;
    btn.classList.toggle('active', active);
    btn.setAttribute('aria-pressed', active ? 'true' : 'false');
  });
  var dirBtn = wrap.querySelector('[data-mobile-dir-toggle]');
  if (dirBtn) {
    var asc = state.listDir === 'asc';
    dirBtn.textContent = asc ? '升序 ↑' : '降序 ↓';
    dirBtn.classList.toggle('active', true);
    dirBtn.setAttribute('aria-pressed', asc ? 'true' : 'false');
  }
}

function syncMobileSearchView() {
  var wrap = document.getElementById('mobileSearchView');
  if (!wrap) return;
  wrap.querySelectorAll('[data-mobile-view]').forEach(function(btn) {
    var active = btn.dataset.mobileView === state.viewMode;
    btn.classList.toggle('active', active);
    btn.setAttribute('aria-pressed', active ? 'true' : 'false');
  });
  var density = document.getElementById('gridDensityRange');
  var value = density ? Number(density.value || 164) : 164;
  wrap.querySelectorAll('[data-mobile-density]').forEach(function(btn) {
    var active = Number(btn.dataset.mobileDensity) === value;
    btn.classList.toggle('active', active);
    btn.setAttribute('aria-pressed', active ? 'true' : 'false');
  });
}

function getMobileSearchResults(query) {
  var q = (query || '').trim();
  var results = [];
  var seen = {};
  function push(type, title, hint, value) {
    var key = type + ':' + String(value || title);
    if (seen[key]) return;
    seen[key] = true;
    results.push({ type: type, title: title, hint: hint, value: value });
  }
  if (q) {
    getSearchSuggestItems(q).forEach(function(item) {
      if (item.type === 'hint') return;
      push(item.type, item.title, item.hint, item.value);
    });
    buildCommandItems(q).slice(0, 8).forEach(function(item) {
      push('command', item.title, item.hint, item);
    });
    getEagleSmartFolderQuickItems(40).forEach(function(item) {
      if ((item.title + ' ' + item.hint).toLowerCase().indexOf(q.toLowerCase()) >= 0) push('eagle-smart', item.title, item.hint, item.key.replace('eagle-smart:', ''));
    });
  } else {
    getEagleSmartFolderQuickItems(8).forEach(function(item) {
      push('eagle-smart', item.title, item.hint, item.key.replace('eagle-smart:', ''));
    });
    state.tagData.slice(0, 8).forEach(function(tag) {
      push('tag', '#' + tag.name, (tag.count || 0) + ' 项 · 标签', tag.name);
    });
    var folders = [];
    getFolderPathMatches('', state.treeData, [], folders);
    folders.slice(0, 8).forEach(function(folder) {
      push('folder', folder.path, '文件夹', folder.id);
    });
  }
  return results.slice(0, 16);
}

function renderMobileSearchResults() {
  var input = document.getElementById('mobileSearchInput');
  var list = document.getElementById('mobileSearchResults');
  if (!input || !list) return;
  var q = input.value || '';
  var results = getMobileSearchResults(q);
  list._items = results;
  if (!results.length) {
    list.innerHTML =
      '<div class="mobile-search-empty">' +
        '<strong>没有匹配项</strong>' +
        '<span>试试素材名称、标签或备注。</span>' +
        '<div class="mobile-search-empty-actions">' +
          '<button type="button" data-mobile-search-template="">关键词</button>' +
        '</div>' +
      '</div>';
    return;
  }
  var groupLabels = { command: '快捷入口', 'eagle-smart': 'Eagle 智能文件夹', tag: '标签', folder: '文件夹', search: '搜索建议' };
  var groupOrder = ['command', 'eagle-smart', 'tag', 'folder', 'search'];
  var groups = {};
  groupOrder.forEach(function(type) { groups[type] = []; });
  results.forEach(function(item, idx) {
    var type = groupLabels[item.type] ? item.type : 'search';
    groups[type].push({ item: item, idx: idx });
  });
  list.innerHTML = groupOrder.map(function(type) {
    if (!groups[type].length) return '';
    return '<section class="mobile-search-result-group" data-result-group="' + escapeHtml(type) + '">' +
      '<div class="mobile-search-result-group-title"><span>' + escapeHtml(groupLabels[type]) + '</span><em>' + groups[type].length + '</em></div>' +
      groups[type].map(function(entry) {
        var item = entry.item;
        var idx = entry.idx;
        var kicker = item.type === 'tag' ? '标签' : item.type === 'folder' ? '文件夹' : item.type === 'eagle-smart' ? 'Eagle' : item.type === 'search' ? '搜索' : '跳转';
        return '<button type="button" class="mobile-search-result" data-result-type="' + escapeHtml(item.type) + '" data-mobile-search-index="' + idx + '">' +
          '<span>' + escapeHtml(kicker) + '</span><strong>' + escapeHtml(item.title) + '</strong><small>' + escapeHtml(item.hint) + '</small>' +
        '</button>';
      }).join('') +
    '</section>';
  }).join('');
}

function resetMobileSheetDrag(overlay, panelSelector, backdropSelector) {
  if (!overlay) return;
  var panel = overlay.querySelector(panelSelector);
  var backdrop = overlay.querySelector(backdropSelector);
  if (panel) {
    panel.classList.remove('sheet-dragging');
    panel.style.transform = '';
  }
  if (backdrop) backdrop.style.opacity = '';
}

function bindMobileSheetDrag(overlay, panelSelector, backdropSelector, closeFn) {
  if (!overlay || overlay._mobileSheetDragBound) return;
  overlay._mobileSheetDragBound = true;
  var drag = null;

  function getPanel() {
    return overlay.querySelector(panelSelector);
  }

  function getBackdrop() {
    return overlay.querySelector(backdropSelector);
  }

  overlay.addEventListener('touchstart', function(e) {
    var panel = getPanel();
    if (!panel || !e.touches || e.touches.length !== 1) return;
    if (e.target.closest('button, a, input, textarea, select')) return;
    drag = {
      startY: e.touches[0].clientY,
      lastY: e.touches[0].clientY,
      startedAt: Date.now(),
      active: false,
      fromHandle: !!e.target.closest('.quick-action-grabber, .mobile-search-head, .mobile-more-head')
    };
  }, { passive: true });

  overlay.addEventListener('touchmove', function(e) {
    var panel = getPanel();
    if (!drag || !panel || !e.touches || e.touches.length !== 1) return;
    var currentY = e.touches[0].clientY;
    var dy = currentY - drag.startY;
    drag.lastY = currentY;
    if (dy <= 0) {
      if (drag.active) resetMobileSheetDrag(overlay, panelSelector, backdropSelector);
      return;
    }
    if (!drag.fromHandle && panel.scrollTop > 0) return;
    drag.active = true;
    panel.classList.add('sheet-dragging');
    var eased = Math.min(190, dy * 0.78);
    panel.style.transform = 'translateY(' + eased + 'px)';
    var backdrop = getBackdrop();
    if (backdrop) backdrop.style.opacity = String(Math.max(0.24, 1 - eased / 220));
    e.preventDefault();
  }, { passive: false });

  overlay.addEventListener('touchend', function() {
    if (!drag) return;
    var dy = drag.lastY - drag.startY;
    var elapsed = Math.max(1, Date.now() - drag.startedAt);
    var velocity = dy / elapsed;
    if (drag.active && (dy > 96 || velocity > 0.62)) closeFn();
    else resetMobileSheetDrag(overlay, panelSelector, backdropSelector);
    drag = null;
  });

  overlay.addEventListener('touchcancel', function() {
    resetMobileSheetDrag(overlay, panelSelector, backdropSelector);
    drag = null;
  });
}

function closeMobileSearchSheet() {
  var overlay = document.getElementById('mobileSearchOverlay');
  if (!overlay) return;
  var tab = document.getElementById('mobileSearchBtn');
  resetMobileSheetDrag(overlay, '.mobile-search-sheet', '.mobile-search-backdrop');
  overlay.classList.remove('open');
  overlay.classList.add('closing');
  overlay.setAttribute('aria-hidden', 'true');
  if (tab) tab.setAttribute('aria-expanded', 'false');
  document.body.classList.remove('mobile-search-open');
  setTimeout(function() { overlay.classList.remove('closing'); }, 180);
  syncMobileTabbar();
}

function runMobileSearchResult(item) {
  if (!item) return;
  var search = document.getElementById('searchInput');
  var mobileInput = document.getElementById('mobileSearchInput');
  closeMobileSearchSheet();
  if (item.type === 'tag') {
    if (search) search.value = '#' + item.value;
    api.loadTagItems(item.value);
  } else if (item.type === 'folder') {
    if (search) search.value = '/' + item.title;
    api.loadFolderItems(item.value);
  } else if (item.type === 'eagle-smart') {
    api.loadEagleSmartFolderItems(item.value);
  } else if (item.type === 'search') {
    if (search) search.value = item.value;
    api.doSearch();
  } else if (item.type === 'command' && item.value && typeof item.value.run === 'function') {
    item.value.run();
  } else if (mobileInput && mobileInput.value.trim()) {
    if (search) search.value = mobileInput.value.trim();
    api.doSearch();
  }
}

function runMobileSearchSubmit() {
  var mobileInput = document.getElementById('mobileSearchInput');
  var search = document.getElementById('searchInput');
  if (!mobileInput) return;
  var q = mobileInput.value.trim();
  if (!q) return;
  closeMobileSearchSheet();
  if (search) search.value = q;
  api.doSearch();
}

function setupMobileSearchSheet() {
  var overlay = document.getElementById('mobileSearchOverlay');
  var input = document.getElementById('mobileSearchInput');
  var submit = document.getElementById('mobileSearchSubmit');
  var results = document.getElementById('mobileSearchResults');
  var quick = document.getElementById('mobileSearchQuick');
  if (!overlay || !input || overlay._bound) return;
  overlay._bound = true;

  function openMobileSearchSheet() {
    if (window._closeMobileSidebar) window._closeMobileSidebar();
    if (window._closeMobileMoreSheet) window._closeMobileMoreSheet();
    var mainSearch = document.getElementById('searchInput');
    input.value = mainSearch ? mainSearch.value : '';
    renderMobileSearchQuick();
    syncMobileSearchTypes();
    syncMobileSearchSort();
    syncMobileSearchView();
    renderMobileSearchResults();
    overlay.classList.remove('closing');
    overlay.classList.add('open');
    overlay.setAttribute('aria-hidden', 'false');
    var tab = document.getElementById('mobileSearchBtn');
    if (tab) tab.setAttribute('aria-expanded', 'true');
    document.body.classList.add('mobile-search-open');
    setMobileTabActive('mobileSearchBtn');
    setTimeout(function() { input.focus(); input.select(); }, 80);
  }

  overlay.addEventListener('click', function(e) {
    if (e.target.closest('[data-mobile-search-close]')) {
      closeMobileSearchSheet();
      return;
    }
    var statusAction = e.target.closest('[data-mobile-search-status-action]');
    if (statusAction) {
      var status = statusAction.dataset.mobileSearchStatusAction;
      if (status === 'reconnect') checkRemoteStatus({ reload: false, quietStrip: false, message: '正在检查远程 Vault…' });
      else if (status === 'snapshot') api.warmCurrentOfflineSnapshot();
      return;
    }
    var quickBtn = e.target.closest('[data-mobile-search-quick]');
    if (quickBtn) {
      var quickItem = getMobileSearchQuickItems().find(function(item) { return item.key === quickBtn.dataset.mobileSearchQuick; });
      closeMobileSearchSheet();
      if (quickItem && typeof quickItem.run === 'function') quickItem.run();
      return;
    }
    var templateBtn = e.target.closest('[data-mobile-search-template]');
    if (templateBtn) {
      var prefix = templateBtn.dataset.mobileSearchTemplate || '';
      input.value = prefix;
      renderMobileSearchResults();
      input.focus();
      input.setSelectionRange(input.value.length, input.value.length);
      return;
    }
    var typeBtn = e.target.closest('[data-mobile-type]');
    if (typeBtn) {
      state.listType = typeBtn.dataset.mobileType || 'all';
      syncToolbarSelects();
      syncMobileSearchTypes();
      closeMobileSearchSheet();
      api.refreshCurrentView();
      return;
    }
    var sortBtn = e.target.closest('[data-mobile-sort]');
    if (sortBtn) {
      state.listSort = sortBtn.dataset.mobileSort || 'mtime';
      syncToolbarSelects();
      syncMobileSearchSort();
      closeMobileSearchSheet();
      api.refreshCurrentView();
      return;
    }
    var dirBtn = e.target.closest('[data-mobile-dir-toggle]');
    if (dirBtn) {
      state.listDir = state.listDir === 'asc' ? 'desc' : 'asc';
      syncToolbarSelects();
      syncMobileSearchSort();
      closeMobileSearchSheet();
      api.refreshCurrentView();
      return;
    }
    var viewBtn = e.target.closest('[data-mobile-view]');
    if (viewBtn) {
      setViewMode(viewBtn.dataset.mobileView || 'grid');
      syncMobileSearchView();
      closeMobileSearchSheet();
      if (state.currentItems.length || state.currentSubfolders.length) render.renderContent();
      return;
    }
    var densityBtn = e.target.closest('[data-mobile-density]');
    if (densityBtn) {
      setCanvasDensity(densityBtn.dataset.mobileDensity || '164');
      setViewMode('grid');
      syncMobileSearchView();
      closeMobileSearchSheet();
      if (state.currentItems.length || state.currentSubfolders.length) render.renderContent();
      return;
    }
    var row = e.target.closest('[data-mobile-search-index]');
    if (row && results && results._items) {
      runMobileSearchResult(results._items[Number(row.dataset.mobileSearchIndex)]);
    }
  });
  bindMobileSheetDrag(overlay, '.mobile-search-sheet', '.mobile-search-backdrop', closeMobileSearchSheet);
  input.oninput = renderMobileSearchResults;
  input.onkeydown = function(e) {
    if (e.key === 'Escape') {
      closeMobileSearchSheet();
    } else if (e.key === 'Enter') {
      var first = results && results._items ? results._items[0] : null;
      if (first && input.value.trim().charAt(0) !== '') runMobileSearchResult(first);
      else runMobileSearchSubmit();
    }
  };
  if (submit) submit.onclick = runMobileSearchSubmit;
  if (quick) quick.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') closeMobileSearchSheet();
  });
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape' && overlay.classList.contains('open')) closeMobileSearchSheet();
  });
  window.addEventListener('eagle-viewer-offline-snapshot', function() {
    renderMobileSearchQuick();
  });

  window._openMobileSearchSheet = openMobileSearchSheet;
  window._closeMobileSearchSheet = closeMobileSearchSheet;
}

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
  syncMobileMoreHandoff();
}

function syncMobileMoreHandoff() {
  syncMobileCurrentViewCard();
  syncMobileOfflineStorageCard();
  var recentEl = document.getElementById('mobileHandoffRecent');
  var snapshotEl = document.getElementById('mobileHandoffSnapshot');
  var reviewEl = document.getElementById('mobileHandoffReview');
  if (recentEl) recentEl.textContent = ((state.collectionIds.recentViewed || []).length || 0) + ' 项';
  if (reviewEl) {
    var doneCount = (state.collectionIds.done || []).length || 0;
    reviewEl.textContent = doneCount ? ('已处理 ' + doneCount + ' 项') : '未处理队列';
  }
  if (snapshotEl) {
    var snapshot = getOfflineSnapshotMeta();
    snapshotEl.textContent = snapshot ? (formatSnapshotAge(snapshot.savedAt) + ' · ' + (snapshot.ok || 0) + ' 项') : '未保存';
  }
}

function syncMobileCurrentViewCard() {
  var card = document.getElementById('mobileCurrentViewCard');
  if (!card) return;
  var kind = document.getElementById('mobileCurrentViewKind');
  var title = document.getElementById('mobileCurrentViewTitle');
  var meta = document.getElementById('mobileCurrentViewMeta');
  var viewKind = typeof getMobileWorkbarKind === 'function' ? getMobileWorkbarKind() : '当前视图';
  var viewTitle = typeof getMobileWorkbarTitle === 'function' ? getMobileWorkbarTitle() : (state.currentTitle || '资料库');
  var viewMeta = typeof getMobileWorkbarMeta === 'function' ? getMobileWorkbarMeta() : ((state.currentItems || []).length + ' 项');
  var snapshot = getOfflineSnapshotMeta();
  if (kind) kind.textContent = viewKind;
  if (title) title.textContent = viewTitle;
  if (meta) meta.textContent = viewMeta + (snapshot ? (' · 快照 ' + formatSnapshotAge(snapshot.savedAt)) : ' · 可保存快照');
  card.dataset.view = state.currentView || 'all';
}

function syncMobileOfflineStorageCard() {
  var card = document.getElementById('mobileOfflineStorage');
  if (!card) return;
  var title = document.getElementById('mobileOfflineStorageTitle');
  var meta = document.getElementById('mobileOfflineStorageMeta');
  var usage = document.getElementById('mobileOfflineStorageUsage');
  var count = document.getElementById('mobileOfflineStorageCount');
  var bar = document.getElementById('mobileOfflineStorageBar');
  var clear = document.getElementById('mobileOfflineStorageClear');
  var list = document.getElementById('mobileOfflineViewList');
  var snapshot = getOfflineSnapshotMeta();
  var catalog = api.getOfflineSnapshotCatalog ? api.getOfflineSnapshotCatalog() : [];
  var latest = catalog[0] || snapshot;
  card.dataset.state = latest ? 'saved' : 'empty';
  if (title) title.textContent = catalog.length ? ('已保存 ' + catalog.length + ' 个离线视图') : (snapshot ? (snapshot.title || '当前视图') : '尚未保存离线数据');
  if (meta) {
    meta.textContent = latest
      ? ('最近：' + (latest.title || '当前视图') + ' · ' + formatSnapshotAge(latest.savedAt) + ' · 应用外壳独立保留')
      : '保存当前视图后可离线浏览索引与缩略图';
  }
  if (count) count.textContent = latest ? ((latest.ok || 0) + ' / ' + (latest.total || latest.ok || 0) + ' 项') : '0 项';
  if (clear) clear.disabled = !latest;
  if (list) {
    list.hidden = !catalog.length;
    list.innerHTML = catalog.map(function(entry) {
      return '<button type="button" data-mobile-offline-route="' + escapeHtml(entry.route) + '">' +
        '<span><em>' + escapeHtml(entry.view === 'folder' ? '文件夹' : entry.view === 'tag' ? '标签' : entry.view === 'search' ? '搜索' : entry.view === 'smart' ? '智能视图' : entry.view === 'collection' ? '清单' : '视图') + '</em>' +
        '<strong>' + escapeHtml(entry.title || '当前视图') + '</strong>' +
        '<small>' + escapeHtml(formatSnapshotAge(entry.savedAt) + ' · ' + (entry.ok || 0) + '/' + (entry.total || entry.ok || 0) + ' 项') + '</small></span>' +
        iconChevronRight() +
      '</button>';
    }).join('');
  }
  if (!navigator.storage || !navigator.storage.estimate) {
    if (usage) usage.textContent = '浏览器未提供用量';
    if (bar) bar.style.width = '0%';
    return;
  }
  navigator.storage.estimate().then(function(estimate) {
    var used = Number(estimate.usage || 0);
    var quota = Number(estimate.quota || 0);
    var percent = quota > 0 ? Math.min(100, used / quota * 100) : 0;
    if (usage) usage.textContent = '本站 ' + formatSize(used) + (quota ? (' / ' + formatSize(quota)) : '');
    if (bar) bar.style.width = percent + '%';
  }).catch(function() {
    if (usage) usage.textContent = '暂时无法读取用量';
    if (bar) bar.style.width = '0%';
  });
}

async function openOfflineSnapshotRoute(route) {
  var normalized = String(route || '');
  if (normalized.indexOf('#view=') !== 0 || !applyStateFromHash(normalized)) {
    if (window.showToast) window.showToast('离线视图入口已失效', 'error');
    return false;
  }
  if (state.inspectorItem && render.closeInspector) render.closeInspector();
  var search = document.getElementById('searchInput');
  if (search && state.currentView === 'search') search.value = state.searchQuery || '';
  syncFilterForm();
  syncToolbarSelects();
  await api.refreshCurrentView();
  if (render.syncActiveNavigationState) render.syncActiveNavigationState();
  syncMobileTabbar();
  if (window.showToast) window.showToast(navigator.onLine === false ? '已打开离线视图' : '已打开已保存视图', 'success');
  return true;
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
    updateBatchOutputSheetState();
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
  updateBatchOutputSheetState();
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
    updateBatchOutputSheetState();
    flashBatchOutputSnapshotState(event.detail || {});
    syncMobileMoreHandoff();
    renderMobileSearchQuick();
  });
  window.addEventListener('eagle-viewer-offline-snapshot-cleared', function() {
    updateMobileRemoteCard(navigator.onLine === false ? 'offline' : 'online', '离线数据已清除');
    if (render && render.updateMobileWorkbar) render.updateMobileWorkbar();
    if (render && render.refreshOpenPreviewMobileActions) render.refreshOpenPreviewMobileActions();
    updateBatchOutputSheetState();
    syncMobileMoreHandoff();
    renderMobileSearchQuick();
  });
}

function setupMobileMoreSheet() {
  var sheet = document.getElementById('mobileMoreOverlay');
  if (!sheet || sheet._bound) return;
  sheet._bound = true;

  function closeMoreSheet() {
    var tab = document.getElementById('mobileMoreBtn');
    resetMobileSheetDrag(sheet, '.mobile-more-sheet', '.mobile-more-backdrop');
    sheet.classList.remove('open');
    sheet.classList.add('closing');
    sheet.setAttribute('aria-hidden', 'true');
    if (tab) tab.setAttribute('aria-expanded', 'false');
    document.body.classList.remove('mobile-more-open');
    setTimeout(function() { sheet.classList.remove('closing'); }, 180);
    syncMobileTabbar();
  }

  function openMoreSheet() {
    if (window._closeMobileSidebar) window._closeMobileSidebar();
    syncMobileMoreHandoff();
    sheet.classList.remove('closing');
    sheet.classList.add('open');
    sheet.setAttribute('aria-hidden', 'false');
    var tab = document.getElementById('mobileMoreBtn');
    if (tab) tab.setAttribute('aria-expanded', 'true');
    document.body.classList.add('mobile-more-open');
    setMobileTabActive('mobileMoreBtn');
    var remoteStrip = document.getElementById('remoteStatusStrip');
    if (remoteStrip && remoteStrip.dataset.state === 'changed') updateMobileRemoteCard('changed', '发现 Vault 更新');
    else refreshMobileRemoteStatus(true);
  }

  sheet.addEventListener('click', function(e) {
    if (e.target.closest('[data-mobile-more-close]')) {
      closeMoreSheet();
      return;
    }
    if (e.target.closest('#mobileRemoteRefresh')) {
      var remoteCard = document.getElementById('mobileRemoteCard');
      if (remoteCard && remoteCard.dataset.state === 'changed') applyDetectedLibraryUpdate();
      else refreshMobileRemoteStatus(false);
      return;
    }
    var offlineView = e.target.closest('[data-mobile-offline-route]');
    if (offlineView) {
      closeMoreSheet();
      openOfflineSnapshotRoute(offlineView.dataset.mobileOfflineRoute);
      return;
    }
    var actionEl = e.target.closest('[data-mobile-more-action]');
    if (!actionEl) return;
    var action = actionEl.dataset.mobileMoreAction;
    if (action === 'clear-offline-snapshot' && !window.confirm('清除当前离线索引与缩略图？应用外壳、收藏和智能视图会保留。')) return;
    closeMoreSheet();
    if (action === 'sidebar') {
      if (window._openMobileSidebar) window._openMobileSidebar();
    } else if (action === 'eagle-smart') {
      if (window._openMobileSidebar) window._openMobileSidebar();
      setTimeout(function() {
        var nativeSection = document.getElementById('nativeSmartFolderSection');
        if (nativeSection) nativeSection.scrollIntoView({ block: 'center', behavior: 'smooth' });
      }, 120);
    } else if (action === 'canvas') {
      syncCanvasSettings();
      openPanel('canvasSettingsPanel');
    } else if (action === 'smart') {
      renderSavedViews();
      openPanel('savedViewsPanel');
    } else if (action === 'workspaces') {
      openWorkspacesPanel([]);
    } else if (action === 'review-undone') {
      startUndoneReview();
    } else if (action === 'recent-viewed') {
      showCollection('recentViewed');
    } else if (action === 'filter') {
      syncFilterForm();
      openPanel('advancedPanel');
    } else if (action === 'share-view') {
      shareCurrentViewLink(actionEl);
    } else if (action === 'save-smart-view') {
      promptSaveCurrentSmartView();
    } else if (action === 'duplicates') {
      clearAllActive();
      document.getElementById('sidebarDuplicates').classList.add('active');
      api.loadDuplicates();
    } else if (action === 'colors') {
      clearAllActive();
      document.getElementById('sidebarColors').classList.add('active');
      api.loadColorAtlas();
    } else if (action === 'random') {
      clearAllActive();
      document.getElementById('sidebarRandom').classList.add('active');
      api.loadRandomWalk('', true);
    } else if (action === 'stats') {
      openPanel('statsPanel');
      api.fetchStats().then(renderStatsPanel);
    } else if (action === 'command') {
      openCommandPalette();
    } else if (action === 'offline-snapshot') {
      api.warmCurrentOfflineSnapshot();
    } else if (action === 'clear-offline-snapshot') {
      api.clearOfflineSnapshot();
    } else if (action === 'refresh') {
      api.reloadLibrary();
    } else if (action === 'theme') {
      toggleTheme();
    } else if (action === 'logout') {
      window.location.href = '/logout';
    }
  });
  bindMobileSheetDrag(sheet, '.mobile-more-sheet', '.mobile-more-backdrop', closeMoreSheet);

  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape' && sheet.classList.contains('open')) closeMoreSheet();
  });
  window._openMobileMoreSheet = openMoreSheet;
  window._closeMobileMoreSheet = closeMoreSheet;
}

function isStandaloneDisplay() {
  return !!(window.navigator.standalone || (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches));
}

function isIosLikeDevice() {
  var ua = window.navigator.userAgent || '';
  var platform = window.navigator.platform || '';
  return /iPad|iPhone|iPod/.test(ua) || (platform === 'MacIntel' && window.navigator.maxTouchPoints > 1);
}

function shouldShowInstallCoach() {
  if (window.innerWidth > 768) return false;
  if (!isIosLikeDevice()) return false;
  if (isStandaloneDisplay()) return false;
  var dismissedUntil = Number(localStorage.getItem('eagle-viewer-install-coach-dismissed-until') || 0);
  return !dismissedUntil || dismissedUntil < Date.now();
}

function hideInstallCoach() {
  var coach = document.getElementById('installCoach');
  if (!coach) return;
  coach.hidden = true;
  document.body.classList.remove('install-coach-visible');
}

function showInstallCoach() {
  var coach = document.getElementById('installCoach');
  if (!coach) return;
  coach.hidden = false;
  document.body.classList.add('install-coach-visible');
}

function refreshInstallCoach() {
  var standalone = isStandaloneDisplay();
  document.body.classList.toggle('app-standalone', standalone);
  document.body.classList.toggle('ios-browser', isIosLikeDevice() && !standalone);
  if (shouldShowInstallCoach()) showInstallCoach();
  else hideInstallCoach();
}

function setupInstallCoach() {
  var coach = document.getElementById('installCoach');
  if (!coach || coach._bound) return;
  coach._bound = true;
  refreshInstallCoach();

  var close = document.getElementById('installCoachClose');
  if (close) {
    close.onclick = function() {
      var sevenDays = 7 * 24 * 60 * 60 * 1000;
      localStorage.setItem('eagle-viewer-install-coach-dismissed-until', String(Date.now() + sevenDays));
      hideInstallCoach();
    };
  }

  window.addEventListener('resize', refreshInstallCoach);
  if (window.matchMedia) {
    var standaloneQuery = window.matchMedia('(display-mode: standalone)');
    if (standaloneQuery.addEventListener) standaloneQuery.addEventListener('change', refreshInstallCoach);
    else if (standaloneQuery.addListener) standaloneQuery.addListener(refreshInstallCoach);
  }
}

function setupMobilePullRefresh() {
  var body = document.getElementById('contentBody');
  if (!body || body._pullRefreshBound) return;
  body._pullRefreshBound = true;
  var indicator = document.createElement('div');
  indicator.className = 'pull-refresh';
  indicator.innerHTML = '<span></span><strong>下拉刷新</strong>';
  document.body.appendChild(indicator);

  var startY = 0;
  var pullDistance = 0;
  var pulling = false;
  var armed = false;
  var threshold = 76;

  function isEnabledTarget(target) {
    if (window.innerWidth > 768) return false;
    if (state.reloadInFlight) return false;
    if (!body.contains(target)) return false;
    if (target.closest('button, a, input, textarea, select, summary, .inspector, .utility-panel, .preview-overlay')) return false;
    return body.scrollTop <= 0;
  }

  function setIndicator(distance, ready, refreshing) {
    indicator.classList.toggle('visible', distance > 8 || refreshing);
    indicator.classList.toggle('ready', !!ready);
    indicator.classList.toggle('refreshing', !!refreshing);
    indicator.style.transform = 'translate3d(-50%,' + Math.min(42, Math.round(distance * 0.48)) + 'px,0)';
    indicator.querySelector('strong').textContent = refreshing ? '正在刷新' : (ready ? '松开刷新' : '下拉刷新');
  }

  function resetIndicator() {
    pullDistance = 0;
    pulling = false;
    armed = false;
    setIndicator(0, false, false);
  }

  body.addEventListener('touchstart', function(e) {
    if (e.touches.length !== 1 || !isEnabledTarget(e.target)) return;
    startY = e.touches[0].clientY;
    pullDistance = 0;
    pulling = true;
    armed = false;
  }, { passive: true });

  body.addEventListener('touchmove', function(e) {
    if (!pulling || e.touches.length !== 1) return;
    var dy = e.touches[0].clientY - startY;
    if (dy <= 0) {
      resetIndicator();
      return;
    }
    pullDistance = Math.min(128, dy);
    armed = pullDistance >= threshold;
    setIndicator(pullDistance, armed, false);
    if (pullDistance > 12) e.preventDefault();
  }, { passive: false });

  body.addEventListener('touchend', async function() {
    if (!pulling) return;
    if (!armed) {
      resetIndicator();
      return;
    }
    pulling = false;
    setIndicator(threshold, true, true);
    try {
      await api.reloadLibrary();
    } finally {
      setTimeout(resetIndicator, 260);
    }
  }, { passive: true });

  body.addEventListener('touchcancel', resetIndicator, { passive: true });

  body.addEventListener('pointerdown', function(e) {
    if (e.pointerType === 'touch' || e.button !== 0 || !isEnabledTarget(e.target)) return;
    startY = e.clientY;
    pullDistance = 0;
    pulling = true;
    armed = false;
    try { body.setPointerCapture(e.pointerId); } catch (err) {}
  });

  body.addEventListener('pointermove', function(e) {
    if (!pulling || e.pointerType === 'touch') return;
    var dy = e.clientY - startY;
    if (dy <= 0) {
      resetIndicator();
      return;
    }
    pullDistance = Math.min(128, dy);
    armed = pullDistance >= threshold;
    setIndicator(pullDistance, armed, false);
    if (pullDistance > 12) e.preventDefault();
  });

  body.addEventListener('pointerup', async function(e) {
    if (!pulling || e.pointerType === 'touch') return;
    if (!armed) {
      resetIndicator();
      return;
    }
    pulling = false;
    setIndicator(threshold, true, true);
    try {
      await api.reloadLibrary();
    } finally {
      setTimeout(resetIndicator, 260);
    }
  });

  body.addEventListener('pointercancel', resetIndicator);
}

function findCurrentItem(itemId) {
  return (state.currentItems || []).find(function(item) { return item.id === itemId; }) ||
    (state.collectionIds.items && state.collectionIds.items[itemId]) ||
    (state.inspectorItem && state.inspectorItem.id === itemId ? state.inspectorItem : null);
}

async function restorePendingInspector() {
  if (!state.pendingItemId) return;
  var itemId = state.pendingItemId;
  var item = findCurrentItem(itemId);
  if (!item) {
    var resolved = await api.resolveItems([itemId]);
    item = resolved && resolved[0];
  }
  if (item && state.pendingItemId === itemId) render.openInspector(item);
}

function buildItemShareUrl(item) {
  var itemId = item && item.id ? item.id : '';
  if (!itemId) return location.href;
  var params = new URLSearchParams(location.hash ? location.hash.slice(1) : '');
  params.set('view', state.currentView || 'all');
  params.set('sort', state.listSort || 'mtime');
  params.set('dir', state.listDir || 'desc');
  params.set('type', state.listType || 'all');
  if (state.currentView === 'folder' && state.currentFolderId) params.set('id', state.currentFolderId);
  else params.delete('id');
  if (state.currentView === 'tag' && state.currentTagName) params.set('tag', state.currentTagName);
  else params.delete('tag');
  if (state.currentView === 'recent') params.set('days', String(state.recentDays || 7));
  else params.delete('days');
  if (state.currentView === 'search' && state.searchQuery) params.set('q', state.searchQuery);
  else params.delete('q');
  if (state.currentView === 'collection' && state.currentCollection) params.set('collection', state.currentCollection);
  else params.delete('collection');
  if (state.currentView === 'smart' && state.currentSmartViewName) params.set('smart', state.currentSmartViewName);
  else params.delete('smart');
  if (state.currentView === 'eagle-smart' && state.currentEagleSmartFolderId) params.set('eagleSmart', state.currentEagleSmartFolderId);
  else params.delete('eagleSmart');
  if (state.currentView === 'random' && state.currentRandomSeed) params.set('seed', state.currentRandomSeed);
  else params.delete('seed');
  params.set('item', itemId);
  return location.origin + location.pathname + location.search + '#' + params.toString();
}

async function shareItemLink(item, button) {
  if (!item) return;
  var url = buildItemShareUrl(item);
  var title = item.name || 'Eagle Vault 素材';
  try {
    if (navigator.share && window.innerWidth <= 768) {
      await navigator.share({ title: title, text: title, url: url });
      showToast('已打开系统分享', 'success');
    } else if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(url);
      showToast('素材链接已复制', 'success');
      if (button) {
        var label = button.querySelector('span') || button;
        var old = label.textContent;
        label.textContent = '已复制';
        setTimeout(function() { label.textContent = old; }, 1200);
      }
    } else {
      window.prompt('复制素材链接', url);
      showToast('素材链接已准备复制');
    }
  } catch (err) {
    if (err && err.name === 'AbortError') return;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(url);
      showToast('素材链接已复制', 'success');
    } else {
      window.prompt('复制素材链接', url);
      showToast('素材链接已准备复制');
    }
  }
}

async function shareItemFile(item, button) {
  if (!item) return;
  if (isRemoteAccessUnavailable()) {
    showToast('分享原文件需要连接远程 Vault', 'error');
    return;
  }
  if (!navigator.share || !navigator.canShare || typeof File === 'undefined') {
    showToast('当前浏览器不支持原文件系统分享，请使用下载', 'error');
    return;
  }
  var maxShareBytes = 64 * 1024 * 1024;
  if (Number(item.size || 0) > maxShareBytes) {
    showToast('原文件超过 64 MB，请使用下载或分享页面链接', 'error');
    return;
  }
  var label = button ? (button.querySelector('span') || button) : null;
  var oldLabel = label ? label.textContent : '';
  var oldDisabled = button ? button.disabled : false;
  if (button) {
    button.disabled = true;
    button.classList.add('is-loading');
  }
  if (label) label.textContent = '准备原文件…';
  try {
    var response = await fetch(buildItemFileUrl(item), { cache: 'no-store' });
    if (handleAuthResponse(response)) return;
    if (response.status === 503) throw new Error('远程 Vault 暂不可达');
    if (!response.ok) throw new Error('读取原文件失败');
    var blob = await response.blob();
    if (blob.size > maxShareBytes) throw new Error('原文件超过 64 MB，请使用下载');
    var file = new File([blob], buildItemDownloadName(item), { type: blob.type || 'application/octet-stream' });
    if (!navigator.canShare({ files: [file] })) throw new Error('当前浏览器不支持分享这种文件，请使用下载');
    await navigator.share({ files: [file], title: item.name || 'Eagle Vault 素材' });
    showToast('已交给系统分享', 'success');
    closeQuickActionSheet();
  } catch (err) {
    if (err && err.name === 'AbortError') return;
    showToast((err && err.message) || '分享原文件失败，请使用下载', 'error');
  } finally {
    if (button && button.isConnected) {
      button.disabled = oldDisabled;
      button.classList.remove('is-loading');
    }
    if (label && label.isConnected) label.textContent = oldLabel;
  }
}

function buildItemFileUrl(item) {
  return API + '/api/items/' + item.id + '/file';
}

function buildAbsoluteItemFileUrl(item) {
  return new URL(buildItemFileUrl(item), location.href).href;
}

function buildItemDownloadName(item) {
  return (item.name || 'file') + (item.ext ? '.' + item.ext : '');
}

function buildItemInfoText(item) {
  if (!item) return '';
  var rows = [
    ['Name', item.name || ''],
    ['Type', item.ext ? item.ext.toUpperCase() : ''],
    ['Dimensions', item.width && item.height ? item.width + ' × ' + item.height : ''],
    ['Size', item.size ? formatSize(item.size) : ''],
    ['Duration', item.duration ? formatMediaDuration(item.duration) : ''],
    ['BPM', item.bpm ? String(Math.round(item.bpm)) : ''],
    ['Folders', (item.folderPaths || []).join(' ; ')],
    ['Tags', (item.tags || []).join(', ')],
    ['Created', item.btime ? formatDate(item.btime) : ''],
    ['Modified', item.mtime ? formatDate(item.mtime) : ''],
    ['Source', item.url || ''],
    ['Link', buildItemShareUrl(item)]
  ].filter(function(row) { return row[1]; });
  return rows.map(function(row) { return row[0] + ': ' + row[1]; }).join('\n');
}

function escapeMarkdownText(text) {
  return String(text || '').replace(/([\\`*_{}\[\]()#+\-.!|>])/g, '\\$1');
}

function escapeHtmlAttributeText(text) {
  return String(text || '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function buildItemReferenceText(item, format) {
  if (!item) return '';
  var name = item.name || item.id || 'Eagle Vault asset';
  var shareUrl = buildItemShareUrl(item);
  var fileUrl = buildAbsoluteItemFileUrl(item);
  var source = item.url || '';
  var tags = (item.tags || []).join(', ');
  var dims = item.width && item.height ? item.width + ' × ' + item.height : '';

  if (format === 'html') {
    if (isImageExt(item.ext)) {
      var sizeAttrs = item.width && item.height ? ' width="' + item.width + '" height="' + item.height + '"' : '';
      return '<figure>\n  <img src="' + escapeHtmlAttributeText(fileUrl) + '" alt="' + escapeHtmlAttributeText(name) + '"' + sizeAttrs + ' />\n  <figcaption><a href="' + escapeHtmlAttributeText(shareUrl) + '">' + escapeHtml(name) + '</a></figcaption>\n</figure>';
    }
    return '<a href="' + escapeHtmlAttributeText(shareUrl) + '">' + escapeHtml(name) + '</a>';
  }

  if (format === 'text') {
    return [
      name,
      dims ? 'Dimensions: ' + dims : '',
      tags ? 'Tags: ' + tags : '',
      source ? 'Source: ' + source : '',
      'Viewer: ' + shareUrl,
      'File: ' + fileUrl
    ].filter(Boolean).join('\n');
  }

  var title = escapeMarkdownText(name);
  var lines = [];
  if (isImageExt(item.ext)) lines.push('![' + title + '](' + fileUrl + ')');
  else lines.push('[' + title + '](' + shareUrl + ')');
  if (dims || tags || source) {
    lines.push('');
    if (dims) lines.push('- Dimensions: ' + dims);
    if (tags) lines.push('- Tags: ' + escapeMarkdownText(tags));
    if (source) lines.push('- Source: ' + source);
    lines.push('- Viewer: ' + shareUrl);
  }
  return lines.join('\n');
}

async function copyTextToClipboard(text, title, button) {
  if (!text) return;
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text);
      showToast((title || '文本') + '已复制', 'success');
      if (button) {
        var label = button.querySelector('span') || button;
        var old = label.textContent;
        label.textContent = '已复制';
        setTimeout(function() { label.textContent = old; }, 1200);
      }
    } else {
      window.prompt(title || '复制文本', text);
      showToast((title || '文本') + '已准备复制');
    }
  } catch (err) {
    window.prompt(title || '复制文本', text);
    showToast((title || '文本') + '已准备复制');
  }
}

function copyItemInfo(item, button) {
  copyTextToClipboard(buildItemInfoText(item), '复制素材信息', button);
}

function copyItemReference(item, format, button) {
  var title = format === 'html' ? '复制 HTML 引用' : (format === 'text' ? '复制纯文本引用' : '复制 Markdown 引用');
  copyTextToClipboard(buildItemReferenceText(item, format), title, button);
}

function buildBatchLinksText(items) {
  return items.map(function(item) {
    return (item.name || item.id || 'Untitled') + '\n' + buildItemShareUrl(item);
  }).join('\n\n');
}

function buildBatchInfoText(items) {
  return items.map(function(item, idx) {
    return '# ' + (idx + 1) + ' · ' + (item.name || item.id || 'Untitled') + '\n' + buildItemInfoText(item);
  }).join('\n\n---\n\n');
}

function buildBatchReferencesText(items) {
  return items.map(function(item) {
    return buildItemReferenceText(item, 'markdown');
  }).join('\n\n');
}

function copySelectedLinks(button) {
  var items = getSelectedItems();
  if (!items.length) return;
  copyTextToClipboard(buildBatchLinksText(items), '复制素材链接', button);
}

function copySelectedInfo(button) {
  var items = getSelectedItems();
  if (!items.length) return;
  copyTextToClipboard(buildBatchInfoText(items), '复制素材信息', button);
}

function copySelectedReferences(button) {
  var items = getSelectedItems();
  if (!items.length) return;
  copyTextToClipboard(buildBatchReferencesText(items), '复制素材引用', button);
}

function downloadSelectedBatch(button) {
  var ids = Array.from(state.selectedIds);
  if (!ids.length) return;
  if (isRemoteAccessUnavailable()) {
    showToast('打包下载需要连接远程 Vault', 'error');
    updateBatchOutputSheetState();
    return;
  }
  var label = button ? (button.querySelector('small') || button) : null;
  var oldLabel = label ? label.textContent : '';
  if (button) {
    button.disabled = true;
    button.classList.add('is-loading');
  }
  if (label) label.textContent = '准备 ZIP…';
  fetch(API + '/api/items/batch-download', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(ids)
  }).then(function(r) {
    if (r.status === 401) { window.location.href = '/login'; return; }
    if (r.status === 503) throw new Error('远程 Vault 暂不可达');
    if (!r.ok) throw new Error('下载失败');
    return r.blob();
  }).then(function(blob) {
    if (!blob) return;
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'eagle-batch.zip';
    a.click();
    URL.revokeObjectURL(a.href);
    showToast('ZIP 已开始下载', 'success');
    closeBatchOutputSheet();
  }).catch(function(e) {
    showToast('批量下载失败：' + (e.message || e), 'error');
  }).finally(function() {
    if (button) {
      button.disabled = false;
      button.classList.remove('is-loading');
    }
    if (label) label.textContent = oldLabel;
    updateBatchOutputSheetState();
  });
}

async function copyItemImage(id, button) {
  if (!id) return;
  if (!navigator.clipboard || typeof navigator.clipboard.write !== 'function') {
    showToast('当前环境不支持复制图片，请使用 HTTPS', 'error');
    return;
  }
  var old = button ? button.innerHTML : '';
  var url = API + '/api/items/' + id + '/file';
  try {
    var response = await fetch(url);
    var blob = await response.blob();
    var type = blob.type || 'image/png';
    if (!type.startsWith('image/')) type = 'image/png';
    await navigator.clipboard.write([new ClipboardItem({ [type]: blob })]);
    showToast('图片已复制到剪贴板', 'success');
    if (button) {
      button.innerHTML = iconCopy() + ' 已复制';
      setTimeout(function() { button.innerHTML = old; }, 1500);
    }
  } catch (err) {
    showToast('复制图片失败，请使用 HTTPS 或受支持浏览器', 'error');
  }
}

function getPrimaryItemFolder(item) {
  var folderId = ((item && item.folders) || [])[0] || '';
  if (!folderId) return null;
  var path = ((item && item.folderPaths) || [])[0] || folderId;
  var parts = String(path).split(' / ').filter(Boolean);
  return {
    id: folderId,
    label: parts.length ? parts[parts.length - 1] : path
  };
}

function openFolderAndFocus(folderId, itemId) {
  if (!folderId) return;
  if (itemId) {
    state.pendingFocusItemId = itemId;
    state.pendingFocusLoads = 0;
  }
  var search = document.getElementById('searchInput');
  if (search) search.value = '';
  clearAllActive();
  render.closeInspector();
  api.loadFolderItems(folderId).then(function() {
    if (render.syncActiveNavigationState) render.syncActiveNavigationState();
    if (render.focusPendingItemWhenLoaded) render.focusPendingItemWhenLoaded();
  });
}

function openItemFolder(item) {
  var folder = getPrimaryItemFolder(item);
  if (!folder || !folder.id) {
    showToast('这个素材没有文件夹归属', 'error');
    return;
  }
  closeQuickActionSheet();
  closeDesktopContextMenu();
  openFolderAndFocus(folder.id, item.id);
}

function isRemoteAccessUnavailable() {
  var strip = document.getElementById('remoteStatusStrip');
  return navigator.onLine === false || !!(strip && !strip.hidden && strip.dataset.state === 'offline');
}

function getBatchSelectedSummary() {
  var items = typeof getSelectedItems === 'function' ? getSelectedItems() : state.currentItems.filter(function(item) {
    return state.selectedIds.has(item.id);
  });
  var totalSize = items.reduce(function(sum, item) { return sum + (item.size || 0); }, 0);
  return { items: items, totalSize: totalSize };
}

function updateBatchOutputSheetState() {
  var overlay = document.getElementById('batchOutputOverlay');
  if (!overlay) return;
  var summary = getBatchSelectedSummary();
  var title = document.getElementById('batchOutputTitle');
  var meta = document.getElementById('batchOutputMeta');
  var status = document.getElementById('batchOutputStatus');
  var statusTitle = document.getElementById('batchOutputStatusTitle');
  var statusMeta = document.getElementById('batchOutputStatusMeta');
  var download = overlay.querySelector('[data-batch-output-action="download"]');
  var offline = isRemoteAccessUnavailable();
  if (title) title.textContent = '已选 ' + summary.items.length + ' 个素材';
  if (meta) meta.textContent = '总大小 ' + (summary.totalSize ? formatSize(summary.totalSize) : '0 B') + ' · 输出到笔记、清单或远程下载';
  if (status) status.dataset.state = offline ? 'offline' : 'online';
  if (statusTitle) statusTitle.textContent = offline ? '远程 Vault 暂不可达' : '远程 Vault 在线';
  if (statusMeta) {
    statusMeta.textContent = offline ?
      '复制链接、信息、Markdown、CSV 和 JSON 仍可用；ZIP 原文件需要重连远程 Vault。' :
      '可复制、导出清单，也可打包下载原文件 ZIP。';
  }
  if (download) {
    download.disabled = offline;
    download.classList.toggle('requires-remote', offline);
    var small = download.querySelector('small');
    if (small) small.textContent = offline ? '需连接远程 Vault' : '下载原文件 ZIP';
  }
}

function flashBatchOutputSnapshotState(detail) {
  var status = document.getElementById('batchOutputStatus');
  if (!status) return;
  var statusTitle = document.getElementById('batchOutputStatusTitle');
  var statusMeta = document.getElementById('batchOutputStatusMeta');
  var ok = detail && typeof detail.ok === 'number' ? detail.ok : 0;
  var total = detail && typeof detail.total === 'number' ? detail.total : 0;
  status.dataset.state = 'saved';
  if (statusTitle) statusTitle.textContent = '离线快照已更新';
  if (statusMeta) statusMeta.textContent = ok ? ('已缓存 ' + ok + ' / ' + total + ' 项；离线时仍可浏览快照并继续复制/导出清单。') : '快照状态已刷新；离线时复制和导出清单仍可用。';
  clearTimeout(status._snapshotTimer);
  status._snapshotTimer = setTimeout(updateBatchOutputSheetState, 2600);
}

function closeBatchOutputSheet() {
  var overlay = document.getElementById('batchOutputOverlay');
  if (!overlay) return;
  overlay.classList.remove('open');
  overlay.classList.add('closing');
  overlay.setAttribute('aria-hidden', 'true');
  setTimeout(function() { overlay.classList.remove('closing'); }, 180);
}

function openBatchOutputSheet() {
  if (!state.selectedIds.size) {
    showToast('先选择要输出的素材', 'error');
    return;
  }
  var overlay = document.getElementById('batchOutputOverlay');
  if (!overlay) return;
  updateBatchOutputSheetState();
  overlay.classList.remove('closing');
  overlay.classList.add('open');
  overlay.setAttribute('aria-hidden', 'false');
}

function setItemRating(item, value) {
  if (!item || !item.id) return;
  var next = Math.max(0, Math.min(5, Math.round(Number(value) || 0)));
  state.itemRatings = state.itemRatings || {};
  if (next) state.itemRatings[item.id] = next;
  else delete state.itemRatings[item.id];
  state.collectionIds.items = state.collectionIds.items || {};
  state.collectionIds.items[item.id] = item;
  saveLocalData();
  if (render.updateItemRatingsInView) render.updateItemRatingsInView(item);
  var sheet = document.getElementById('quickActionSheet');
  if (sheet && sheet.dataset.itemId === item.id) updateQuickActionSheetState(sheet, item);
  if (state.inspectorItem && state.inspectorItem.id === item.id) render.openInspector(state.inspectorItem);
  if (state.advancedFilters.rating_min && next < Number(state.advancedFilters.rating_min)) api.refreshCurrentView();
  showToast(next ? '已评为 ' + next + ' 星' : '已清除评分', 'success');
}

var viewerNoteSaveTimers = {};

function createReviewMarkerId() {
  return 'mark-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8);
}

function getReviewMarkerComposer(itemId) {
  return document.querySelector('[data-review-marker-compose="' + CSS.escape(String(itemId)) + '"]');
}

function refreshReviewMarkerUI(item, markerId) {
  if (!item) return;
  var inner = document.getElementById('inspectorInner');
  var scrollTop = inner ? inner.scrollTop : 0;
  render.openInspector(item);
  if (render.updateCollectionMarkersInView) render.updateCollectionMarkersInView(item.id);
  requestAnimationFrame(function() {
    var nextInner = document.getElementById('inspectorInner');
    if (nextInner) nextInner.scrollTop = scrollTop;
    if (!markerId) return;
    var row = document.querySelector('[data-review-marker-id="' + CSS.escape(markerId) + '"]');
    if (row) {
      row.classList.add('highlight');
      row.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      setTimeout(function() { if (row.isConnected) row.classList.remove('highlight'); }, 1500);
    }
  });
}

function addReviewMarker(item, marker) {
  if (!item || !item.id || !marker || !marker.text) return false;
  state.reviewMarkers = state.reviewMarkers || {};
  var markers = (state.reviewMarkers[item.id] || []).slice();
  var now = Date.now();
  var normalized = Object.assign({ id: createReviewMarkerId(), kind: 'general', createdAt: now, updatedAt: now }, marker);
  markers.push(normalized);
  state.reviewMarkers[item.id] = markers.slice(-100);
  state.collectionIds.items = state.collectionIds.items || {};
  state.collectionIds.items[item.id] = item;
  saveLocalData();
  refreshReviewMarkerUI(item, normalized.id);
  showToast(normalized.kind === 'point' ? '已添加画面标记' : (normalized.kind === 'time' ? '已添加时间标记' : '已添加审片评论'), 'success');
  return true;
}

function parseReviewMarkerTime(value) {
  var raw = String(value || '').trim();
  if (!raw) return 0;
  if (/^\d+(?:\.\d+)?$/.test(raw)) return Math.max(0, Math.min(86400, Number(raw)));
  var parts = raw.split(':').map(Number);
  if (parts.some(function(part) { return !isFinite(part) || part < 0; }) || parts.length < 2 || parts.length > 3) return NaN;
  if (parts.length === 2) return Math.min(86400, parts[0] * 60 + parts[1]);
  return Math.min(86400, parts[0] * 3600 + parts[1] * 60 + parts[2]);
}

function commitPointReviewMarker(item, event, preview) {
  var img = preview && preview.querySelector('img');
  var text = String((preview && preview.dataset.reviewMarkerDraft) || '').trim().slice(0, 1000);
  if (!img || !text) return;
  var box = preview.getBoundingClientRect();
  var naturalRatio = (img.naturalWidth || item.width || 1) / (img.naturalHeight || item.height || 1);
  var boxRatio = box.width / Math.max(1, box.height);
  var width = box.width;
  var height = box.height;
  if (naturalRatio > boxRatio) height = width / naturalRatio;
  else width = height * naturalRatio;
  var left = box.left + (box.width - width) / 2;
  var top = box.top + (box.height - height) / 2;
  var x = (event.clientX - left) / Math.max(1, width);
  var y = (event.clientY - top) / Math.max(1, height);
  if (x < 0 || x > 1 || y < 0 || y > 1) {
    showToast('请点在图片内容范围内', 'error');
    return;
  }
  preview.dataset.reviewMarkerMode = '';
  preview.classList.remove('review-marker-mode');
  addReviewMarker(item, { kind: 'point', text: text, x: x, y: y });
}

function focusReviewMarker(markerId) {
  var item = state.inspectorItem;
  if (!item) return;
  var marker = ((state.reviewMarkers || {})[item.id] || []).find(function(entry) { return entry.id === markerId; });
  if (!marker) return;
  var target = marker.kind === 'point' ? document.querySelector('.review-marker-overlay [data-review-marker-focus="' + CSS.escape(markerId) + '"]') : null;
  if (target) {
    target.classList.add('active');
    target.scrollIntoView({ block: 'center', behavior: 'smooth' });
    setTimeout(function() { if (target.isConnected) target.classList.remove('active'); }, 1400);
  }
  var row = document.querySelector('[data-review-marker-id="' + CSS.escape(markerId) + '"]');
  if (row) {
    row.classList.add('highlight');
    if (!target) row.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    setTimeout(function() { if (row.isConnected) row.classList.remove('highlight'); }, 1400);
  }
}

function deleteReviewMarker(item, markerId) {
  if (!item || !markerId) return;
  var markers = ((state.reviewMarkers || {})[item.id] || []).filter(function(marker) { return marker.id !== markerId; });
  if (markers.length) state.reviewMarkers[item.id] = markers;
  else delete state.reviewMarkers[item.id];
  saveLocalData();
  refreshReviewMarkerUI(item);
  showToast('已删除审片标记', 'success');
}

function commitViewerNote(editor) {
  if (!editor || !editor.dataset.id) return;
  var itemId = editor.dataset.id;
  clearTimeout(viewerNoteSaveTimers[itemId]);
  delete viewerNoteSaveTimers[itemId];
  var note = String(editor.value || '').trim().slice(0, 4000);
  var previous = String((state.viewerNotes || {})[itemId] || '');
  if (note === previous) return;
  state.viewerNotes = state.viewerNotes || {};
  if (note) state.viewerNotes[itemId] = note;
  else delete state.viewerNotes[itemId];
  var item = findCurrentItem(itemId);
  if (item) {
    state.collectionIds.items = state.collectionIds.items || {};
    state.collectionIds.items[itemId] = item;
  }
  saveLocalData();
  if (render.updateCollectionMarkersInView) render.updateCollectionMarkersInView(itemId);
  var compose = editor.closest('[data-viewer-note-compose]');
  var status = compose && compose.querySelector('.viewer-note-status');
  if (status) {
    status.textContent = note ? '已保存到 Viewer' : '已清除 Viewer 笔记';
    status.classList.add('saved');
    setTimeout(function() { if (status.isConnected) status.classList.remove('saved'); }, 900);
  }
  var filter = (state.advancedFilters || {}).viewer_note_state;
  if ((filter === 'noted' && !note) || (filter === 'unnoted' && note)) setTimeout(api.refreshCurrentView, 120);
}

function runItemAction(item, action, sourceEl) {
  if (!item || !action) return;
  var fileUrl = buildItemFileUrl(item);
  if (action === 'preview') {
    if (isItemPreviewable(item)) render.previewItem(item, fileUrl);
    else window.open(fileUrl, '_blank');
  } else if (action === 'inspect') {
    render.openInspector(item);
  } else if (action === 'folder') {
    openItemFolder(item);
  } else if (action === 'source') {
    var sourceDomain = getItemSourceDomain(item);
    if (!sourceDomain) {
      showToast('这个素材没有来源站点', 'error');
      return;
    }
    closeQuickActionSheet();
    closeDesktopContextMenu();
    openSourceDomainView(sourceDomain);
  } else if (action === 'palette') {
    var primaryColor = getItemPrimaryPaletteColor(item);
    if (!primaryColor) {
      showToast('这个素材没有可用主色', 'error');
      return;
    }
    closeQuickActionSheet();
    closeDesktopContextMenu();
    openPaletteColorView(primaryColor);
  } else if (action === 'select') {
    if (render.toggleSelect) render.toggleSelect(item.id);
    var selectSheet = document.getElementById('quickActionSheet');
    if (selectSheet) updateQuickActionSheetState(selectSheet, item);
    var selectMenu = document.getElementById('itemContextMenu');
    if (selectMenu) updateDesktopContextMenuState(selectMenu, item);
  } else if (action === 'favorite' || action === 'later' || action === 'done') {
    toggleCollection(action, item.id);
    var sheet = document.getElementById('quickActionSheet');
    if (sheet) updateQuickActionSheetState(sheet, item);
    var menu = document.getElementById('itemContextMenu');
    if (menu) updateDesktopContextMenuState(menu, item);
    if (state.inspectorItem && state.inspectorItem.id === item.id) render.openInspector(state.inspectorItem);
  } else if (action.indexOf('rating-') === 0) {
    setItemRating(item, action.substring(7));
  } else if (action === 'workspace') {
    closeQuickActionSheet();
    closeDesktopContextMenu();
    openWorkspacesPanel([item.id]);
  } else if (action === 'note') {
    closeQuickActionSheet();
    closeDesktopContextMenu();
    render.openInspector(item);
    setTimeout(function() {
      var editor = document.querySelector('.viewer-note-editor[data-id="' + CSS.escape(item.id) + '"]');
      if (editor) {
        editor.focus();
        editor.scrollIntoView({ block: 'center', behavior: 'smooth' });
      }
    }, 80);
  } else if (action === 'share') {
    shareItemLink(item, sourceEl);
  } else if (action === 'share-file') {
    shareItemFile(item, sourceEl);
  } else if (action === 'copy') {
    copyItemImage(item.id, sourceEl);
  } else if (action === 'copy-info') {
    copyItemInfo(item, sourceEl);
  } else if (action === 'copy-md' || action === 'copy-html' || action === 'copy-ref') {
    copyItemReference(item, action === 'copy-html' ? 'html' : (action === 'copy-ref' ? 'text' : 'markdown'), sourceEl);
  } else if (action === 'download') {
    if (isRemoteAccessUnavailable()) {
      showToast('下载原文件需要连接远程 Vault', 'error');
      return;
    }
    var resetDownloadButton = null;
    if (sourceEl) {
      var oldDisabled = sourceEl.disabled;
      sourceEl.classList.add('is-loading');
      sourceEl.disabled = true;
      var label = sourceEl.querySelector('span');
      var oldLabel = label ? label.textContent : '';
      if (label) label.textContent = '开始下载';
      resetDownloadButton = function() {
        if (!sourceEl.isConnected) return;
        sourceEl.classList.remove('is-loading');
        sourceEl.disabled = oldDisabled;
        if (label && label.isConnected) label.textContent = oldLabel;
      };
    }
    var a = document.createElement('a');
    a.href = fileUrl + '?download=true';
    a.download = buildItemDownloadName(item);
    a.click();
    showToast('原文件已开始下载', 'success');
    if (resetDownloadButton) setTimeout(resetDownloadButton, 1200);
    closeQuickActionSheet();
  }
}

window._runItemAction = runItemAction;

function closeQuickActionSheet(immediate) {
  var sheet = document.getElementById('quickActionSheet');
  if (sheet) {
    if (immediate) {
      sheet.remove();
    } else {
      sheet.classList.remove('open');
      sheet.classList.add('closing');
      setTimeout(function() {
        if (sheet.parentNode) sheet.remove();
      }, 180);
    }
  }
  document.body.classList.remove('quick-actions-open');
}

function closeDesktopContextMenu() {
  var menu = document.getElementById('itemContextMenu');
  if (menu) menu.remove();
  document.querySelectorAll('.context-active').forEach(function(el) { el.classList.remove('context-active'); });
}

function renderQuickActionStatePills(item) {
  var pills = [];
  if (state.selectedIds.has(item.id)) pills.push('<span class="quick-action-state-pill selected">' + iconCollection() + ' 已选中</span>');
  if ((state.collectionIds.favorite || []).indexOf(item.id) >= 0) pills.push('<span class="quick-action-state-pill favorite">' + iconBookmark() + ' 已收藏</span>');
  if ((state.collectionIds.later || []).indexOf(item.id) >= 0) pills.push('<span class="quick-action-state-pill later">' + iconClock() + ' 待整理</span>');
  if ((state.collectionIds.done || []).indexOf(item.id) >= 0) pills.push('<span class="quick-action-state-pill done">' + iconCheck() + ' 已处理</span>');
  if (String((state.viewerNotes || {})[item.id] || '').trim()) pills.push('<span class="quick-action-state-pill note">' + iconInfo() + ' 有笔记</span>');
  (state.workspaces || []).filter(function(workspace) { return (workspace.itemIds || []).indexOf(item.id) >= 0; }).slice(0, 2).forEach(function(workspace) {
    pills.push('<span class="quick-action-state-pill workspace" style="--workspace-color:' + escapeHtml(workspace.color) + '">' + iconCollection() + ' ' + escapeHtml(workspace.name) + '</span>');
  });
  if (!pills.length) pills.push('<span class="quick-action-state-pill muted">未加入清单</span>');
  return pills.join('');
}

function updateQuickActionSheetState(sheet, item) {
  var select = sheet.querySelector('[data-quick-action="select"]');
  var fav = sheet.querySelector('[data-quick-action="favorite"]');
  var download = sheet.querySelector('[data-quick-action="download"]');
  var status = sheet.querySelector('.quick-action-state');
  var selected = state.selectedIds.has(item.id);
  var favorite = (state.collectionIds.favorite || []).indexOf(item.id) >= 0;
  if (status) status.innerHTML = renderQuickActionStatePills(item);
  if (select) {
    select.classList.toggle('active', selected);
    select.querySelector('span').textContent = selected ? '取消选择' : '选择';
  }
  if (fav) {
    fav.classList.toggle('active', favorite);
    fav.querySelector('span').textContent = favorite ? '取消收藏' : '收藏';
  }
  if (download) {
    var offline = isRemoteAccessUnavailable();
    download.classList.toggle('requires-remote', offline);
    download.disabled = offline;
    download.title = offline ? '下载原文件需要连接远程 Vault' : '';
    download.querySelector('span').textContent = offline ? '需联网' : '下载';
  }
}

function updateDesktopContextMenuState(menu, item) {
  var select = menu.querySelector('[data-context-action="select"] span');
  var fav = menu.querySelector('[data-context-action="favorite"] span');
  var download = menu.querySelector('[data-context-action="download"]');
  if (select) select.textContent = state.selectedIds.has(item.id) ? '取消选择' : '加入选择';
  if (fav) fav.textContent = (state.collectionIds.favorite || []).indexOf(item.id) >= 0 ? '取消收藏' : '加入收藏';
  if (download) {
    var offline = isRemoteAccessUnavailable();
    download.classList.toggle('requires-remote', offline);
    download.disabled = offline;
    download.title = offline ? '下载原文件需要连接远程 Vault' : '';
    var label = download.querySelector('span');
    if (label) label.textContent = offline ? '需联网' : '下载原文件';
  }
}

function openDesktopContextMenu(item, x, y, sourceEl) {
  if (!item) return;
  closeDesktopContextMenu();
  var meta = [];
  if (item.ext) meta.push(String(item.ext).toUpperCase());
  if (item.width && item.height) meta.push(item.width + ' × ' + item.height);
  else if (item.size) meta.push(formatSize(item.size));
  var primaryFolder = getPrimaryItemFolder(item);
  var menu = document.createElement('div');
  menu.id = 'itemContextMenu';
  menu.className = 'item-context-menu';
  menu.dataset.itemId = item.id || '';
  menu.setAttribute('role', 'menu');
  menu.setAttribute('aria-label', '素材快捷菜单');
  menu.innerHTML =
    '<div class="item-context-head">' +
      '<strong>' + escapeHtml(item.name || '未命名素材') + '</strong>' +
      '<span>' + escapeHtml(meta.join(' · ') || '素材') + '</span>' +
    '</div>' +
    '<button type="button" role="menuitem" data-context-action="preview">' + iconEye() + '<span>预览</span><kbd>Enter</kbd></button>' +
    '<button type="button" role="menuitem" data-context-action="inspect">' + iconInfo() + '<span>查看详情</span></button>' +
    (primaryFolder ? '<button type="button" role="menuitem" data-context-action="folder">' + iconFolder() + '<span>打开文件夹</span></button>' : '') +
    '<button type="button" role="menuitem" data-context-action="select">' + iconCollection() + '<span>加入选择</span></button>' +
    '<div class="item-context-separator"></div>' +
    '<button type="button" role="menuitem" data-context-action="favorite">' + iconBookmark() + '<span>加入收藏</span></button>' +
    '<button type="button" role="menuitem" data-context-action="share">' + iconExternalLink() + '<span>复制素材链接</span></button>' +
    (canCopyImage(item.ext) ? '<button type="button" role="menuitem" data-context-action="copy">' + iconCopy() + '<span>复制图片</span></button>' : '') +
    '<div class="item-context-separator"></div>' +
    '<button type="button" role="menuitem" data-context-action="download">' + iconDownload() + '<span>下载原文件</span></button>';
  document.body.appendChild(menu);
  if (sourceEl) sourceEl.classList.add('context-active');
  updateDesktopContextMenuState(menu, item);

  var rect = menu.getBoundingClientRect();
  var left = Math.min(Math.max(8, x), window.innerWidth - rect.width - 8);
  var top = Math.min(Math.max(8, y), window.innerHeight - rect.height - 8);
  menu.style.left = left + 'px';
  menu.style.top = top + 'px';
  requestAnimationFrame(function() { menu.classList.add('open'); });

  menu.onclick = function(e) {
    var actionEl = e.target.closest('[data-context-action]');
    if (!actionEl) return;
    var action = actionEl.dataset.contextAction;
    if (action !== 'favorite' && action !== 'later' && action !== 'done' && action !== 'share' && action !== 'copy' && action !== 'copy-info' && action !== 'copy-md' && action !== 'copy-html') closeDesktopContextMenu();
    runItemAction(item, action, actionEl);
    if (action === 'share' || action === 'copy' || action === 'copy-info' || action === 'copy-md' || action === 'copy-html') setTimeout(closeDesktopContextMenu, 700);
  };
}

function openQuickActionSheet(item) {
  if (!item) return;
  closeQuickActionSheet(true);
  var primaryFolder = getPrimaryItemFolder(item);
  var meta = [];
  if (item.ext) meta.push(String(item.ext).toUpperCase());
  if (item.width && item.height) meta.push(item.width + ' × ' + item.height);
  if (item.size) meta.push(formatSize(item.size));
  var sheet = document.createElement('div');
  sheet.id = 'quickActionSheet';
  sheet.className = 'quick-action-overlay';
  sheet.dataset.itemId = item.id || '';
  sheet.innerHTML =
    '<div class="quick-action-backdrop" data-quick-action="close"></div>' +
    '<div class="quick-action-sheet" role="dialog" aria-modal="true" aria-label="素材快捷操作">' +
      '<div class="quick-action-grabber"></div>' +
      '<div class="quick-action-head">' +
        '<strong>' + escapeHtml(item.name || '未命名素材') + '</strong>' +
        '<span>' + escapeHtml(meta.join(' · ') || '素材') + '</span>' +
      '</div>' +
      '<div class="quick-action-sections">' +
        '<section class="quick-action-section primary">' +
          '<div class="quick-action-section-title"><span>打开</span><em>预览或查看素材信息</em></div>' +
          '<div class="quick-action-grid quick-action-grid-primary">' +
            '<button type="button" class="primary-action" data-quick-action="preview">' + iconEye() + '<span>预览</span></button>' +
            '<button type="button" data-quick-action="inspect">' + iconInfo() + '<span>详情</span></button>' +
            (primaryFolder ? '<button type="button" data-quick-action="folder">' + iconFolder() + '<span>文件夹</span></button>' : '') +
          '</div>' +
        '</section>' +
        '<section class="quick-action-section organize">' +
          '<div class="quick-action-section-title"><span>操作</span><em>选择素材或加入收藏</em></div>' +
          '<div class="quick-action-grid">' +
            '<button type="button" data-quick-action="select">' + iconCollection() + '<span>选择</span></button>' +
            '<button type="button" data-quick-action="favorite">' + iconBookmark() + '<span>收藏</span></button>' +
          '</div>' +
        '</section>' +
        '<section class="quick-action-section output">' +
          '<div class="quick-action-section-title"><span>输出</span><em>复制链接或下载原文件</em></div>' +
          '<div class="quick-action-grid">' +
            '<button type="button" data-quick-action="share">' + iconExternalLink() + '<span>链接</span></button>' +
            '<button type="button" data-quick-action="download">' + iconDownload() + '<span>下载</span></button>' +
          '</div>' +
        '</section>' +
      '</div>' +
    '</div>';
  document.body.appendChild(sheet);
  document.body.classList.add('quick-actions-open');
  updateQuickActionSheetState(sheet, item);
  requestAnimationFrame(function() { sheet.classList.add('open'); });

  var panel = sheet.querySelector('.quick-action-sheet');
  var backdrop = sheet.querySelector('.quick-action-backdrop');
  var drag = null;

  function resetSheetDrag() {
    if (!panel) return;
    panel.classList.remove('dragging');
    panel.style.transform = '';
    if (backdrop) backdrop.style.opacity = '';
    drag = null;
  }

  function startSheetDrag(e) {
    if (!panel || !e.touches || e.touches.length !== 1) return;
    if (e.target.closest('button, a, input, textarea, select')) return;
    drag = {
      startY: e.touches[0].clientY,
      lastY: e.touches[0].clientY,
      startedAt: Date.now(),
      active: false,
      fromHandle: !!e.target.closest('.quick-action-grabber, .quick-action-head')
    };
  }

  function moveSheetDrag(e) {
    if (!drag || !panel || !e.touches || e.touches.length !== 1) return;
    var currentY = e.touches[0].clientY;
    var dy = currentY - drag.startY;
    drag.lastY = currentY;
    if (dy <= 0) {
      if (drag.active) resetSheetDrag();
      return;
    }
    if (!drag.fromHandle && panel.scrollTop > 0) return;
    drag.active = true;
    panel.classList.add('dragging');
    var eased = Math.min(180, dy * 0.78);
    panel.style.transform = 'translateY(' + eased + 'px)';
    if (backdrop) backdrop.style.opacity = String(Math.max(0.24, 1 - eased / 210));
    e.preventDefault();
  }

  function endSheetDrag() {
    if (!drag || !panel) return;
    var dy = drag.lastY - drag.startY;
    var elapsed = Math.max(1, Date.now() - drag.startedAt);
    var velocity = dy / elapsed;
    if (drag.active && (dy > 92 || velocity > 0.62)) {
      closeQuickActionSheet();
    } else {
      resetSheetDrag();
    }
  }

  if (panel) {
    panel.addEventListener('touchstart', startSheetDrag, { passive: true });
    panel.addEventListener('touchmove', moveSheetDrag, { passive: false });
    panel.addEventListener('touchend', endSheetDrag);
    panel.addEventListener('touchcancel', resetSheetDrag);
  }

  sheet.onclick = function(e) {
    var actionEl = e.target.closest('[data-quick-action]');
    if (!actionEl) return;
    var action = actionEl.dataset.quickAction;
    if (action === 'close') {
      closeQuickActionSheet();
    } else if (action === 'preview') {
      closeQuickActionSheet();
      runItemAction(item, action, actionEl);
    } else if (action === 'inspect') {
      closeQuickActionSheet();
      runItemAction(item, action, actionEl);
    } else if (action === 'folder' || action === 'source' || action === 'palette') {
      runItemAction(item, action, actionEl);
    } else if (action === 'select') {
      runItemAction(item, action, actionEl);
      closeQuickActionSheet();
    } else if (action === 'favorite' || action === 'later' || action === 'done') {
      runItemAction(item, action, actionEl);
    } else if (action === 'workspace') {
      runItemAction(item, action, actionEl);
    } else if (action === 'note') {
      runItemAction(item, action, actionEl);
    } else if (action === 'share' || action === 'copy-info' || action === 'copy-md') {
      runItemAction(item, action, actionEl);
      setTimeout(closeQuickActionSheet, 650);
    } else if (action === 'download') {
      runItemAction(item, action, actionEl);
    }
  };
}

function setupMobileQuickActions() {
  if (document.body._quickActionsBound) return;
  document.body._quickActionsBound = true;
  var pressTimer = null;
  var startX = 0;
  var startY = 0;
  var activeCard = null;
  var suppressClick = false;

  function resetPress() {
    clearTimeout(pressTimer);
    pressTimer = null;
    if (activeCard) activeCard.classList.remove('touch-pressing');
    activeCard = null;
  }

  function beginPress(target, x, y) {
    if (window.innerWidth > 768) return;
    if (target.closest('button, a, input, textarea, select, summary, .inspector, .utility-panel, .preview-overlay, .quick-action-overlay')) return;
    var card = target.closest('.card[data-item-id]');
    if (!card) return;
    var item = findCurrentItem(card.dataset.itemId);
    if (!item) return;
    activeCard = card;
    card.classList.add('touch-pressing');
    startX = x;
    startY = y;
    pressTimer = setTimeout(function() {
      suppressClick = true;
      card.classList.add('long-press-active');
      setTimeout(function() { card.classList.remove('long-press-active'); }, 360);
      openQuickActionSheet(item);
    }, 520);
  }

  function movePress(x, y) {
    if (!pressTimer) return;
    if (Math.abs(x - startX) > 12 || Math.abs(y - startY) > 12) resetPress();
  }

  document.body.addEventListener('touchstart', function(e) {
    if (e.touches.length !== 1) return;
    beginPress(e.target, e.touches[0].clientX, e.touches[0].clientY);
  }, { passive: true });
  document.body.addEventListener('touchmove', function(e) {
    if (e.touches.length !== 1) return;
    movePress(e.touches[0].clientX, e.touches[0].clientY);
  }, { passive: true });
  document.body.addEventListener('touchend', resetPress, { passive: true });
  document.body.addEventListener('touchcancel', resetPress, { passive: true });

  document.body.addEventListener('pointerdown', function(e) {
    if (e.pointerType === 'touch' || e.button !== 0) return;
    beginPress(e.target, e.clientX, e.clientY);
  });
  document.body.addEventListener('pointermove', function(e) {
    if (e.pointerType === 'touch') return;
    movePress(e.clientX, e.clientY);
  });
  document.body.addEventListener('pointerup', resetPress);
  document.body.addEventListener('pointercancel', resetPress);

  document.body.addEventListener('contextmenu', function(e) {
    if (e.target.closest('button, a, input, textarea, select, summary, .inspector, .utility-panel, .preview-overlay, .quick-action-overlay, .item-context-menu')) return;
    var target = e.target.closest('.card[data-item-id], tr.item-row[data-item-id]');
    if (!target) return;
    var item = findCurrentItem(target.dataset.itemId);
    if (!item) return;
    e.preventDefault();
    e.stopPropagation();
    suppressClick = true;
    setTimeout(function() { suppressClick = false; }, 650);
    if (window.innerWidth <= 768) openQuickActionSheet(item);
    else openDesktopContextMenu(item, e.clientX, e.clientY, target);
  });

  document.body.addEventListener('click', function(e) {
    if (!e.target.closest('.item-context-menu')) closeDesktopContextMenu();
    if (!suppressClick) return;
    var card = e.target.closest('.card[data-item-id], tr.item-row[data-item-id]');
    if (!card) return;
    suppressClick = false;
    e.preventDefault();
    e.stopPropagation();
  }, true);

  document.addEventListener('keydown', function(e) {
    if (e.key !== 'Escape') return;
    closeDesktopContextMenu();
  }, true);
  window.addEventListener('resize', closeDesktopContextMenu);
  document.getElementById('contentBody').addEventListener('scroll', closeDesktopContextMenu, { passive: true });
}

// ===== Copy image =====
function setupCopyHandler() {
  document.body.addEventListener('click', function(e) {
    var btn = e.target.closest('.btn-copy');
    if (!btn) return;
    var id = btn.dataset.id;
    if (!id) return;
    copyItemImage(id, btn);
  });
}

// ===== Sync toolbar selects =====
function syncToolbarSelects() {
  document.getElementById('sortSelect').value = state.listSort;
  document.getElementById('sortDirSelect').value = state.listDir;
  document.getElementById('typeSelect').value = state.listType;
  document.getElementById('ctSortSelect').value = state.listSort;
  document.getElementById('ctSortDirSelect').value = state.listDir;
  document.getElementById('ctTypeSelect').value = state.listType;
  document.querySelectorAll('.quick-filter').forEach(function(btn) {
    btn.classList.toggle('active', btn.dataset.type === state.listType);
  });
}

function onSortChange(val) { state.listSort = val; interactionModule.syncToolbarSelects(); api.refreshCurrentView(); }
function onDirChange(val) { state.listDir = val; interactionModule.syncToolbarSelects(); api.refreshCurrentView(); }
function onTypeChange(val) { state.listType = val; interactionModule.syncToolbarSelects(); api.refreshCurrentView(); }

// ===== Bind events =====
function bindEvents() {
  // Library views
  document.getElementById('allItems').onclick = function() {
    document.getElementById('searchInput').value = '';
    state.currentTagName = null;
    api.loadAllItems(true);
  };
  document.getElementById('recent7').onclick = function() {
    document.getElementById('searchInput').value = '';
    state.currentTagName = null;
    api.loadRecentItems(7);
  };
  document.getElementById('recent30').onclick = function() {
    document.getElementById('searchInput').value = '';
    state.currentTagName = null;
    api.loadRecentItems(30);
  };
  document.getElementById('favoriteItems').onclick = function() {
    clearAllActive();
    this.classList.add('active');
    showCollection('favorite');
  };
  document.getElementById('laterItems').onclick = function() {
    clearAllActive();
    this.classList.add('active');
    showCollection('later');
  };
  document.getElementById('doneItems').onclick = function() {
    clearAllActive();
    this.classList.add('active');
    showCollection('done');
  };
  document.getElementById('recentViewedItems').onclick = function() {
    clearAllActive();
    this.classList.add('active');
    showCollection('recentViewed');
  };
  document.getElementById('sidebarDuplicates').onclick = function() {
    clearAllActive();
    this.classList.add('active');
    api.loadDuplicates();
  };
  document.getElementById('sidebarColors').onclick = function() {
    clearAllActive();
    this.classList.add('active');
    api.loadColorAtlas();
  };
  document.getElementById('sidebarRandom').onclick = function() {
    clearAllActive();
    this.classList.add('active');
    api.loadRandomWalk('', true);
  };
  document.getElementById('sidebarSavedViews').onclick = function() {
    renderSavedViews();
    openPanel('savedViewsPanel');
  };
  document.getElementById('sidebarWorkspaces').onclick = function() { openWorkspacesPanel([]); };
  document.getElementById('createWorkspaceBtn').onclick = function() {
    var input = document.getElementById('workspaceName');
    var color = document.getElementById('workspaceColor');
    var created = createWorkspace(input.value, color.value);
    if (created) input.value = '';
  };
  document.getElementById('workspaceName').onkeydown = function(e) {
    if (e.key === 'Enter') document.getElementById('createWorkspaceBtn').click();
  };
  document.getElementById('tagSearchInput').oninput = function() { render.renderTagList(); };

  var mobileLibraryBtn = document.getElementById('mobileLibraryBtn');
  var mobileFavoriteBtn = document.getElementById('mobileFavoriteBtn');
  var mobileLaterBtn = document.getElementById('mobileLaterBtn');
  var mobileSearchBtn = document.getElementById('mobileSearchBtn');
  var mobileMoreBtn = document.getElementById('mobileMoreBtn');
  var returnBtn = document.getElementById('returnToCurrentItemBtn');
  [mobileLibraryBtn, mobileFavoriteBtn, mobileLaterBtn, mobileSearchBtn, mobileMoreBtn].forEach(function(btn) {
    if (!btn || btn._tabFeedbackBound) return;
    btn._tabFeedbackBound = true;
    btn.addEventListener('pointerdown', function() { pulseMobileTab(btn); });
    btn.addEventListener('keydown', function(e) {
      if (e.key === 'Enter' || e.key === ' ') pulseMobileTab(btn);
    });
  });
  if (returnBtn) returnBtn.onclick = function() {
    var itemId = state.lastFocusedItemId;
    if (!itemId) return;
    if (render.returnFocusToItem && render.returnFocusToItem(itemId)) return;
    state.pendingFocusItemId = itemId;
    state.pendingFocusLoads = 0;
    if (render.focusPendingItemWhenLoaded && render.focusPendingItemWhenLoaded()) return;
    if (state.currentView === 'folder' && state.currentFolderId && state.incrementalHasMore) {
      api.loadFolderItems(state.currentFolderId, false);
    } else if (window.showToast) {
      window.showToast('当前素材不在这个视图里', 'error');
    }
  };
  if (mobileLibraryBtn) mobileLibraryBtn.onclick = function() {
    document.getElementById('searchInput').value = '';
    state.currentTagName = null;
    api.loadAllItems(true);
    syncMobileTabbar();
  };
  if (mobileFavoriteBtn) mobileFavoriteBtn.onclick = function() {
    clearAllActive();
    document.getElementById('favoriteItems').classList.add('active');
    showCollection('favorite');
  };
  if (mobileLaterBtn) mobileLaterBtn.onclick = function() {
    clearAllActive();
    document.getElementById('laterItems').classList.add('active');
    showCollection('later');
  };
  if (mobileSearchBtn) mobileSearchBtn.onclick = function() {
    if (window._openMobileSearchSheet) window._openMobileSearchSheet();
    else {
      var search = document.getElementById('searchInput');
      if (!search) return;
      search.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      setTimeout(function() { search.focus(); }, 80);
      setMobileTabActive('mobileSearchBtn');
    }
  };
  if (mobileMoreBtn) mobileMoreBtn.onclick = function() {
    if (window._openMobileMoreSheet) window._openMobileMoreSheet();
    else if (window._openMobileSidebar) window._openMobileSidebar();
  };

  // Search
  document.getElementById('searchInput').onkeydown = function(e) {
    var suggest = document.getElementById('searchSuggest');
    var items = suggest && suggest._items ? suggest._items : [];
    var activeIndex = suggest ? Number(suggest.dataset.activeIndex || -1) : -1;
    if (e.key === 'ArrowDown' && suggest && suggest.classList.contains('open')) {
      e.preventDefault();
      setSearchSuggestActive(activeIndex < 0 ? 0 : activeIndex + 1);
      return;
    }
    if (e.key === 'ArrowUp' && suggest && suggest.classList.contains('open')) {
      e.preventDefault();
      setSearchSuggestActive(activeIndex < 0 ? items.length - 1 : activeIndex - 1);
      return;
    }
    if (e.key === 'Escape') {
      closeSearchSuggest();
      return;
    }
    if (e.key === 'Enter') {
      if (suggest && suggest.classList.contains('open') && items[activeIndex] && items[activeIndex].type !== 'hint') {
        e.preventDefault();
        runSearchSuggest(items[activeIndex]);
      } else {
        closeSearchSuggest();
        api.doSearch();
      }
    }
  };
  document.getElementById('searchInput').oninput = function() {
    clearTimeout(state.searchTimeout);
    var q = this.value.trim();
    renderSearchSuggest();
    if (q.length >= 2) {
      state.searchTimeout = setTimeout(api.doSearch, 300);
    } else if (q.length === 0) {
      closeSearchSuggest();
      if (document.getElementById('allItems').classList.contains('active')) { api.loadAllItems(true); return; }
      var activeItem = document.querySelector('.sidebar-item.active');
      if (activeItem) {
        var folderNode = activeItem.closest('.folder-node');
        if (folderNode && folderNode.dataset.folderId) {
          api.loadFolderItems(folderNode.dataset.folderId);
          return;
        }
      }
      if (state.currentTagName) { api.loadTagItems(state.currentTagName); return; }
      if (document.getElementById('recent7').classList.contains('active')) { api.loadRecentItems(7); return; }
      if (document.getElementById('recent30').classList.contains('active')) { api.loadRecentItems(30); return; }
      api.loadAllItems(true);
    }
  };
  document.getElementById('searchInput').onfocus = renderSearchSuggest;
  document.body.addEventListener('mousedown', function(e) {
    if (e.target.closest('.search-box')) return;
    closeSearchSuggest();
  });
  document.body.addEventListener('click', function(e) {
    var row = e.target.closest('.search-suggest-item');
    if (!row) return;
    var suggest = document.getElementById('searchSuggest');
    var items = suggest && suggest._items ? suggest._items : [];
    var idx = Number(row.dataset.suggestIndex || -1);
    if (items[idx]) runSearchSuggest(items[idx]);
  });

  // View toggle
  document.getElementById('viewGrid').onclick = function() {
    if (state.viewMode === 'grid') return;
    interactionModule.setViewMode('grid');
    if (state.currentItems.length || state.currentSubfolders.length) render.renderContent();
  };
  document.getElementById('viewJustified').onclick = function() {
    if (state.viewMode === 'justified') return;
    interactionModule.setViewMode('justified');
    if (state.currentItems.length || state.currentSubfolders.length) render.renderContent();
  };
  document.getElementById('viewList').onclick = function() {
    if (state.viewMode === 'list') return;
    interactionModule.setViewMode('list');
    if (state.currentItems.length || state.currentSubfolders.length) render.renderContent();
  };
  document.getElementById('layoutSettingsBtn').onclick = function() {
    syncCanvasSettings();
    openPanel('canvasSettingsPanel');
  };
  var densityRange = document.getElementById('gridDensityRange');
  if (densityRange) {
    densityRange.oninput = function() {
      setCanvasDensity(this.value);
    };
  }
  document.querySelectorAll('[data-canvas-layout]').forEach(function(btn) {
    btn.onclick = function() {
      var mode = btn.dataset.canvasLayout || 'grid';
      if (state.viewMode !== mode) {
        setViewMode(mode);
        if (state.currentItems.length || state.currentSubfolders.length) render.renderContent();
      }
      syncCanvasSettings();
    };
  });
  document.querySelectorAll('[data-canvas-fit]').forEach(function(btn) {
    btn.onclick = function() {
      canvasPrefs.fit = btn.dataset.canvasFit === 'contain' ? 'contain' : 'cover';
      saveCanvasPrefs();
      applyCanvasPrefs();
    };
  });
  document.querySelectorAll('[data-canvas-pref]').forEach(function(input) {
    input.onchange = function() {
      canvasPrefs[input.dataset.canvasPref] = input.checked;
      saveCanvasPrefs();
      applyCanvasPrefs();
    };
  });
  var canvasDensityRange = document.getElementById('canvasDensityRange');
  if (canvasDensityRange) canvasDensityRange.oninput = function() { setCanvasDensity(this.value); };
  window.addEventListener('resize', function() {
    if (canvasPrefsDevice === getCanvasDevice()) return;
    loadCanvasPrefs();
    setViewMode(api.getPreferredViewMode(), true);
    if (state.currentItems.length || state.currentSubfolders.length) render.renderContent();
  });

  // Theme
  document.getElementById('themeToggle').onclick = function() {
    toggleTheme();
  };

  // Export
  document.getElementById('exportListBtn').onclick = function() { exportList('csv'); };
  document.getElementById('exportListBtn').oncontextmenu = function(e) {
    e.preventDefault();
    exportList('json');
  };
  document.getElementById('exportSelectedBtn').onclick = function() { exportSelected('csv'); };
  document.getElementById('exportSelectedBtn').oncontextmenu = function(e) {
    e.preventDefault();
    exportSelected('json');
  };
  document.getElementById('reloadLibraryBtn').onclick = function() { api.reloadLibrary(); };
  document.getElementById('filterPanelBtn').onclick = function() { syncFilterForm(); openPanel('advancedPanel'); };
  document.getElementById('filterColorTolerance').oninput = function() {
    document.getElementById('filterColorToleranceValue').value = this.value;
    renderAdvancedFilterSummary(readFiltersFromForm(), true);
  };
  document.querySelectorAll('#advancedPanel input, #advancedPanel select').forEach(function(input) {
    if (input.id === 'filterColorTolerance') return;
    input.addEventListener('input', function() { renderAdvancedFilterSummary(readFiltersFromForm(), true); });
    input.addEventListener('change', function() { renderAdvancedFilterSummary(readFiltersFromForm(), true); });
  });
  document.getElementById('savedViewsBtn').onclick = function() { renderSavedViews(); openPanel('savedViewsPanel'); };
  document.getElementById('statsBtn').onclick = function() { openPanel('statsPanel'); api.fetchStats().then(renderStatsPanel); };
  document.getElementById('duplicatesBtn').onclick = function() { api.loadDuplicates(); };
  document.getElementById('commandBtn').onclick = openCommandPalette;
  var copyCurrentViewBtn = document.getElementById('copyCurrentViewBtn');
  if (copyCurrentViewBtn) copyCurrentViewBtn.onclick = function() { copyCurrentViewLink(copyCurrentViewBtn); };
  document.querySelectorAll('[data-close-panel]').forEach(function(btn) {
    btn.onclick = function() { closePanel(btn.dataset.closePanel); };
  });
  document.getElementById('applyFiltersBtn').onclick = function() {
    state.advancedFilters = readFiltersFromForm();
    syncFilterForm();
    closePanel('advancedPanel');
    api.refreshCurrentView();
  };
  document.getElementById('clearFiltersBtn').onclick = function() {
    state.advancedFilters = {};
    syncFilterForm();
    closePanel('advancedPanel');
    api.refreshCurrentView();
  };
  document.getElementById('saveCurrentViewBtn').onclick = function() {
    var input = document.getElementById('savedViewName');
    var name = (input.value || '').trim();
    if (!name) return;
    saveCurrentViewAsSmartView(name);
    input.value = '';
  };
  var exportSavedViewsBtn = document.getElementById('exportSavedViewsBtn');
  if (exportSavedViewsBtn) exportSavedViewsBtn.onclick = exportSavedViewsConfig;
  var importSavedViewsBtn = document.getElementById('importSavedViewsBtn');
  var importSavedViewsInput = document.getElementById('importSavedViewsInput');
  if (importSavedViewsBtn && importSavedViewsInput) {
    importSavedViewsBtn.onclick = function() { importSavedViewsInput.click(); };
    importSavedViewsInput.onchange = function() {
      var file = importSavedViewsInput.files && importSavedViewsInput.files[0];
      importSavedViewsFile(file);
      importSavedViewsInput.value = '';
    };
  }
  var exportCollectionsBtn = document.getElementById('exportCollectionsBtn');
  if (exportCollectionsBtn) exportCollectionsBtn.onclick = exportCollectionsConfig;
  var importCollectionsBtn = document.getElementById('importCollectionsBtn');
  var importCollectionsInput = document.getElementById('importCollectionsInput');
  if (importCollectionsBtn && importCollectionsInput) {
    importCollectionsBtn.onclick = function() { importCollectionsInput.click(); };
    importCollectionsInput.onchange = function() {
      var file = importCollectionsInput.files && importCollectionsInput.files[0];
      importCollectionsFile(file);
      importCollectionsInput.value = '';
    };
  }
  document.getElementById('commandOverlay').onclick = function(e) {
    if (e.target.id === 'commandOverlay') closeCommandPalette();
  };
  document.getElementById('commandInput').oninput = renderCommandList;
  document.getElementById('commandInput').onkeydown = function(e) {
    if (e.key === 'Escape') {
      closeCommandPalette();
      e.preventDefault();
    }
  };
  document.body.addEventListener('click', function(e) {
    var btn = e.target.closest('.btn-collection');
    if (!btn) return;
    toggleCollection(btn.dataset.list, btn.dataset.id);
    if (state.inspectorItem && btn.dataset.id === state.inspectorItem.id) render.openInspector(state.inspectorItem);
  });
  document.body.addEventListener('click', function(e) {
    var btn = e.target.closest('.btn-workspace');
    if (!btn) return;
    var item = findCurrentItem(btn.dataset.id);
    if (item) runItemAction(item, 'workspace', btn);
  });
  document.body.addEventListener('click', function(e) {
    var btn = e.target.closest('[data-item-rating]');
    if (!btn) return;
    e.preventDefault();
    e.stopPropagation();
    var item = findCurrentItem(btn.dataset.id);
    if (!item && state.inspectorItem && state.inspectorItem.id === btn.dataset.id) item = state.inspectorItem;
    if (!item) return;
    var selected = Number(btn.dataset.itemRating) || 0;
    var current = Number((state.itemRatings || {})[item.id] || 0);
    setItemRating(item, selected === current ? 0 : selected);
  });
  document.body.addEventListener('click', function(e) {
    var modeButton = e.target.closest('[data-review-marker-mode="point"]');
    var addButton = e.target.closest('[data-review-marker-add]');
    var focusButton = e.target.closest('[data-review-marker-focus]');
    var deleteButton = e.target.closest('[data-review-marker-delete]');
    if (!modeButton && !addButton && !focusButton && !deleteButton) return;
    e.preventDefault();
    e.stopPropagation();
    var item = state.inspectorItem;
    if (!item) return;
    if (focusButton) {
      focusReviewMarker(focusButton.dataset.reviewMarkerFocus);
      return;
    }
    if (deleteButton) {
      if (window.confirm('删除这条审片标记？')) deleteReviewMarker(item, deleteButton.dataset.reviewMarkerDelete);
      return;
    }
    var compose = getReviewMarkerComposer(item.id);
    var editor = compose && compose.querySelector('textarea');
    var text = String((editor && editor.value) || '').trim().slice(0, 1000);
    if (!text) {
      showToast('先写下标记说明', 'error');
      if (editor) editor.focus();
      return;
    }
    if (modeButton) {
      var preview = document.getElementById('inspectorPreview');
      if (!preview || !preview.querySelector('img')) {
        showToast('当前素材没有可定位的图片预览', 'error');
        return;
      }
      preview.dataset.reviewMarkerMode = 'point';
      preview.dataset.reviewMarkerDraft = text;
      preview.classList.add('review-marker-mode');
      modeButton.classList.add('active');
      var hint = compose.querySelector('[data-review-marker-hint]');
      if (hint) hint.textContent = '定位模式已开启：现在点一下上方图片。';
      preview.scrollIntoView({ block: 'center', behavior: 'smooth' });
      return;
    }
    if (addButton.dataset.reviewMarkerAdd === 'time') {
      var input = compose.querySelector('[data-review-marker-time]');
      var time = parseReviewMarkerTime(input && input.value);
      if (!isFinite(time)) {
        showToast('时间格式请使用 01:23 或秒数', 'error');
        if (input) input.focus();
        return;
      }
      addReviewMarker(item, { kind: 'time', text: text, time: time });
    } else {
      addReviewMarker(item, { kind: 'general', text: text });
    }
  });
  document.body.addEventListener('input', function(e) {
    var editor = e.target.closest('.viewer-note-editor');
    if (!editor) return;
    var compose = editor.closest('[data-viewer-note-compose]');
    var status = compose && compose.querySelector('.viewer-note-status');
    var count = compose && compose.querySelector('.viewer-note-count');
    if (status) status.textContent = '编辑中…';
    if (count) count.textContent = editor.value.length + ' / 4000';
    clearTimeout(viewerNoteSaveTimers[editor.dataset.id]);
    viewerNoteSaveTimers[editor.dataset.id] = setTimeout(function() { commitViewerNote(editor); }, 650);
  });
  document.body.addEventListener('focusout', function(e) {
    var editor = e.target.closest('.viewer-note-editor');
    if (editor) commitViewerNote(editor);
  });
  document.body.addEventListener('keydown', function(e) {
    var editor = e.target.closest('.viewer-note-editor');
    if (!editor || !(e.metaKey || e.ctrlKey) || e.key !== 'Enter') return;
    e.preventDefault();
    commitViewerNote(editor);
    editor.blur();
  });
  document.body.addEventListener('click', function(e) {
    var btn = e.target.closest('.btn-share-link');
    if (!btn) return;
    var item = findCurrentItem(btn.dataset.id);
    shareItemLink(item, btn);
  });
  document.body.addEventListener('click', function(e) {
    var btn = e.target.closest('.btn-share-file');
    if (!btn) return;
    var item = findCurrentItem(btn.dataset.id);
    shareItemFile(item, btn);
  });
  document.body.addEventListener('click', function(e) {
    var btn = e.target.closest('.btn-copy-info');
    if (!btn) return;
    var item = findCurrentItem(btn.dataset.id);
    copyItemInfo(item, btn);
  });
  document.body.addEventListener('click', function(e) {
    var btn = e.target.closest('.btn-copy-reference');
    if (!btn) return;
    var item = findCurrentItem(btn.dataset.id);
    copyItemReference(item, btn.dataset.refFormat || 'markdown', btn);
  });
  document.body.addEventListener('click', function(e) {
    var btn = e.target.closest('.btn-download-original');
    if (!btn) return;
    var item = findCurrentItem(btn.dataset.id);
    runItemAction(item, 'download', btn);
  });
  document.body.addEventListener('click', function(e) {
    var btn = e.target.closest('[data-mobile-workbar-action]');
    if (!btn) return;
    var action = btn.dataset.mobileWorkbarAction;
    if (action === 'back') {
      navigateBackInApp();
    } else if (action === 'search' && window._openMobileSearchSheet) {
      window._openMobileSearchSheet();
    } else if (action === 'more' && window._openMobileMoreSheet) {
      window._openMobileMoreSheet();
    } else if (action === 'share') {
      shareCurrentViewLink(btn);
    }
  });
  document.body.addEventListener('click', function(e) {
    var btn = e.target.closest('[data-mobile-continue-action]');
    if (!btn) return;
    var action = btn.dataset.mobileContinueAction;
    if (action === 'preview-last') {
      previewLastViewedItem();
    } else if (action === 'review') {
      startUndoneReview();
    } else if (action === 'resume') {
      resumeLastViewedItem();
    } else if (action === 'later') {
      showCollection('later');
    } else if (action === 'snapshot') {
      api.warmCurrentOfflineSnapshot();
    }
  });
  document.body.addEventListener('click', function(e) {
    var btn = e.target.closest('[data-list-mobile-action]');
    if (!btn) return;
    e.preventDefault();
    e.stopPropagation();
    var item = findCurrentItem(btn.dataset.id);
    if (!item) return;
    var action = btn.dataset.listMobileAction;
    if (action === 'preview') {
      var fileUrl = API + '/api/items/' + item.id + '/file';
      if (isItemPreviewable(item)) render.previewItem(item, fileUrl);
      else window.open(fileUrl, '_blank');
    } else if (action === 'inspect') {
      render.openInspector(item);
    } else if (action === 'select') {
      if (render.toggleSelect) render.toggleSelect(item.id);
    }
  });
  document.body.addEventListener('click', function(e) {
    var btn = e.target.closest('[data-inspector-related]');
    if (!btn) return;
    var action = btn.dataset.inspectorRelated;
    var search = document.getElementById('searchInput');
    if (search) search.value = '';
    clearAllActive();
    render.closeInspector();
    if (action === 'ext') {
      var query = btn.dataset.query || '';
      state.listType = 'all';
      state.advancedFilters = { ext: normalizeFilterExt(query) };
      if (search) search.value = query;
      syncToolbarSelects();
      syncFilterForm();
      api.loadAllItems(true);
      return;
    }
    var type = btn.dataset.type || 'all';
    state.listType = type;
    state.advancedFilters = {};
    if (action === 'shape') {
      state.advancedFilters = { shape: btn.dataset.shape || '' };
    } else if (action === 'min-dimensions') {
      state.advancedFilters = {
        min_width: Number(btn.dataset.minWidth || 0) || '',
        min_height: Number(btn.dataset.minHeight || 0) || ''
      };
    }
    syncToolbarSelects();
    syncFilterForm();
    api.loadAllItems(true);
  });
  document.body.addEventListener('click', function(e) {
    var btn = e.target.closest('[data-source-domain]');
    if (!btn) return;
    e.preventDefault();
    e.stopPropagation();
    openSourceDomainView(btn.dataset.sourceDomain || '');
  });
  document.body.addEventListener('click', function(e) {
    var cardAction = e.target.closest('[data-card-action]');
    if (cardAction) {
      e.preventDefault();
      e.stopPropagation();
      var action = cardAction.dataset.cardAction;
      var itemId = cardAction.dataset.id;
      var item = state.currentItems.find(function(it) { return it.id === itemId; }) ||
        (state.collectionIds.items && state.collectionIds.items[itemId]) ||
        (state.inspectorItem && state.inspectorItem.id === itemId ? state.inspectorItem : null);
      if (!item) return;
      if (action === 'favorite' || action === 'later' || action === 'done') {
        toggleCollection(action, itemId);
        return;
      }
      if (action === 'inspect') {
        if (!state.selectedIds.size) render.openInspector(item);
        return;
      }
      if (action === 'preview') {
        if (state.selectedIds.size) return;
        var fileUrl = API + '/api/items/' + itemId + '/file';
        if (isItemPreviewable(item)) render.previewItem(item, fileUrl);
        else window.open(fileUrl, '_blank');
      }
      return;
    }
    var swatch = e.target.closest('[data-inspector-color]');
    if (!swatch) return;
    e.preventDefault();
    e.stopPropagation();
    var color = swatch.dataset.inspectorColor || '';
    openPaletteColorView(color);
  });
  document.body.addEventListener('click', function(e) {
    var folderBtn = e.target.closest('[data-inspector-folder]');
    if (!folderBtn) return;
    e.preventDefault();
    e.stopPropagation();
    var folderId = folderBtn.dataset.inspectorFolder;
    if (!folderId) return;
    openFolderAndFocus(folderId, folderBtn.dataset.itemFocusId || '');
  });
  document.body.addEventListener('click', function(e) {
    var folderBtn = e.target.closest('[data-item-folder]');
    if (!folderBtn) return;
    e.preventDefault();
    e.stopPropagation();
    var folderId = folderBtn.dataset.itemFolder;
    if (!folderId) return;
    openFolderAndFocus(folderId, folderBtn.dataset.itemFocusId || '');
  });
  document.body.addEventListener('click', function(e) {
    var folderBtn = e.target.closest('[data-preview-folder]');
    if (!folderBtn) return;
    e.preventDefault();
    e.stopPropagation();
    var folderId = folderBtn.dataset.previewFolder;
    if (!folderId) return;
    var overlay = folderBtn.closest('.preview-overlay');
    if (overlay && overlay.dataset) overlay.dataset.suppressReturnFocus = '1';
    if (overlay && render.closePreviewOverlay) {
      render.closePreviewOverlay(overlay);
    } else if (overlay) {
      overlay.remove();
    }
    openFolderAndFocus(folderId, folderBtn.dataset.itemFocusId || '');
  });
  document.body.addEventListener('click', function(e) {
    var sourceBtn = e.target.closest('[data-preview-source-domain]');
    if (!sourceBtn) return;
    e.preventDefault();
    e.stopPropagation();
    var domain = sourceBtn.dataset.previewSourceDomain || '';
    if (!domain) return;
    var overlay = sourceBtn.closest('.preview-overlay');
    if (overlay && overlay.dataset) overlay.dataset.suppressReturnFocus = '1';
    if (overlay && render.closePreviewOverlay) {
      render.closePreviewOverlay(overlay);
    } else if (overlay) {
      overlay.remove();
    }
    openSourceDomainView(domain);
  });
  document.body.addEventListener('click', function(e) {
    var extBtn = e.target.closest('[data-item-ext]');
    if (!extBtn) return;
    e.preventDefault();
    e.stopPropagation();
    var ext = normalizeFilterExt(extBtn.dataset.itemExt || '');
    if (!ext) return;
    state.listType = 'all';
    state.advancedFilters = Object.assign({}, state.advancedFilters || {}, { ext: ext });
    syncToolbarSelects();
    syncFilterForm();
    api.refreshCurrentView();
  });
  document.body.addEventListener('click', function(e) {
    var tagBtn = e.target.closest('[data-item-tag]');
    if (!tagBtn) return;
    e.preventDefault();
    e.stopPropagation();
    var tagName = tagBtn.dataset.itemTag;
    if (!tagName) return;
    var search = document.getElementById('searchInput');
    if (search) search.value = '';
    clearAllActive();
    render.closeInspector();
    api.loadTagItems(tagName).then(function() {
      if (render.syncActiveNavigationState) render.syncActiveNavigationState();
    });
  });
  document.body.addEventListener('click', function(e) {
    var tagBtn = e.target.closest('[data-inspector-tag]');
    if (!tagBtn) return;
    e.preventDefault();
    e.stopPropagation();
    var tagName = tagBtn.dataset.inspectorTag;
    if (!tagName) return;
    var search = document.getElementById('searchInput');
    if (search) search.value = '';
    clearAllActive();
    render.closeInspector();
    api.loadTagItems(tagName).then(function() {
      if (render.syncActiveNavigationState) render.syncActiveNavigationState();
    });
  });
  document.body.addEventListener('click', function(e) {
    var tagBtn = e.target.closest('[data-preview-tag]');
    if (!tagBtn) return;
    e.preventDefault();
    e.stopPropagation();
    var tagName = tagBtn.dataset.previewTag;
    if (!tagName) return;
    var overlay = tagBtn.closest('.preview-overlay');
    if (overlay && overlay.dataset) overlay.dataset.suppressReturnFocus = '1';
    if (overlay && render.closePreviewOverlay) {
      render.closePreviewOverlay(overlay);
    } else if (overlay) {
      overlay.remove();
    }
    var search = document.getElementById('searchInput');
    if (search) search.value = '';
    clearAllActive();
    render.closeInspector();
    api.loadTagItems(tagName).then(function() {
      if (render.syncActiveNavigationState) render.syncActiveNavigationState();
    });
  });
  document.body.addEventListener('click', function(e) {
    var crumb = e.target.closest('.content-crumb');
    if (!crumb) return;
    var search = document.getElementById('searchInput');
    if (search && !crumb.dataset.crumbSearch) search.value = '';
    clearAllActive();
    render.closeInspector();
    if (crumb.dataset.crumbFolder) {
      api.loadFolderItems(crumb.dataset.crumbFolder).then(function() {
        if (render.syncActiveNavigationState) render.syncActiveNavigationState();
      });
    } else if (crumb.dataset.crumbTag) {
      api.loadTagItems(crumb.dataset.crumbTag).then(function() {
        if (render.syncActiveNavigationState) render.syncActiveNavigationState();
      });
    } else if (crumb.dataset.crumbCollection) {
      showCollection(crumb.dataset.crumbCollection);
    } else if (crumb.dataset.crumbSmart) {
      openSmartViewByName(crumb.dataset.crumbSmart);
    } else if (crumb.dataset.crumbEagleSmart) {
      api.loadEagleSmartFolderItems(crumb.dataset.crumbEagleSmart);
    } else if (crumb.dataset.crumbRecent) {
      api.loadRecentItems(Number(crumb.dataset.crumbRecent) || 7);
    } else if (crumb.dataset.crumbSearch) {
      if (search) {
        search.value = crumb.dataset.crumbSearch;
        search.focus();
      }
      api.doSearch();
    } else if (crumb.dataset.crumbAction === 'duplicates') {
      api.loadDuplicates();
    } else if (crumb.dataset.crumbAction === 'colors') {
      api.loadColorAtlas();
    } else if (crumb.dataset.crumbAction === 'random') {
      api.loadRandomWalk(state.currentRandomSeed, false);
    } else if (crumb.dataset.crumbAction === 'search-root') {
      if (search) {
        search.focus();
        search.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    } else if (crumb.dataset.crumbAction === 'smart-root') {
      renderSavedViews();
      openPanel('savedViewsPanel');
    } else if (crumb.dataset.crumbAction === 'eagle-smart-root') {
      var nativeSection = document.getElementById('nativeSmartFolderSection');
      if (window.innerWidth <= 768 && window._openMobileSidebar) window._openMobileSidebar();
      if (nativeSection) nativeSection.scrollIntoView({ block: 'center', behavior: 'smooth' });
    } else if (crumb.dataset.crumbAction === 'workspaces') {
      openWorkspacesPanel([]);
    } else {
      api.loadAllItems(true);
    }
  });
  document.body.addEventListener('click', function(e) {
    var clearOne = e.target.closest('[data-clear-filter]');
    if (clearOne) {
      clearAdvancedFilter(clearOne.dataset.clearFilter);
      return;
    }
    if (e.target.closest('[data-clear-all-filters]')) {
      state.advancedFilters = {};
      syncFilterForm();
      api.refreshCurrentView();
    }
  });

  // Batch actions
  document.getElementById('selectAllBtn').onclick = function() {
    state.currentItems.forEach(function(item) { state.selectedIds.add(item.id); });
    if (state.currentItems.length) state.lastSelectedId = state.currentItems[state.currentItems.length - 1].id;
    updateBatchBar();
    updateCheckboxesInView();
  };
  document.getElementById('invertSelectBtn').onclick = function() { invertSelection(); };
  document.getElementById('clearSelectBtn').onclick = function() {
    state.selectedIds.clear();
    state.lastSelectedId = '';
    updateBatchBar();
    updateCheckboxesInView();
    closeBatchOutputSheet();
  };
  document.getElementById('batchCompareBtn').onclick = function() {
    render.openCompare(getSelectedItems());
  };
  document.getElementById('batchFavoriteBtn').onclick = function() {
    applyBatchCollection('favorite', 'add');
  };
  document.getElementById('batchLaterBtn').onclick = function() {
    applyBatchCollection('later', 'add');
  };
  document.getElementById('batchDoneBtn').onclick = function() {
    applyBatchCollection('done', 'add');
  };
  document.getElementById('batchWorkspaceBtn').onclick = function() {
    openWorkspacesPanel(Array.from(state.selectedIds || []));
  };
  document.getElementById('batchRemoveCollectionBtn').onclick = function() {
    if (state.currentView !== 'collection' || !state.currentCollection) return;
    var workspace = getWorkspaceFromCollection(state.currentCollection);
    if (workspace) {
      toggleWorkspaceItems(workspace.id, Array.from(state.selectedIds || []));
      state.selectedIds.clear();
      return;
    }
    applyBatchCollection(state.currentCollection, 'remove');
  };
  document.getElementById('batchCopyLinksBtn').onclick = function() {
    copySelectedLinks(this);
  };
  document.getElementById('batchCopyInfoBtn').onclick = function() {
    copySelectedInfo(this);
  };
  document.getElementById('batchCopyRefsBtn').onclick = function() {
    copySelectedReferences(this);
  };
  var batchMobileOutputBtn = document.getElementById('batchMobileOutputBtn');
  if (batchMobileOutputBtn) batchMobileOutputBtn.onclick = openBatchOutputSheet;
  document.getElementById('batchDownloadBtn').onclick = function() {
    downloadSelectedBatch(this);
  };
  var batchOutputOverlay = document.getElementById('batchOutputOverlay');
  if (batchOutputOverlay) {
    batchOutputOverlay.onclick = function(e) {
      if (e.target.closest('[data-batch-output-close]')) {
        closeBatchOutputSheet();
        return;
      }
      var actionBtn = e.target.closest('[data-batch-output-action]');
      if (!actionBtn) return;
      var action = actionBtn.dataset.batchOutputAction;
      if (action === 'copy-links') {
        copySelectedLinks(actionBtn);
      } else if (action === 'copy-info') {
        copySelectedInfo(actionBtn);
      } else if (action === 'copy-refs') {
        copySelectedReferences(actionBtn);
      } else if (action === 'export-csv') {
        exportSelected('csv');
      } else if (action === 'export-json') {
        exportSelected('json');
      } else if (action === 'download') {
        downloadSelectedBatch(actionBtn);
      }
      if (action !== 'download') {
        setTimeout(closeBatchOutputSheet, 450);
      }
    };
    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape' && batchOutputOverlay.classList.contains('open')) closeBatchOutputSheet();
    });
  }
  var selectedPreviewRail = document.getElementById('selectedPreviewRail');
  if (selectedPreviewRail) {
    selectedPreviewRail.onclick = function(e) {
      var btn = e.target.closest('[data-selected-preview-id]');
      if (!btn) return;
      var itemId = btn.dataset.selectedPreviewId;
      var target = document.querySelector('.card[data-item-id="' + itemId + '"]') ||
        document.querySelector('.item-row[data-item-id="' + itemId + '"]');
      if (target) {
        target.scrollIntoView({ block: 'center', inline: 'center', behavior: 'smooth' });
        target.classList.add('keyboard-focus');
        setTimeout(function() { target.classList.remove('keyboard-focus'); }, 900);
      }
    };
  }

  // Inspector close
  document.getElementById('inspectorPrev').onclick = function() { navigateInspector(-1); };
  document.getElementById('inspectorNext').onclick = function() { navigateInspector(1); };
  document.getElementById('inspectorClose').onclick = render.closeInspector;
  var inspectorMobileBackdrop = document.getElementById('inspectorMobileBackdrop');
  if (inspectorMobileBackdrop) inspectorMobileBackdrop.onclick = render.closeInspector;

  // Toolbar sort/filter selects
  document.getElementById('sortSelect').onchange = function() { onSortChange(this.value); };
  document.getElementById('sortDirSelect').onchange = function() { onDirChange(this.value); };
  document.getElementById('typeSelect').onchange = function() { onTypeChange(this.value); };
  document.getElementById('ctSortSelect').onchange = function() { onSortChange(this.value); };
  document.getElementById('ctSortDirSelect').onchange = function() { onDirChange(this.value); };
  document.getElementById('ctTypeSelect').onchange = function() { onTypeChange(this.value); };
  document.querySelectorAll('.quick-filter').forEach(function(btn) {
    btn.onclick = function() { onTypeChange(btn.dataset.type || 'all'); };
  });
  document.querySelectorAll('[data-mobile-filter]').forEach(function(btn) {
    btn.onclick = function() { toggleMobileQuickFilter(btn.dataset.mobileFilter || ''); };
  });

  // Hash change
  window.addEventListener('hashchange', async function() {
    if (applyStateFromUrl() && state.currentView) {
      if (state.inspectorItem && (!state.pendingItemId || state.inspectorItem.id !== state.pendingItemId)) render.closeInspector();
      syncFilterForm();
      syncToolbarSelects();
      await api.refreshCurrentView();
      await restorePendingInspector();
      await runPendingLaunchAction();
    }
  });

  syncFilterForm();
}

Object.assign(interactionModule, {
  setTheme: setTheme,
  loadLocalData: loadLocalData,
  setViewMode: setViewMode,
  setupKeyboard: setupKeyboard,
  setupSidebarResize: setupSidebarResize,
  setupSidebarToggle: setupSidebarToggle,
  setupMobileMenu: setupMobileMenu,
  setupMobileSearchSheet: setupMobileSearchSheet,
  setupMobileMoreSheet: setupMobileMoreSheet,
  updateMobileRemoteCard: updateMobileRemoteCard,
  checkRemoteStatus: checkRemoteStatus,
  setupRemoteStatusStrip: setupRemoteStatusStrip,
  setupLibraryChangeMonitor: setupLibraryChangeMonitor,
  setupInstallCoach: setupInstallCoach,
  setupMobilePullRefresh: setupMobilePullRefresh,
  setupMobileQuickActions: setupMobileQuickActions,
  setupCopyHandler: setupCopyHandler,
  syncFilterForm: syncFilterForm,
  syncToolbarSelects: syncToolbarSelects,
  syncMobileTabbar: syncMobileTabbar,
  openPaletteColorView: openPaletteColorView,
  commitPointReviewMarker: commitPointReviewMarker,
  openPanel: openPanel,
  renderSmartViewsSidebar: renderSmartViewsSidebar,
  openSmartViewByName: openSmartViewByName,
  startUndoneReview: startUndoneReview,
  runPendingLaunchAction: runPendingLaunchAction,
  showCollection: showCollection,
  rememberViewedItem: rememberViewedItem,
  openOfflineSnapshotRoute: openOfflineSnapshotRoute,
  restorePendingInspector: restorePendingInspector,
  bindEvents: bindEvents
});
