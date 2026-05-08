'use strict';

var state = EagleViewer.state;
var api = EagleViewer.modules.api;
var render = EagleViewer.modules.render;
var interactionModule = EagleViewer.modules.interactions = EagleViewer.modules.interactions || {};

// ===== Export =====
function buildExportRows(items) {
  return items.map(function(it) {
    var paths = (it.folderPaths || []).join(' ; ');
    return { name: it.name, path: paths, tags: (it.tags || []).join(','), ext: it.ext || '', size: it.size || 0, btime: it.btime, mtime: it.mtime };
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
    var header = '名称,路径,标签,格式,大小,创建时间,修改时间\n';
    var body = rows.map(function(r) {
      return '"' + (r.name || '').replace(/"/g, '""') + '","' + (r.path || '').replace(/"/g, '""') + '","' + (r.tags || '').replace(/"/g, '""') + '","' + (r.ext || '') + '",' + (r.size || 0) + ',"' + (r.btime ? new Date(r.btime).toISOString() : '') + '","' + (r.mtime ? new Date(r.mtime).toISOString() : '') + '"';
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
        if (targets[i].id && rectsOverlap(rect, targets[i].element.getBoundingClientRect()))
          state.selectedIds.add(targets[i].id);
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
  document.documentElement.setAttribute('data-theme', theme);
  var themeBtn = document.getElementById('themeToggle');
  if (themeBtn) themeBtn.innerHTML = theme === 'dark' ? iconMoon() : iconSun();
  try { localStorage.setItem('eagle-viewer-theme', theme); } catch (e) {}
}

// ===== Local app data =====
function loadLocalData() {
  try { state.savedViews = JSON.parse(localStorage.getItem('eagle-viewer-saved-views') || '[]'); } catch (e) { state.savedViews = []; }
  try { state.collectionIds = JSON.parse(localStorage.getItem('eagle-viewer-collections') || '{"favorite":[],"later":[]}'); } catch (e2) { state.collectionIds = { favorite: [], later: [] }; }
  if (!state.collectionIds.favorite) state.collectionIds.favorite = [];
  if (!state.collectionIds.later) state.collectionIds.later = [];
  if (!state.collectionIds.items) state.collectionIds.items = {};
}

function saveLocalData() {
  try { localStorage.setItem('eagle-viewer-saved-views', JSON.stringify(state.savedViews)); } catch (e) {}
  try { localStorage.setItem('eagle-viewer-collections', JSON.stringify(state.collectionIds)); } catch (e2) {}
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
  ['Shape', 'TagState', 'AnnotationState', 'SourceState'].forEach(function(name) {
    var el = document.getElementById('filter' + name);
    if (!el || !el.value) return;
    var key = name === 'Shape' ? 'shape' : name === 'TagState' ? 'tag_state' : name === 'AnnotationState' ? 'annotation_state' : 'source_state';
    out[key] = el.value;
  });
  return out;
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
}

function renderSavedViews() {
  var list = document.getElementById('savedViewList');
  if (!list) return;
  list.innerHTML = '';
  if (!state.savedViews.length) {
    list.innerHTML = '<span class="stat-pill">暂无保存视图</span>';
    return;
  }
  state.savedViews.forEach(function(view, idx) {
    var pill = document.createElement('span');
    pill.className = 'saved-view-pill';
    pill.innerHTML = '<span>' + escapeHtml(view.name) + '</span><button type="button">打开</button><button type="button">删除</button>';
    pill.querySelectorAll('button')[0].onclick = function() { applySavedView(view); };
    pill.querySelectorAll('button')[1].onclick = function() {
      state.savedViews.splice(idx, 1);
      saveLocalData();
      renderSavedViews();
    };
    list.appendChild(pill);
  });
}

function captureCurrentView(name) {
  return {
    name: name,
    view: state.currentView,
    folderId: state.currentFolderId,
    tagName: state.currentTagName,
    recentDays: state.recentDays,
    searchQuery: state.searchQuery,
    sort: state.listSort,
    dir: state.listDir,
    type: state.listType,
    filters: state.advancedFilters || {}
  };
}

function applySavedView(view) {
  state.listSort = view.sort || 'mtime';
  state.listDir = view.dir || 'desc';
  state.listType = view.type || 'all';
  state.advancedFilters = view.filters || {};
  syncToolbarSelects();
  syncFilterForm();
  if (view.view === 'folder' && view.folderId) api.loadFolderItems(view.folderId);
  else if (view.view === 'tag' && view.tagName) api.loadTagItems(view.tagName);
  else if (view.view === 'recent') api.loadRecentItems(view.recentDays || 7);
  else if (view.view === 'search') {
    document.getElementById('searchInput').value = view.searchQuery || '';
    api.doSearch();
  } else api.loadAllItems(true);
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

function toggleCollection(listName, id) {
  var list = state.collectionIds[listName] || [];
  var idx = list.indexOf(id);
  if (idx >= 0) list.splice(idx, 1);
  else {
    list.push(id);
    var item = state.currentItems.find(function(it) { return it.id === id; }) || state.inspectorItem;
    if (item && item.id === id) state.collectionIds.items[id] = item;
  }
  state.collectionIds[listName] = list;
  saveLocalData();
}

function showCollection(listName) {
  var ids = state.collectionIds[listName] || [];
  var itemMap = state.collectionIds.items || {};
  state.currentView = 'collection';
  state.currentTitle = listName === 'favorite' ? '收藏' : '待整理';
  state.currentSubfolders = [];
  state.currentItems = ids.map(function(id) { return itemMap[id]; }).filter(Boolean);
  state.currentTotal = state.currentItems.length;
  state.currentEmptyMsg = '当前清单暂无素材';
  render.renderContent();
}

function buildCommandItems(query) {
  var q = (query || '').toLowerCase();
  var folderMatches = [];
  var items = [
    { title: '全部文件', hint: '视图', run: function() { api.loadAllItems(true); } },
    { title: '最近 7 天', hint: '视图', run: function() { api.loadRecentItems(7); } },
    { title: '最近 30 天', hint: '视图', run: function() { api.loadRecentItems(30); } },
    { title: '疑似重复', hint: '工具', run: function() { api.loadDuplicates(); } },
    { title: '索引状态', hint: '工具', run: function() { openPanel('statsPanel'); api.fetchStats().then(renderStatsPanel); } },
    { title: '高级筛选', hint: '工具', run: function() { openPanel('advancedPanel'); } },
    { title: '收藏清单', hint: '本地清单', run: function() { showCollection('favorite'); } },
    { title: '待整理清单', hint: '本地清单', run: function() { showCollection('later'); } }
  ];
  state.savedViews.forEach(function(view) { items.push({ title: view.name, hint: '保存视图', run: function() { applySavedView(view); } }); });
  state.tagData.slice(0, 100).forEach(function(tag) { items.push({ title: tag.name, hint: '标签', run: function() { api.loadTagItems(tag.name); } }); });
  if (q) getFolderPathMatches(q, state.treeData, [], folderMatches);
  folderMatches.forEach(function(match) {
    items.push({ title: match.path, hint: '文件夹', run: function() { api.loadFolderItems(match.id); } });
  });
  return items.filter(function(item) { return !q || item.title.toLowerCase().indexOf(q) >= 0 || item.hint.toLowerCase().indexOf(q) >= 0; }).slice(0, 30);
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
  state.viewMode = mode;
  if (!skipPersist) {
    try { localStorage.setItem(getViewModeStorageKey(), mode); } catch (e) {}
  }
  var gridBtn = document.getElementById('viewGrid');
  var listBtn = document.getElementById('viewList');
  if (mode === 'grid') {
    gridBtn.classList.add('active');
    listBtn.classList.remove('active');
  } else {
    listBtn.classList.add('active');
    gridBtn.classList.remove('active');
  }
}

// ===== Keyboard shortcuts =====
function setupKeyboard() {
  document.addEventListener('keydown', function(e) {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
      openCommandPalette();
      e.preventDefault();
      return;
    }
    var commandOverlay = document.getElementById('commandOverlay');
    if (commandOverlay && commandOverlay.classList.contains('open') && e.key === 'Escape') {
      closeCommandPalette();
      e.preventDefault();
      return;
    }
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable) return;
    var overlay = document.querySelector('.preview-overlay');
    if (overlay) {
      if (e.key === 'Escape') overlay.remove();
      return;
    }
    if (e.key === 'Escape') {
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
    var key = e.key;
    if (key === 'j' || key === 'ArrowDown') {
      navigateItems(1);
      e.preventDefault();
    } else if (key === 'k' || key === 'ArrowUp') {
      navigateItems(-1);
      e.preventDefault();
    } else if (key === 'Enter') {
      var focused = document.querySelector('.keyboard-focus');
      if (focused) {
        var cb = focused.querySelector('.item-cb');
        if (cb && cb.dataset.id) {
          var item = state.currentItems.find(function(it) { return it.id === cb.dataset.id; });
          if (item) {
            var fileUrl = API + '/api/items/' + item.id + '/file';
            if (isPreviewable(item.ext)) render.previewItem(item, fileUrl);
            else window.open(fileUrl, '_blank');
          }
        }
      }
      e.preventDefault();
    } else if (key === ' ') {
      e.preventDefault();
      var focused = document.querySelector('.keyboard-focus');
      if (focused) {
        var cb = focused.querySelector('.item-cb');
        if (cb && cb.dataset.id) toggleSelect(cb.dataset.id);
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
  }
  function closeSidebar() {
    wrap.classList.remove('mobile-open');
    overlay.classList.remove('visible');
  }
  menuBtn.onclick = function() {
    if (wrap.classList.contains('mobile-open')) closeSidebar();
    else openSidebar();
  };
  overlay.onclick = closeSidebar;
  window._closeMobileSidebar = closeSidebar;
}

// ===== Copy image =====
function setupCopyHandler() {
  document.body.addEventListener('click', function(e) {
    var btn = e.target.closest('.btn-copy');
    if (!btn) return;
    var id = btn.dataset.id;
    if (!id) return;
    if (!navigator.clipboard || typeof navigator.clipboard.write !== 'function') {
      alert('当前环境不支持复制到剪贴板（请使用 HTTPS 或更新浏览器）');
      return;
    }
    var url = API + '/api/items/' + id + '/file';
    fetch(url).then(function(r) { return r.blob(); }).then(function(blob) {
      var type = blob.type || 'image/png';
      if (!type.startsWith('image/')) type = 'image/png';
      return navigator.clipboard.write([new ClipboardItem({ [type]: blob })]);
    }).then(function() {
      var orig = btn.innerHTML;
      btn.innerHTML = iconCopy() + ' 已复制';
      setTimeout(function() { btn.innerHTML = orig; }, 1500);
    }).catch(function(err) {
      alert('复制失败：' + (err && err.message ? err.message : '请使用 HTTPS 或受支持的浏览器'));
    });
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
  document.getElementById('tagSearchInput').oninput = function() { render.renderTagList(); };

  // Search
  document.getElementById('searchInput').onkeydown = function(e) {
    if (e.key === 'Enter') api.doSearch();
  };
  document.getElementById('searchInput').oninput = function() {
    clearTimeout(state.searchTimeout);
    var q = this.value.trim();
    if (q.length >= 2) {
      state.searchTimeout = setTimeout(api.doSearch, 300);
    } else if (q.length === 0) {
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

  // Theme
  document.getElementById('themeToggle').onclick = function() {
    var cur = document.documentElement.getAttribute('data-theme') || 'light';
    interactionModule.setTheme(cur === 'light' ? 'dark' : 'light');
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
  document.getElementById('savedViewsBtn').onclick = function() { renderSavedViews(); openPanel('savedViewsPanel'); };
  document.getElementById('statsBtn').onclick = function() { openPanel('statsPanel'); api.fetchStats().then(renderStatsPanel); };
  document.getElementById('duplicatesBtn').onclick = function() { api.loadDuplicates(); };
  document.getElementById('commandBtn').onclick = openCommandPalette;
  document.querySelectorAll('[data-close-panel]').forEach(function(btn) {
    btn.onclick = function() { closePanel(btn.dataset.closePanel); };
  });
  document.getElementById('applyFiltersBtn').onclick = function() {
    state.advancedFilters = readFiltersFromForm();
    api.refreshCurrentView();
  };
  document.getElementById('clearFiltersBtn').onclick = function() {
    state.advancedFilters = {};
    syncFilterForm();
    api.refreshCurrentView();
  };
  document.getElementById('saveCurrentViewBtn').onclick = function() {
    var input = document.getElementById('savedViewName');
    var name = (input.value || '').trim();
    if (!name) return;
    state.savedViews.push(captureCurrentView(name));
    input.value = '';
    saveLocalData();
    renderSavedViews();
  };
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
  });

  // Batch actions
  document.getElementById('selectAllBtn').onclick = function() {
    state.currentItems.forEach(function(item) { state.selectedIds.add(item.id); });
    updateBatchBar();
    updateCheckboxesInView();
  };
  document.getElementById('invertSelectBtn').onclick = function() { invertSelection(); };
  document.getElementById('clearSelectBtn').onclick = function() {
    state.selectedIds.clear();
    updateBatchBar();
    updateCheckboxesInView();
  };
  document.getElementById('batchDownloadBtn').onclick = function() {
    var ids = Array.from(state.selectedIds);
    if (!ids.length) return;
    fetch(API + '/api/items/batch-download', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(ids)
    }).then(function(r) {
      if (r.status === 401) { window.location.href = '/login'; return; }
      if (!r.ok) throw new Error('下载失败');
      return r.blob();
    }).then(function(blob) {
      if (!blob) return;
      var a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'eagle-batch.zip';
      a.click();
      URL.revokeObjectURL(a.href);
    }).catch(function(e) {
      alert('批量下载失败：' + (e.message || e));
    });
  };

  // Inspector close
  document.getElementById('inspectorPrev').onclick = function() { navigateInspector(-1); };
  document.getElementById('inspectorNext').onclick = function() { navigateInspector(1); };
  document.getElementById('inspectorClose').onclick = render.closeInspector;

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

  // Hash change
  window.addEventListener('hashchange', function() {
    if (applyStateFromUrl() && state.currentView) api.refreshCurrentView();
  });
}

Object.assign(interactionModule, {
  setTheme: setTheme,
  loadLocalData: loadLocalData,
  setViewMode: setViewMode,
  setupKeyboard: setupKeyboard,
  setupSidebarResize: setupSidebarResize,
  setupSidebarToggle: setupSidebarToggle,
  setupMobileMenu: setupMobileMenu,
  setupCopyHandler: setupCopyHandler,
  syncToolbarSelects: syncToolbarSelects,
  bindEvents: bindEvents
});
