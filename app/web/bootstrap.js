'use strict';

// ===== Init =====
async function init() {
  var state = EagleViewer.state;
  var api = EagleViewer.modules.api;
  var render = EagleViewer.modules.render;
  var interactions = EagleViewer.modules.interactions;

  injectIcons();
  renderVersionBadge();
  await interactions.loadLocalData();
  interactions.setViewMode(api.getPreferredViewMode(), true);

  var savedTheme = localStorage.getItem('eagle-viewer-theme') || 'light';
  interactions.setTheme(savedTheme);

  // Apply saved/default language to static DOM
  applyStaticI18n();

  interactions.setupSidebarResize();
  interactions.setupSidebarToggle();
  interactions.setupMobileMenu();
  interactions.setupMobileSearchSheet();
  interactions.setupMobileMoreSheet();
  interactions.setupRemoteStatusStrip();
  interactions.setupLibraryChangeMonitor();
  interactions.setupInstallCoach();
  interactions.setupMobilePullRefresh();
  interactions.setupMobileQuickActions();
  window.addEventListener('resize', render.refreshMasonryLayout);
  document.getElementById('contentBody').addEventListener('scroll', api.maybeLoadMoreIncrementalView);
  interactions.setupKeyboard();
  interactions.setupCopyHandler();
  var standaloneRouteRestore = restoreLastRouteForStandalone();
  interactions.bindEvents();

  try {
    await api.fetchTree();
    render.renderSidebar();
    await api.fetchTags();
    render.renderTagList();

    if (applyStateFromUrl() && state.currentView) {
      interactions.syncToolbarSelects();
      if (interactions.syncFilterForm) interactions.syncFilterForm();
      render.syncActiveNavigationState();
      if (state.currentView === 'folder' && state.currentFolderId) {
        await api.loadFolderItems(state.currentFolderId);
      } else if (state.currentView === 'tag' && state.currentTagName) {
        await api.loadTagItems(state.currentTagName);
      } else if (state.currentView === 'recent') {
        await api.loadRecentItems(state.recentDays);
      } else if (state.currentView === 'search' && state.searchQuery) {
        document.getElementById('searchInput').value = state.searchQuery;
        await api.doSearch();
      } else {
        await api.loadAllItems(true);
      }
    } else {
      await api.loadAllItems(true);
    }
    await restorePendingInspector();
    if (interactions.runPendingLaunchAction) await interactions.runPendingLaunchAction();
    if (standaloneRouteRestore && standaloneRouteRestore.restored && window.showToast) {
      window.showToast('已回到上次浏览位置', 'success');
    } else if (standaloneRouteRestore && standaloneRouteRestore.reason === 'stale' && window.showToast) {
      window.showToast('上次位置已过期，已打开资料库');
    }
  } catch (e) {
    document.getElementById('contentBody').innerHTML = '<div class="empty-state">' + iconFolderOutline() + '<span>无法加载资源库，请确认已挂载 Eagle 库路径。</span></div>';
  }
}

async function restorePendingInspector() {
  if (!state.pendingItemId) return;
  var itemId = state.pendingItemId;
  var item = (state.currentItems || []).find(function(candidate) { return candidate.id === itemId; });
  if (!item) {
    var resolved = await api.resolveItems([itemId]);
    item = resolved && resolved[0];
  }
  if (item && state.pendingItemId === itemId) render.openInspector(item);
}

function renderVersionBadge() {
  var badge = document.getElementById('appVersionBadge');
  if (!badge || !EagleViewer.config || !EagleViewer.config.version) return;
  badge.textContent = 'v' + EagleViewer.config.version;
  if (EagleViewer.config.versionDate) {
    badge.title = '版本 ' + EagleViewer.config.version + ' · ' + EagleViewer.config.versionDate;
  }
}

EagleViewer.init = init;
EagleViewer.refresh = function() {
  return EagleViewer.modules.api.refreshCurrentView();
};
EagleViewer.bootstrap = {
  init: init,
  refresh: EagleViewer.refresh,
  registerPwaServiceWorker: registerPwaServiceWorker
};

// PWA service worker
var pwaUpdateRegistration = null;
var pwaReloadRequested = false;
var lastPwaUpdateCheck = 0;
var pwaRegistrationStarted = false;

function hidePwaUpdatePrompt() {
  var card = document.getElementById('pwaUpdateCard');
  if (!card) return;
  card.classList.remove('visible');
  document.body.classList.remove('pwa-update-visible');
  setTimeout(function() { card.hidden = true; }, 220);
}

function showPwaUpdatePrompt(registration) {
  var card = document.getElementById('pwaUpdateCard');
  if (!card) return;
  pwaUpdateRegistration = registration || pwaUpdateRegistration;
  card.hidden = false;
  document.body.classList.add('pwa-update-visible');
  requestAnimationFrame(function() { card.classList.add('visible'); });

  var later = document.getElementById('pwaUpdateLater');
  var apply = document.getElementById('pwaUpdateApply');
  if (later) later.onclick = hidePwaUpdatePrompt;
  if (apply) apply.onclick = function() {
    apply.disabled = true;
    apply.textContent = '正在更新…';
    pwaReloadRequested = true;
    var waiting = pwaUpdateRegistration && pwaUpdateRegistration.waiting;
    if (waiting) waiting.postMessage({ type: 'SKIP_WAITING' });
    else window.location.reload();
  };
}

function watchPwaRegistration(registration) {
  pwaUpdateRegistration = registration;
  if (registration.waiting && navigator.serviceWorker.controller) {
    showPwaUpdatePrompt(registration);
  }
  registration.addEventListener('updatefound', function() {
    var worker = registration.installing;
    if (!worker) return;
    worker.addEventListener('statechange', function() {
      if (worker.state === 'installed' && navigator.serviceWorker.controller) {
        showPwaUpdatePrompt(registration);
      }
    });
  });
}

function checkForPwaUpdate() {
  if (!pwaUpdateRegistration || document.visibilityState !== 'visible') return;
  if (Date.now() - lastPwaUpdateCheck < 15 * 60 * 1000) return;
  lastPwaUpdateCheck = Date.now();
  pwaUpdateRegistration.update().catch(function() {});
}

function registerPwaServiceWorker() {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;
  if (pwaRegistrationStarted) return;
  pwaRegistrationStarted = true;
  var hadController = !!navigator.serviceWorker.controller;
  navigator.serviceWorker.addEventListener('controllerchange', function() {
    if (!hadController) {
      hadController = true;
      return;
    }
    if (pwaReloadRequested) window.location.reload();
    else showPwaUpdatePrompt(pwaUpdateRegistration);
  });
  navigator.serviceWorker.register(API + '/sw.js').then(function(registration) {
    lastPwaUpdateCheck = Date.now();
    watchPwaRegistration(registration);
    document.addEventListener('visibilitychange', checkForPwaUpdate);
  }).catch(function() {});
}

registerPwaServiceWorker();
init();
