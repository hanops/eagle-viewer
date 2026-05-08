'use strict';

// ===== Init =====
async function init() {
  var state = EagleViewer.state;
  var api = EagleViewer.modules.api;
  var render = EagleViewer.modules.render;
  var interactions = EagleViewer.modules.interactions;

  injectIcons();
  interactions.loadLocalData();
  interactions.setViewMode(api.getPreferredViewMode(), true);

  var savedTheme = localStorage.getItem('eagle-viewer-theme') || 'light';
  interactions.setTheme(savedTheme);

  interactions.setupSidebarResize();
  interactions.setupSidebarToggle();
  interactions.setupMobileMenu();
  window.addEventListener('resize', render.refreshMasonryLayout);
  document.getElementById('contentBody').addEventListener('scroll', api.maybeLoadMoreIncrementalView);
  interactions.setupKeyboard();
  interactions.setupCopyHandler();
  interactions.bindEvents();

  try {
    await api.fetchTree();
    render.renderSidebar();
    await api.fetchTags();
    render.renderTagList();

    if (applyStateFromUrl() && state.currentView) {
      interactions.syncToolbarSelects();
      render.syncActiveNavigationState();
      if (state.currentView === 'folder' && state.currentFolderId) {
        api.loadFolderItems(state.currentFolderId);
      } else if (state.currentView === 'tag' && state.currentTagName) {
        api.loadTagItems(state.currentTagName);
      } else if (state.currentView === 'recent') {
        api.loadRecentItems(state.recentDays);
      } else if (state.currentView === 'search' && state.searchQuery) {
        document.getElementById('searchInput').value = state.searchQuery;
        api.doSearch();
      } else {
        api.loadAllItems(true);
      }
    } else {
      api.loadAllItems(true);
    }
  } catch (e) {
    document.getElementById('contentBody').innerHTML = '<div class="empty-state">' + iconFolderOutline() + '<span>无法加载资源库，请确认已挂载 Eagle 库路径。</span></div>';
  }
}

EagleViewer.init = init;
EagleViewer.refresh = function() {
  return EagleViewer.modules.api.refreshCurrentView();
};
EagleViewer.bootstrap = {
  init: init,
  refresh: EagleViewer.refresh
};

// PWA service worker
if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
  navigator.serviceWorker.register(API + '/sw.js').catch(function() {});
}

init();
