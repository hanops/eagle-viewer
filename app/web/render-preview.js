'use strict';

// ===== Preview overlay =====
function suppressBackgroundForPreview(overlay) {
  var records = [];
  Array.prototype.forEach.call(document.body.children, function(el) {
    if (el === overlay || el.tagName === 'SCRIPT' || el.tagName === 'STYLE') return;
    records.push({
      el: el,
      inert: !!el.inert,
      ariaHidden: el.getAttribute('aria-hidden')
    });
    el.inert = true;
    el.setAttribute('aria-hidden', 'true');
  });
  overlay._cleanup.push(function() {
    records.forEach(function(record) {
      record.el.inert = record.inert;
      if (record.ariaHidden === null) record.el.removeAttribute('aria-hidden');
      else record.el.setAttribute('aria-hidden', record.ariaHidden);
    });
  });
}

function createPreviewOverlay() {
  document.querySelectorAll('.preview-overlay').forEach(function(existing) { closePreviewOverlay(existing); });
  var overlay = document.createElement('div');
  overlay.className = 'preview-overlay';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-label', '素材全屏预览');
  overlay._cleanup = [];
  overlay.onclick = function(e) { if (e.target === overlay) closePreviewOverlay(overlay); };
  var close = document.createElement('button');
  close.className = 'preview-close';
  close.setAttribute('aria-label', '关闭全屏预览');
  close.innerHTML = iconClose();
  close.onclick = function() { closePreviewOverlay(overlay); };
  overlay.appendChild(close);
  document.body.appendChild(overlay);
  suppressBackgroundForPreview(overlay);
  document.body.classList.add('preview-open');
  requestAnimationFrame(function() { close.focus({ preventScroll: true }); });
  return overlay;
}

function closePreviewOverlay(overlay) {
  if (!overlay) return;
  var focusItemId = overlay.dataset ? overlay.dataset.previewItemId : '';
  var suppressReturnFocus = overlay.dataset && overlay.dataset.suppressReturnFocus === '1';
  var isPreviewTransition = overlay.dataset && overlay.dataset.previewTransition === '1';
  (overlay._cleanup || []).forEach(function(cleanup) { cleanup(); });
  overlay.remove();
  if (!document.querySelector('.preview-overlay')) document.body.classList.remove('preview-open');
  if (suppressReturnFocus) return;
  requestAnimationFrame(function() { returnFocusToItem(focusItemId); });
}

function closeCompareOverlay(overlay) {
  overlay = overlay || document.querySelector('.compare-overlay');
  if (!overlay) return;
  (overlay._cleanup || []).forEach(function(cleanup) { cleanup(); });
  overlay.remove();
  document.body.classList.remove('compare-open');
}

function getCompareImageItems(items) {
  var seen = {};
  return (items || []).filter(function(item) {
    if (!item || !item.id || !isImageExt(item.ext) || seen[item.id]) return false;
    seen[item.id] = true;
    return true;
  });
}

