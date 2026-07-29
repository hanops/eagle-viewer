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
