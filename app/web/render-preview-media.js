'use strict';

function addImagePreviewTools(overlay, img) {
  var scale = 1;
  var rotation = 0;
  var flipped = false;
  var lastTapAt = 0;
  var lastTapX = 0;
  var lastTapY = 0;
  var pinching = false;
  var pinchStartDistance = 0;
  var pinchBaseScale = 1;
  var panning = false;
  var panStartX = 0;
  var panStartY = 0;
  var panBaseX = 0;
  var panBaseY = 0;
  var panX = 0;
  var panY = 0;
  var toolbar = document.createElement('div');
  toolbar.className = 'preview-tools preview-image-tools';
  toolbar.setAttribute('aria-label', '图片预览工具');
  toolbar.innerHTML =
    '<button type="button" data-preview-tool="zoom-out" aria-label="缩小">−</button>' +
    '<button type="button" data-preview-tool="fit">适应</button>' +
    '<button type="button" data-preview-tool="actual">1:1</button>' +
    '<i aria-hidden="true"></i>' +
    '<button type="button" data-preview-tool="flip" aria-label="水平翻转" aria-pressed="false">↔</button>' +
    '<button type="button" data-preview-tool="rotate" aria-label="顺时针旋转 90 度">↻</button>' +
    '<button type="button" data-preview-tool="zoom-in" aria-label="放大">＋</button>';
  var buttons = toolbar.querySelectorAll('button');
  function clampPan() {
    var maxX = Math.max(0, ((img.clientWidth || 0) - window.innerWidth + 48) / 2);
    var maxY = Math.max(0, ((img.clientHeight || 0) - window.innerHeight + 96) / 2);
    panX = Math.max(-maxX, Math.min(maxX, panX));
    panY = Math.max(-maxY, Math.min(maxY, panY));
  }
  function applyPan() {
    clampPan();
    var transforms = [];
    if (panX || panY) transforms.push('translate3d(' + panX.toFixed(1) + 'px,' + panY.toFixed(1) + 'px,0)');
    if (rotation) transforms.push('rotate(' + rotation + 'deg)');
    if (flipped) transforms.push('scaleX(-1)');
    setPreviewContentBaseTransform(img, transforms.join(' '));
    overlay.dataset.previewRotation = String(rotation);
    overlay.dataset.previewFlipped = flipped ? '1' : '0';
  }
  function resetPan() {
    panX = 0;
    panY = 0;
    applyPan();
  }
  function applyScale() {
    img.style.maxWidth = scale === 1 ? '100%' : 'none';
    img.style.maxHeight = scale === 1 ? '100%' : 'none';
    img.style.width = scale === 1 ? '' : (img.naturalWidth * scale) + 'px';
    img.style.height = scale === 1 ? '' : (img.naturalHeight * scale) + 'px';
    img.classList.toggle('is-zoomed', scale !== 1 || img.style.maxWidth === 'none');
    if (!img.classList.contains('is-zoomed')) resetPan();
    else applyPan();
  }
  function fitImage() {
    scale = 1;
    img.style.maxWidth = '100%';
    img.style.maxHeight = '100%';
    img.style.width = '';
    img.style.height = '';
    img.classList.remove('is-zoomed');
    resetPan();
  }
  function showActualSize() {
    scale = 1;
    img.style.maxWidth = 'none';
    img.style.maxHeight = 'none';
    img.style.width = img.naturalWidth + 'px';
    img.style.height = img.naturalHeight + 'px';
    img.classList.add('is-zoomed');
    resetPan();
  }
  function toggleTapZoom(e) {
    if (window.innerWidth > 768) return;
    e.preventDefault();
    e.stopPropagation();
    if (img.classList.contains('is-zoomed')) {
      fitImage();
      return;
    }
    scale = Math.min(2.2, Math.max(1.8, Math.min(img.naturalWidth / Math.max(1, img.clientWidth || img.naturalWidth), img.naturalHeight / Math.max(1, img.clientHeight || img.naturalHeight)) || 2));
    resetPan();
    applyScale();
  }
  function getTouchDistance(touches) {
    var dx = touches[0].clientX - touches[1].clientX;
    var dy = touches[0].clientY - touches[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
  }
  function getDisplayedScale() {
    if (!img.naturalWidth) return scale || 1;
    return (img.clientWidth || img.naturalWidth) / img.naturalWidth;
  }
  buttons[0].onclick = function(e) { e.stopPropagation(); scale = Math.max(0.2, scale - 0.2); applyScale(); };
  buttons[1].onclick = function(e) { e.stopPropagation(); fitImage(); };
  buttons[2].onclick = function(e) { e.stopPropagation(); showActualSize(); };
  buttons[3].onclick = function(e) {
    e.stopPropagation();
    flipped = !flipped;
    buttons[3].classList.toggle('active', flipped);
    buttons[3].setAttribute('aria-pressed', flipped ? 'true' : 'false');
    applyPan();
  };
  buttons[4].onclick = function(e) {
    e.stopPropagation();
    rotation = (rotation + 90) % 360;
    buttons[4].title = rotation ? ('已旋转 ' + rotation + '°') : '顺时针旋转 90 度';
    applyPan();
  };
  buttons[5].onclick = function(e) { e.stopPropagation(); scale = Math.min(5, scale + 0.2); applyScale(); };
  img.addEventListener('dblclick', toggleTapZoom);
  img.addEventListener('touchstart', function(e) {
    if (window.innerWidth > 768 || e.touches.length !== 2) return;
    pinching = true;
    panning = false;
    pinchStartDistance = getTouchDistance(e.touches);
    pinchBaseScale = getDisplayedScale();
    lastTapAt = 0;
    e.preventDefault();
    e.stopPropagation();
  }, { passive: false });
  img.addEventListener('touchstart', function(e) {
    if (window.innerWidth > 768 || e.touches.length !== 1 || !img.classList.contains('is-zoomed')) return;
    panning = true;
    panStartX = e.touches[0].clientX;
    panStartY = e.touches[0].clientY;
    panBaseX = panX;
    panBaseY = panY;
    lastTapAt = 0;
    img.classList.add('is-panning');
    e.preventDefault();
    e.stopPropagation();
  }, { passive: false });
  img.addEventListener('touchmove', function(e) {
    if (!pinching || e.touches.length !== 2 || !pinchStartDistance) return;
    var nextDistance = getTouchDistance(e.touches);
    scale = Math.max(0.12, Math.min(5, pinchBaseScale * (nextDistance / pinchStartDistance)));
    applyScale();
    e.preventDefault();
    e.stopPropagation();
  }, { passive: false });
  img.addEventListener('touchmove', function(e) {
    if (!panning || e.touches.length !== 1) return;
    panX = panBaseX + (e.touches[0].clientX - panStartX);
    panY = panBaseY + (e.touches[0].clientY - panStartY);
    applyPan();
    e.preventDefault();
    e.stopPropagation();
  }, { passive: false });
  img.addEventListener('touchend', function(e) {
    if (pinching) {
      if (e.touches.length < 2) {
        pinching = false;
        pinchStartDistance = 0;
        lastTapAt = 0;
      }
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    if (panning) {
      panning = false;
      img.classList.remove('is-panning');
      lastTapAt = 0;
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    if (e.changedTouches.length !== 1) return;
    var touch = e.changedTouches[0];
    var now = Date.now();
    var moved = Math.abs(touch.clientX - lastTapX) + Math.abs(touch.clientY - lastTapY);
    if (now - lastTapAt < 320 && moved < 34) {
      toggleTapZoom(e);
      lastTapAt = 0;
      return;
    }
    lastTapAt = now;
    lastTapX = touch.clientX;
    lastTapY = touch.clientY;
  }, { passive: false });
  img.addEventListener('touchcancel', function() {
    pinching = false;
    panning = false;
    pinchStartDistance = 0;
    lastTapAt = 0;
    img.classList.remove('is-panning');
  }, { passive: true });
  overlay.appendChild(toolbar);
}

function addVideoPreviewTools(overlay, video) {
  var rotation = 0;
  var flipped = false;
  var rates = [0.5, 1, 1.25, 1.5, 2];
  var rateIndex = 1;
  var toolbar = document.createElement('div');
  toolbar.className = 'preview-tools preview-video-tools';
  toolbar.setAttribute('aria-label', '视频预览工具');
  toolbar.innerHTML =
    '<button type="button" data-preview-tool="flip" aria-label="水平翻转" aria-pressed="false">↔</button>' +
    '<button type="button" data-preview-tool="rotate" aria-label="顺时针旋转 90 度">↻</button>' +
    '<i aria-hidden="true"></i>' +
    '<button type="button" data-preview-tool="rate" aria-label="切换播放速度">1×</button>' +
    '<button type="button" data-preview-tool="loop" aria-label="循环播放" aria-pressed="false">循环</button>';
  var flipButton = toolbar.querySelector('[data-preview-tool="flip"]');
  var rotateButton = toolbar.querySelector('[data-preview-tool="rotate"]');
  var rateButton = toolbar.querySelector('[data-preview-tool="rate"]');
  var loopButton = toolbar.querySelector('[data-preview-tool="loop"]');

  function applyTransform() {
    var transforms = [];
    if (rotation) transforms.push('rotate(' + rotation + 'deg)');
    if (flipped) transforms.push('scaleX(-1)');
    setPreviewContentBaseTransform(video, transforms.join(' '));
    overlay.dataset.previewRotation = String(rotation);
    overlay.dataset.previewFlipped = flipped ? '1' : '0';
  }

  flipButton.onclick = function(e) {
    e.stopPropagation();
    flipped = !flipped;
    flipButton.classList.toggle('active', flipped);
    flipButton.setAttribute('aria-pressed', flipped ? 'true' : 'false');
    applyTransform();
  };
  rotateButton.onclick = function(e) {
    e.stopPropagation();
    rotation = (rotation + 90) % 360;
    rotateButton.title = rotation ? ('已旋转 ' + rotation + '°') : '顺时针旋转 90 度';
    applyTransform();
  };
  rateButton.onclick = function(e) {
    e.stopPropagation();
    rateIndex = (rateIndex + 1) % rates.length;
    video.playbackRate = rates[rateIndex];
    rateButton.textContent = rates[rateIndex] + '×';
    rateButton.title = '播放速度 ' + rates[rateIndex] + '×';
  };
  loopButton.onclick = function(e) {
    e.stopPropagation();
    video.loop = !video.loop;
    loopButton.classList.toggle('active', video.loop);
    loopButton.setAttribute('aria-pressed', video.loop ? 'true' : 'false');
  };
  overlay.appendChild(toolbar);
}

function getPreviewableItems() {
  return (state.currentItems || []).filter(function(item) { return isItemPreviewable(item); });
}

function getPreviewIndex(item, items) {
  if (!item || !item.id) return -1;
  for (var i = 0; i < items.length; i++) {
    if (items[i].id === item.id) return i;
  }
  return -1;
}

function previewSibling(item, direction) {
  var items = getPreviewableItems();
  var idx = getPreviewIndex(item, items);
  if (idx < 0) return;
  var next = idx + direction;
  if (next < 0 || next >= items.length) return;
  var nextItem = items[next];
  transitionToPreviewItem(nextItem);
}

function transitionToPreviewItem(item) {
  if (!item) return;
  document.querySelectorAll('.preview-overlay').forEach(function(existing) {
    existing.dataset.suppressReturnFocus = '1';
    existing.dataset.previewTransition = '1';
  });
  renderModule.previewItem(item, API + '/api/items/' + item.id + '/file');
}

function getPreviewContentElement(overlay) {
  return overlay && overlay.querySelector(':scope > img, :scope > video, :scope > iframe, :scope > pre, :scope > .preview-audio-card, :scope > .preview-font-studio, :scope > .ooxml-preview-stage, :scope > .cached-asset-preview');
}

function setPreviewContentBaseTransform(content, transform) {
  if (!content) return;
  content.dataset.previewBaseTransform = transform || '';
  content.style.transform = transform || '';
}

function restorePreviewContentBaseTransform(content) {
  if (!content) return;
  content.style.transform = content.dataset.previewBaseTransform || '';
}

function setPreviewSwipeOffset(overlay, dx) {
  var content = getPreviewContentElement(overlay);
  if (!content) return;
  overlay.classList.add('preview-swiping');
  content.style.transform = 'translate3d(' + Math.max(-34, Math.min(34, dx * 0.18)) + 'px,0,0) scale(.992)';
}

function resetPreviewSwipeOffset(overlay) {
  var content = getPreviewContentElement(overlay);
  overlay.classList.remove('preview-swiping');
  restorePreviewContentBaseTransform(content);
}

function setPreviewDismissOffset(overlay, dy) {
  var content = getPreviewContentElement(overlay);
  if (!content) return;
  var offset = Math.max(0, Math.min(142, dy * 0.58));
  var scale = Math.max(0.92, 1 - offset / 900);
  var alpha = Math.max(0.42, 0.88 - offset / 260);
  overlay.classList.add('preview-dismissing');
  overlay.style.background = 'rgba(0,0,0,' + alpha.toFixed(2) + ')';
  content.style.transform = 'translate3d(0,' + offset + 'px,0) scale(' + scale.toFixed(3) + ')';
}

function resetPreviewDismissOffset(overlay) {
  var content = getPreviewContentElement(overlay);
  overlay.classList.remove('preview-dismissing');
  overlay.style.background = '';
  restorePreviewContentBaseTransform(content);
}