function openCompare(items) {
  var eligible = getCompareImageItems(items);
  if (eligible.length < 2) {
    if (window.showToast) window.showToast('请至少选择 2 张图片进行对比', 'error');
    return;
  }
  if (eligible.length > 4 && window.showToast) window.showToast('对比台已载入前 4 张图片');
  eligible = eligible.slice(0, 4);
  document.querySelectorAll('.compare-overlay').forEach(function(existing) { closeCompareOverlay(existing); });
  document.querySelectorAll('.preview-overlay').forEach(function(existing) { closePreviewOverlay(existing); });

  var overlay = document.createElement('div');
  overlay.className = 'compare-overlay';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-label', '图片对比台');
  overlay._cleanup = [];
  overlay.innerHTML = '<header class="compare-head">' +
    '<div class="compare-title"><span>' + iconCompare() + '</span><div><small>VISUAL COMPARE</small><strong>图片对比台</strong></div><b>' + eligible.length + ' UP</b></div>' +
    '<div class="compare-tools" role="toolbar" aria-label="对比工具">' +
      '<button type="button" data-compare-action="sync" class="active" aria-pressed="true">同步</button>' +
      '<button type="button" data-compare-action="zoom-out" aria-label="缩小">−</button>' +
      '<output data-compare-zoom>100%</output>' +
      '<button type="button" data-compare-action="zoom-in" aria-label="放大">＋</button>' +
      '<button type="button" data-compare-action="fit">适应</button>' +
      '<button type="button" data-compare-action="actual">1:1</button>' +
      '<button type="button" data-compare-action="close" class="compare-close" aria-label="关闭对比">' + iconClose() + '</button>' +
    '</div>' +
  '</header>' +
  '<main class="compare-grid compare-count-' + eligible.length + '">' + eligible.map(function(item, index) {
    var fileUrl = API + '/api/items/' + encodeURIComponent(item.id) + '/file';
    var thumbUrl = API + '/api/items/' + encodeURIComponent(item.id) + '/thumbnail';
    var dimensions = item.width && item.height ? item.width + ' × ' + item.height : '尺寸未知';
    return '<article class="compare-pane" data-compare-index="' + index + '">' +
      '<div class="compare-canvas"><img src="' + fileUrl + '" data-fallback="' + thumbUrl + '" alt="' + escapeHtml(item.name || '对比图片') + '" draggable="false"></div>' +
      '<footer><span>' + String(index + 1).padStart(2, '0') + '</span><div><strong>' + escapeHtml(item.name || '未命名素材') + '</strong><small>' + escapeHtml((item.ext || 'IMAGE').toUpperCase() + ' · ' + dimensions) + '</small></div><b data-compare-pane-zoom>100%</b></footer>' +
    '</article>';
  }).join('') + '</main>' +
  '<div class="compare-mobile-hint">横滑切换 · 双击复位</div>';

  document.body.appendChild(overlay);
  document.body.classList.add('compare-open');
  suppressBackgroundForPreview(overlay);
  var states = eligible.map(function() { return { zoom: 1, x: 0, y: 0 }; });
  var sync = true;
  var activeIndex = 0;

  function updatePane(index) {
    var pane = overlay.querySelector('[data-compare-index="' + index + '"]');
    if (!pane) return;
    var image = pane.querySelector('img');
    var paneZoom = pane.querySelector('[data-compare-pane-zoom]');
    var value = states[index];
    image.style.transform = 'translate3d(' + value.x + 'px,' + value.y + 'px,0) scale(' + value.zoom + ')';
    if (paneZoom) paneZoom.textContent = Math.round(value.zoom * 100) + '%';
  }

  function updateAll() {
    states.forEach(function(_state, index) { updatePane(index); });
    var output = overlay.querySelector('[data-compare-zoom]');
    if (output) output.textContent = Math.round(states[activeIndex].zoom * 100) + '%';
  }

  function setZoom(nextZoom) {
    nextZoom = Math.max(1, Math.min(8, nextZoom));
    var targets = sync ? states : [states[activeIndex]];
    targets.forEach(function(value) {
      value.zoom = nextZoom;
      if (nextZoom === 1) { value.x = 0; value.y = 0; }
    });
    updateAll();
  }

  Array.prototype.forEach.call(overlay.querySelectorAll('.compare-pane'), function(pane) {
    var index = Number(pane.dataset.compareIndex);
    var canvas = pane.querySelector('.compare-canvas');
    var image = pane.querySelector('img');
    setImageFallback(image, image.dataset.fallback, function() { pane.classList.add('load-failed'); });
    pane.onpointerenter = function() { activeIndex = index; updateAll(); };
    pane.onclick = function() { activeIndex = index; updateAll(); };
    canvas.ondblclick = function() {
      activeIndex = index;
      setZoom(1);
    };
    canvas.onwheel = function(event) {
      event.preventDefault();
      activeIndex = index;
      setZoom(states[index].zoom * (event.deltaY < 0 ? 1.12 : 0.89));
    };
    canvas.onpointerdown = function(event) {
      if (event.pointerType === 'touch' && window.innerWidth <= 768) return;
      if (states[index].zoom <= 1) return;
      activeIndex = index;
      var startX = event.clientX;
      var startY = event.clientY;
      var origins = states.map(function(value) { return { x: value.x, y: value.y }; });
      canvas.setPointerCapture(event.pointerId);
      canvas.classList.add('dragging');
      canvas.onpointermove = function(moveEvent) {
        var dx = moveEvent.clientX - startX;
        var dy = moveEvent.clientY - startY;
        states.forEach(function(value, stateIndex) {
          if (!sync && stateIndex !== index) return;
          value.x = origins[stateIndex].x + dx;
          value.y = origins[stateIndex].y + dy;
          updatePane(stateIndex);
        });
      };
      canvas.onpointerup = canvas.onpointercancel = function() {
        canvas.classList.remove('dragging');
        canvas.onpointermove = null;
        canvas.onpointerup = null;
        canvas.onpointercancel = null;
      };
    };
  });

  overlay.querySelector('.compare-tools').onclick = function(event) {
    var button = event.target.closest('[data-compare-action]');
    if (!button) return;
    var action = button.dataset.compareAction;
    if (action === 'close') closeCompareOverlay(overlay);
    else if (action === 'sync') {
      sync = !sync;
      button.classList.toggle('active', sync);
      button.setAttribute('aria-pressed', sync ? 'true' : 'false');
    } else if (action === 'zoom-in') setZoom(states[activeIndex].zoom * 1.25);
    else if (action === 'zoom-out') setZoom(states[activeIndex].zoom / 1.25);
    else if (action === 'fit') setZoom(1);
    else if (action === 'actual') {
      var pane = overlay.querySelector('[data-compare-index="' + activeIndex + '"] .compare-canvas');
      var image = overlay.querySelector('[data-compare-index="' + activeIndex + '"] img');
      var fitWidth = pane && image && image.naturalWidth ? pane.clientWidth / image.naturalWidth : 1;
      var fitHeight = pane && image && image.naturalHeight ? pane.clientHeight / image.naturalHeight : 1;
      setZoom(Math.max(1, 1 / Math.min(fitWidth || 1, fitHeight || 1)));
    }
  };

  function onKeydown(event) {
    var handled = true;
    if (event.key === 'Escape') closeCompareOverlay(overlay);
    else if (event.key === '+' || event.key === '=') setZoom(states[activeIndex].zoom * 1.25);
    else if (event.key === '-') setZoom(states[activeIndex].zoom / 1.25);
    else if (event.key === '0') setZoom(1);
    else handled = false;
    if (handled) {
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
    }
  }
  document.addEventListener('keydown', onKeydown, true);
  overlay._cleanup.push(function() { document.removeEventListener('keydown', onKeydown, true); });
  updateAll();
  overlay.querySelector('[data-compare-action="close"]').focus();
}

function setPreviewStatus(overlay, message) {
  var status = overlay.querySelector('.preview-status');
  if (!status) {
    status = document.createElement('div');
    status.className = 'preview-status';
    overlay.appendChild(status);
  }
  status.textContent = message;
  return status;
}

function clearPreviewStatus(overlay) {
  var status = overlay.querySelector('.preview-status');
  if (status) status.remove();
}

function setPreviewQualityNotice(overlay, offline) {
  if (!overlay) return;
  var notice = overlay.querySelector('.preview-quality-notice') || document.createElement('div');
  notice.className = 'preview-quality-notice';
  notice.dataset.state = offline ? 'offline' : 'fallback';
  notice.setAttribute('role', 'status');
  notice.innerHTML = offline
    ? '<strong>离线预览</strong><small>当前为缓存缩略图 · 原文件需重连</small>'
    : '<strong>缩略图预览</strong><small>原文件加载失败 · 当前显示低分辨率版本</small>';
  if (!notice.parentNode) overlay.appendChild(notice);
}
