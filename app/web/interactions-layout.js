'use strict';

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
