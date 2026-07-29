'use strict';

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
