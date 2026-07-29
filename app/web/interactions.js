'use strict';

var state = EagleViewer.state;
var api = EagleViewer.modules.api;
var render = EagleViewer.modules.render;
var interactionModule = EagleViewer.modules.interactions = EagleViewer.modules.interactions || {};
// ===== Grid density (thumbnail size) =====
// Shared by the desktop masonry/justified layout and the mobile density buttons.
// Kept as a JS variable (no DOM element) so layout sizing works without the
// removed canvas-settings panel.
var gridDensity = 184;
var gridDensityStorageKey = 'eagle-viewer-grid-density';

function loadGridDensity() {
  try {
    var saved = localStorage.getItem(gridDensityStorageKey);
    if (saved) gridDensity = Math.max(116, Math.min(260, Number(saved) || 184));
  } catch (e) {}
}

function setCanvasDensity(value) {
  gridDensity = Math.max(116, Math.min(260, Number(value) || 184));
  try { localStorage.setItem(gridDensityStorageKey, String(gridDensity)); } catch (e) {}
  if (render && render.refreshMasonryLayout) render.refreshMasonryLayout();
}

// ===== Export =====
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
var THEMES = {
  gallery:    { theme: 'light', accent: 'terra',  meta: '#fbfaf8', label: '画廊（浅色）' },
  workbench:  { theme: 'dark',  accent: 'blue',   meta: '#1c1c1e', label: '工作台（深色蓝）' },
  carbon:     { theme: 'dark',  accent: 'green',  meta: '#15170f', label: '碳工作室（深色绿）' }
};
function currentThemeName() {
  var theme = document.documentElement.getAttribute('data-theme');
  var accent = document.documentElement.getAttribute('data-accent');
  if (theme === 'dark' && accent === 'green') return 'carbon';
  if (theme === 'dark') return 'workbench';
  return 'gallery';
}
function setTheme(name) {
  if (!THEMES[name]) name = 'gallery';
  var t = THEMES[name];
  var root = document.documentElement;
  root.setAttribute('data-theme', t.theme);
  root.setAttribute('data-accent', t.accent);
  root.style.colorScheme = t.theme;
  document.querySelectorAll('.theme-swatch').forEach(function(btn) {
    var on = btn.dataset.themeName === name;
    btn.classList.toggle('active', on);
    btn.setAttribute('aria-pressed', on ? 'true' : 'false');
  });
  var themeMeta = document.querySelector('meta[name="theme-color"]');
  if (themeMeta) themeMeta.content = t.meta;
  // Smooth, layout-neutral color transition while the theme switches.
  root.classList.add('theme-transition');
  clearTimeout(setTheme._t);
  setTheme._t = setTimeout(function(){ root.classList.remove('theme-transition'); }, 260);
  try { localStorage.setItem('eagle-viewer-theme', name); } catch (e) {}
  var appearanceMenu = document.getElementById('appearanceMenu');
  if (appearanceMenu && appearanceMenu.open && document.activeElement && document.activeElement.closest('.theme-swatch')) {
    appearanceMenu.removeAttribute('open');
  }
}

