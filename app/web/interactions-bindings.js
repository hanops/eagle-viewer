'use strict';

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
      if (EagleViewer.modules.render && EagleViewer.modules.render.updateMobileWorkbar) {
        EagleViewer.modules.render.updateMobileWorkbar();
      }
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
