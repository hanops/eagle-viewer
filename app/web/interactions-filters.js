'use strict';

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