async function loadLocalData() {
  loadGridDensity();
  var status = document.getElementById('syncStatus');
  if (status) {
    status.dataset.state = 'local';
    status.textContent = 'Local';
  }
}

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
  var order = ['gallery', 'workbench', 'carbon'];
  var idx = order.indexOf(currentThemeName());
  interactionModule.setTheme(order[(idx + 1) % order.length]);
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
  if (minWidth !== null) out.min_width = Math.round(minWidth);
  if (minHeight !== null) out.min_height = Math.round(minHeight);
  if (minSize !== null) out.min_size = Math.round(minSize * mb);
  if (maxSize !== null) out.max_size = Math.round(maxSize * mb);
  var sourceDomain = normalizeFilterSourceDomain((document.getElementById('filterSourceDomain') || {}).value || '');
  if (sourceDomain) out.source_domain = sourceDomain;
  var ext = normalizeFilterExt((document.getElementById('filterExt') || {}).value || '');
  if (ext) out.ext = ext;
  ['Shape', 'TagState', 'AnnotationState', 'SourceState'].forEach(function(name) {
    var el = document.getElementById('filter' + name);
    if (!el || !el.value) return;
    var key = name === 'Shape' ? 'shape' :
      name === 'TagState' ? 'tag_state' :
      name === 'AnnotationState' ? 'annotation_state' :
      'source_state';
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
  var sourceLabels = { sourced: '有来源', unsourced: '无来源' };
  add('source_state', '来源', sourceLabels[f.source_state] || f.source_state || '');
  add('source_domain', '来源站点', f.source_domain || '');
  add('ext', '格式', f.ext ? '.' + f.ext : '');
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
  setVal('filterSourceState', f.source_state);
  setVal('filterSourceDomain', f.source_domain);
  setVal('filterExt', f.ext);
  var filterButton = document.getElementById('filterPanelBtn');
  if (filterButton) filterButton.classList.toggle('active', Object.keys(f).length > 0);
  renderActiveFilterChips();
  renderAdvancedFilterSummary(f, false);
  if (render && render.updateMobileWorkbar) render.updateMobileWorkbar();
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
  (window.URL_FILTER_KEYS || [
    'min_size', 'max_size', 'min_width', 'min_height', 'mtime_from', 'mtime_to',
    'shape', 'tag_state', 'annotation_state', 'source_state', 'source_domain', 'ext'
  ]).forEach(function(key) {
    var val = (state.advancedFilters || {})[key];
    if (val !== null && val !== undefined && val !== '') params.set(key, val);
  });
  return location.origin + location.pathname + location.search + '#' + params.toString();
}

function copyCurrentViewLink(button) {
  copyTextToClipboard(buildCurrentViewUrl(), '当前视图链接', button);
}

async function shareCurrentViewLink(button) {
  var url = buildCurrentViewUrl();
  var title = state.currentTitle || 'Eagle Vault';
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
  return false;
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
  if (state.currentView === 'search') activeId = 'mobileSearchBtn';
  setMobileTabActive(activeId);
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

function getMobileSearchQuickItems() {
  return [
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
  wrap.querySelectorAll('[data-mobile-density]').forEach(function(btn) {
    var active = Number(btn.dataset.mobileDensity) === gridDensity;
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
  } else {
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
  var groupLabels = { tag: '标签', folder: '文件夹', search: '搜索建议' };
  var groupOrder = ['tag', 'folder', 'search'];
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
        var kicker = item.type === 'tag' ? '标签' : item.type === 'folder' ? '文件夹' : '搜索';
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
  } else if (item.type === 'search') {
    if (search) search.value = item.value;
    api.doSearch();
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
    if (window._closeMobileSearchSheet) window._closeMobileSearchSheet();
    sheet.classList.remove('closing');
    sheet.classList.add('open');
    sheet.setAttribute('aria-hidden', 'false');
    var tab = document.getElementById('mobileMoreBtn');
    if (tab) tab.setAttribute('aria-expanded', 'true');
    document.body.classList.add('mobile-more-open');
    setMobileTabActive('mobileMoreBtn');
    checkRemoteStatus({ reload: false, quietStrip: true });
  }

  sheet.addEventListener('click', function(e) {
    if (e.target.closest('[data-mobile-more-close]')) {
      closeMoreSheet();
      return;
    }
    if (e.target.closest('#mobileRemoteRefresh')) {
      checkRemoteStatus({ reload: false, quietStrip: false, message: '正在检查远程 Vault…' });
      return;
    }
    var actionEl = e.target.closest('[data-mobile-more-action]');
    if (!actionEl) return;
    var action = actionEl.dataset.mobileMoreAction;
    closeMoreSheet();
    if (action === 'sidebar' && window._openMobileSidebar) {
      window._openMobileSidebar();
    } else if (action === 'refresh') {
      api.reloadLibrary();
    } else if (action === 'theme') {
      toggleTheme();
    }
  });
  bindMobileSheetDrag(sheet, '.mobile-more-sheet', '.mobile-more-backdrop', closeMoreSheet);
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape' && sheet.classList.contains('open')) closeMoreSheet();
  });
  window._openMobileMoreSheet = openMoreSheet;
  window._closeMobileMoreSheet = closeMoreSheet;
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
  } else if (action === 'select') {
    if (render.toggleSelect) render.toggleSelect(item.id);
    var selectSheet = document.getElementById('quickActionSheet');
    if (selectSheet) updateQuickActionSheetState(selectSheet, item);
    var selectMenu = document.getElementById('itemContextMenu');
    if (selectMenu) updateDesktopContextMenuState(selectMenu, item);
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
  if (!pills.length) pills.push('<span class="quick-action-state-pill muted">未选择</span>');
  return pills.join('');
}

function updateQuickActionSheetState(sheet, item) {
  var select = sheet.querySelector('[data-quick-action="select"]');
  var download = sheet.querySelector('[data-quick-action="download"]');
  var status = sheet.querySelector('.quick-action-state');
  var selected = state.selectedIds.has(item.id);
  if (status) status.innerHTML = renderQuickActionStatePills(item);
  if (select) {
    select.classList.toggle('active', selected);
    select.querySelector('span').textContent = selected ? '取消选择' : '选择';
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
  var download = menu.querySelector('[data-context-action="download"]');
  if (select) select.textContent = state.selectedIds.has(item.id) ? '取消选择' : '加入选择';
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
    if (action !== 'share' && action !== 'copy' && action !== 'copy-info' && action !== 'copy-md' && action !== 'copy-html') closeDesktopContextMenu();
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
          '<div class="quick-action-section-title"><span>操作</span><em>选择当前素材</em></div>' +
          '<div class="quick-action-grid">' +
            '<button type="button" data-quick-action="select">' + iconCollection() + '<span>选择</span></button>' +
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
    } else if (action === 'folder' || action === 'source') {
      runItemAction(item, action, actionEl);
    } else if (action === 'select') {
      runItemAction(item, action, actionEl);
      closeQuickActionSheet();
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
  var map = {
    'sortSelect': state.listSort,
    'sortDirSelect': state.listDir,
    'typeSelect': state.listType,
    'ctSortSelect': state.listSort,
    'ctSortDirSelect': state.listDir,
    'ctTypeSelect': state.listType
  };
  Object.keys(map).forEach(function(id) {
    var el = document.getElementById(id);
    if (el) el.value = map[id];
  });
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
  document.getElementById('tagSearchInput').oninput = function() { render.renderTagList(); };

  var mobileLibraryBtn = document.getElementById('mobileLibraryBtn');
  var mobileSearchBtn = document.getElementById('mobileSearchBtn');
  var mobileMoreBtn = document.getElementById('mobileMoreBtn');
  var returnBtn = document.getElementById('returnToCurrentItemBtn');
  [mobileLibraryBtn, mobileSearchBtn, mobileMoreBtn].forEach(function(btn) {
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
  document.getElementById('viewList').onclick = function() {
    if (state.viewMode === 'list') return;
    interactionModule.setViewMode('list');
    if (state.currentItems.length || state.currentSubfolders.length) render.renderContent();
  };

  // Theme switcher (three themes, top-right)
  document.querySelectorAll('.theme-swatch').forEach(function(btn) {
    btn.onclick = function() { setTheme(btn.dataset.themeName); };
  });

  // Language switcher
  var langBtn = document.getElementById('langBtn');
  if (langBtn) {
    langBtn.onclick = function() {
      var newLang = getLang() === 'zh' ? 'en' : 'zh';
      setLang(newLang);
      applyStaticI18n();
      // Update toolbar buttons with data-i18n-title
      document.querySelectorAll('[data-i18n-title]').forEach(function(el) {
        el.setAttribute('title', t(el.getAttribute('data-i18n-title')));
      });
      // Re-apply theme aria-labels
      document.querySelectorAll('.theme-swatch').forEach(function(btn) {
        btn.setAttribute('aria-label', t('theme_' + btn.dataset.themeName));
      });
    };
  }

  // Export
  var copyCurrentViewBtn = document.getElementById('copyCurrentViewBtn');
  if (copyCurrentViewBtn) copyCurrentViewBtn.onclick = function() { copyCurrentViewLink(copyCurrentViewBtn); };
  document.querySelectorAll('[data-close-panel]').forEach(function(btn) {
    btn.onclick = function() { closePanel(btn.dataset.closePanel); };
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
        (state.inspectorItem && state.inspectorItem.id === itemId ? state.inspectorItem : null);
      if (!item) return;
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
    } else if (crumb.dataset.crumbRecent) {
      api.loadRecentItems(Number(crumb.dataset.crumbRecent) || 7);
    } else if (crumb.dataset.crumbSearch) {
      if (search) {
        search.value = crumb.dataset.crumbSearch;
        search.focus();
      }
      api.doSearch();
    } else if (crumb.dataset.crumbAction === 'search-root') {
      if (search) {
        search.focus();
        search.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
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
  };
  document.getElementById('batchCopyLinksBtn').onclick = function() {
    copySelectedLinks(this);
  };
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
  var mainArea = document.getElementById('mainArea');
  if (mainArea) {
    mainArea.addEventListener('click', function(e) {
      if (!state.inspectorItem || window.matchMedia('(max-width: 768px)').matches) return;
      if (e.target.closest(
        '.card, .folder-card, .list-table tr, button, a, input, select, label, ' +
        '[role="button"], [tabindex]'
      )) return;
      render.closeInspector();
    });
  }

  // Toolbar sort/filter selects
  ['sortSelect', 'sortDirSelect', 'typeSelect'].forEach(function(id) {
    var el = document.getElementById(id);
    if (!el) return;
    if (id === 'sortSelect') el.onchange = function() { onSortChange(this.value); };
    else if (id === 'sortDirSelect') el.onchange = function() { onDirChange(this.value); };
    else if (id === 'typeSelect') el.onchange = function() { onTypeChange(this.value); };
  });
  document.getElementById('ctSortSelect').onchange = function() { onSortChange(this.value); };
  document.getElementById('ctSortDirSelect').onchange = function() { onDirChange(this.value); };
  document.getElementById('ctTypeSelect').onchange = function() { onTypeChange(this.value); };
  document.querySelectorAll('.quick-filter').forEach(function(btn) {
    btn.onclick = function() { onTypeChange(btn.dataset.type || 'all'); };
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
  openPanel: openPanel,
  runPendingLaunchAction: runPendingLaunchAction,
  restorePendingInspector: restorePendingInspector,
  bindEvents: bindEvents
});
