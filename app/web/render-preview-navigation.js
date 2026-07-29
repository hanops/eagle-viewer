'use strict';

function addPreviewNavigation(overlay, item) {
  var items = getPreviewableItems();
  var idx = getPreviewIndex(item, items);
  var hasSiblingNav = idx >= 0 && items.length > 1;
  var prevDisabled = !hasSiblingNav || idx <= 0;
  var nextDisabled = !hasSiblingNav || idx >= items.length - 1;
  if (hasSiblingNav) {
    var sequence = document.createElement('div');
    sequence.className = 'preview-sequence-bar';
    var counter = document.createElement('div');
    counter.className = 'preview-counter';
    counter.textContent = (idx + 1) + ' / ' + items.length;
    sequence.appendChild(counter);
    overlay.appendChild(sequence);
    var prev = document.createElement('button');
    prev.type = 'button';
    prev.className = 'preview-nav preview-prev';
    prev.disabled = prevDisabled;
    prev.innerHTML = iconChevronLeft();
    prev.setAttribute('aria-label', '上一项');
    prev.onclick = function(e) {
      e.stopPropagation();
      previewSibling(item, -1);
    };
    overlay.appendChild(prev);

    var next = document.createElement('button');
    next.type = 'button';
    next.className = 'preview-nav preview-next';
    next.disabled = nextDisabled;
    next.innerHTML = iconChevronRight();
    next.setAttribute('aria-label', '下一项');
    next.onclick = function(e) {
      e.stopPropagation();
      previewSibling(item, 1);
    };
    overlay.appendChild(next);
  }

  function onKey(e) {
    if (!document.body.contains(overlay)) return;
    if (hasSiblingNav && e.key === 'ArrowLeft' && !prevDisabled) {
      e.preventDefault();
      e.stopPropagation();
      previewSibling(item, -1);
    } else if (hasSiblingNav && e.key === 'ArrowRight' && !nextDisabled) {
      e.preventDefault();
      e.stopPropagation();
      previewSibling(item, 1);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      closePreviewOverlay(overlay);
    }
  }
  document.addEventListener('keydown', onKey, true);
  overlay._cleanup.push(function() { document.removeEventListener('keydown', onKey, true); });

  var startX = 0;
  var startY = 0;
  var lastX = 0;
  var lastY = 0;
  var tracking = false;
  var gestureMode = '';
  var canVerticalDismiss = ['pdf', 'txt'].indexOf(String(item.ext || '').toLowerCase()) < 0;
  function shouldIgnore(target) {
    return !!(target && target.closest('button, input, [contenteditable], .preview-tools, .preview-font-studio, .ooxml-preview-stage, video, iframe, pre, audio'));
  }
  overlay.addEventListener('touchstart', function(e) {
    if (window.innerWidth > 768 || e.touches.length !== 1 || shouldIgnore(e.target)) return;
    startX = e.touches[0].clientX;
    startY = e.touches[0].clientY;
    lastX = startX;
    lastY = startY;
    tracking = true;
    gestureMode = '';
  }, { passive: true });
  overlay.addEventListener('touchmove', function(e) {
    if (!tracking || e.touches.length !== 1) return;
    lastX = e.touches[0].clientX;
    lastY = e.touches[0].clientY;
    var dx = lastX - startX;
    var dy = lastY - startY;
    var absX = Math.abs(dx);
    var absY = Math.abs(dy);
    if (!gestureMode && absX > 18 && absX > absY * 1.25) gestureMode = 'horizontal';
    if (!gestureMode && canVerticalDismiss && dy > 24 && absY > absX * 1.22) gestureMode = 'vertical';
    if (gestureMode === 'horizontal') setPreviewSwipeOffset(overlay, dx);
    if (gestureMode === 'vertical') setPreviewDismissOffset(overlay, dy);
  }, { passive: true });
  overlay.addEventListener('touchend', function() {
    if (!tracking) return;
    tracking = false;
    var dx = lastX - startX;
    var dy = lastY - startY;
    resetPreviewSwipeOffset(overlay);
    resetPreviewDismissOffset(overlay);
    if (gestureMode === 'vertical' && dy > 118 && Math.abs(dy) > Math.abs(dx) * 1.2) {
      closePreviewOverlay(overlay);
      return;
    }
    if (gestureMode === 'horizontal' && Math.abs(dx) > 72 && Math.abs(dx) > Math.abs(dy) * 1.35) previewSibling(item, dx < 0 ? 1 : -1);
    gestureMode = '';
  }, { passive: true });

  var pointerTracking = false;
  var pointerId = null;
  var pointerStartX = 0;
  var pointerStartY = 0;
  var pointerLastX = 0;
  var pointerLastY = 0;
  var pointerGestureMode = '';
  overlay.addEventListener('pointerdown', function(e) {
    if (window.innerWidth > 768 || e.pointerType === 'touch' || e.button !== 0 || shouldIgnore(e.target)) return;
    pointerTracking = true;
    pointerId = e.pointerId;
    pointerStartX = e.clientX;
    pointerStartY = e.clientY;
    pointerLastX = pointerStartX;
    pointerLastY = pointerStartY;
    pointerGestureMode = '';
    try { overlay.setPointerCapture(pointerId); } catch (err) {}
  });
  overlay.addEventListener('pointermove', function(e) {
    if (!pointerTracking || e.pointerId !== pointerId) return;
    pointerLastX = e.clientX;
    pointerLastY = e.clientY;
    var dx = pointerLastX - pointerStartX;
    var dy = pointerLastY - pointerStartY;
    var absX = Math.abs(dx);
    var absY = Math.abs(dy);
    if (!pointerGestureMode && absX > 18 && absX > absY * 1.25) pointerGestureMode = 'horizontal';
    if (!pointerGestureMode && canVerticalDismiss && dy > 24 && absY > absX * 1.22) pointerGestureMode = 'vertical';
    if (pointerGestureMode === 'horizontal') setPreviewSwipeOffset(overlay, dx);
    if (pointerGestureMode === 'vertical') setPreviewDismissOffset(overlay, dy);
  });
  overlay.addEventListener('pointerup', function(e) {
    if (!pointerTracking || e.pointerId !== pointerId) return;
    pointerTracking = false;
    var dx = pointerLastX - pointerStartX;
    var dy = pointerLastY - pointerStartY;
    resetPreviewSwipeOffset(overlay);
    resetPreviewDismissOffset(overlay);
    if (pointerGestureMode === 'vertical' && dy > 118 && Math.abs(dy) > Math.abs(dx) * 1.2) {
      closePreviewOverlay(overlay);
      return;
    }
    if (pointerGestureMode === 'horizontal' && Math.abs(dx) > 72 && Math.abs(dx) > Math.abs(dy) * 1.35) previewSibling(item, dx < 0 ? 1 : -1);
    pointerGestureMode = '';
  });
  overlay.addEventListener('pointercancel', function() {
    pointerTracking = false;
    pointerId = null;
    resetPreviewSwipeOffset(overlay);
    resetPreviewDismissOffset(overlay);
  });
}

function addPreviewInfoHud(overlay, item) {
  if (!overlay || !item) return;
  var meta = [];
  function pill(html, attrs) {
    return '<span' + (attrs || '') + '>' + html + '</span>';
  }
  if (item.ext) meta.push(pill(escapeHtml(String(item.ext).toUpperCase())));
  if (item.duration) meta.push(pill(escapeHtml(formatMediaDuration(item.duration))));
  if (item.width && item.height) meta.push(pill(escapeHtml(item.width + ' × ' + item.height)));
  if (item.size) meta.push(pill(escapeHtml(formatSize(item.size))));
  var folderLabel = '未归档';
  var folderId = '';
  if (item.folderPaths && item.folderPaths.length) {
    var firstPath = item.folderPaths[0] || '';
    var parts = firstPath.split(' / ').filter(Boolean);
    folderLabel = parts.length ? parts[parts.length - 1] : firstPath;
    folderId = (item.folders || [])[0] || '';
  }
  if (folderLabel && folderId) {
    meta.push('<button type="button" data-preview-folder="' + escapeHtml(folderId) + '" data-item-focus-id="' + escapeHtml(item.id || '') + '" title="打开文件夹：' + escapeHtml(folderLabel) + '">' + iconFolder() + '<span>' + escapeHtml(folderLabel) + '</span></button>');
  } else if (folderLabel) {
    meta.push(pill(iconFolder() + '<span>' + escapeHtml(folderLabel) + '</span>'));
  }
  (item.tags || []).slice(0, 2).forEach(function(tag) {
    meta.push('<button type="button" data-preview-tag="' + escapeHtml(tag) + '" title="打开标签：' + escapeHtml(tag) + '">#' + escapeHtml(tag) + '</button>');
  });
  if ((item.tags || []).length > 2) meta.push(pill('+' + ((item.tags || []).length - 2) + ' 标签'));

  var hud = document.createElement('div');
  hud.className = 'preview-info-hud';
  hud.innerHTML = '<strong title="' + escapeHtml(item.name || '未命名素材') + '">' + escapeHtml(item.name || '未命名素材') + '</strong>' +
    '<div class="preview-info-meta">' + meta.join('') + '</div>';
  overlay.appendChild(hud);
}

function refreshPreviewInfoHud(overlay, item) {
  if (!overlay || !item) return;
  var oldHud = overlay.querySelector('.preview-info-hud');
  if (oldHud) oldHud.remove();
  addPreviewInfoHud(overlay, item);
}

function getPreviewRemoteSnapshotMeta() {
  try {
    var meta = JSON.parse(localStorage.getItem('eagle-viewer-offline-snapshot-meta') || 'null');
    return meta && meta.savedAt ? meta : null;
  } catch (e) {
    return null;
  }
}

function getPreviewRemoteNoticeCopy() {
  var strip = document.getElementById('remoteStatusStrip');
  var stripOffline = strip && !strip.hidden && strip.dataset.state === 'offline';
  var offline = navigator.onLine === false || stripOffline;
  if (!offline) return null;
  var snapshot = getPreviewRemoteSnapshotMeta();
  return {
    title: snapshot ? '正在浏览快照 / 缓存预览' : '远程 Vault 暂不可达',
    meta: snapshot ? ('快照 ' + new Date(snapshot.savedAt).toLocaleString('zh-CN') + ' · ' + (snapshot.ok || 0) + ' 项；原文件下载需重连。') : '可继续浏览已缓存素材；原文件和未缓存预览需要回到远程连接。'
  };
}

function refreshPreviewRemoteNotice(overlay) {
  if (!overlay) return;
  var oldNotice = overlay.querySelector('.preview-remote-notice');
  var copy = getPreviewRemoteNoticeCopy();
  if (!copy) {
    if (oldNotice) oldNotice.remove();
    return;
  }
  var notice = oldNotice || document.createElement('div');
  notice.className = 'preview-remote-notice';
  notice.innerHTML =
    '<span class="preview-remote-dot"></span>' +
    '<div><strong>' + escapeHtml(copy.title) + '</strong><small>' + escapeHtml(copy.meta) + '</small></div>' +
    '<button type="button" data-preview-remote-action="reconnect">重连</button>' +
    '<button type="button" data-preview-remote-action="snapshot">保存</button>';
  notice.onclick = function(e) {
    var btn = e.target.closest('[data-preview-remote-action]');
    if (!btn) return;
    e.preventDefault();
    e.stopPropagation();
    if (btn.dataset.previewRemoteAction === 'reconnect' && EagleViewer.modules.interactions && EagleViewer.modules.interactions.checkRemoteStatus) {
      EagleViewer.modules.interactions.checkRemoteStatus({ reload: false, quietStrip: false, message: '正在检查远程 Vault…' });
    } else if (btn.dataset.previewRemoteAction === 'snapshot' && api && api.warmCurrentOfflineSnapshot) {
      api.warmCurrentOfflineSnapshot();
    }
  };
  if (!oldNotice) overlay.appendChild(notice);
}

function refreshPreviewMobileActions(bar, item) {
  if (!bar || !item) return;
  var offline = isRemoteAccessUnavailableForRender();
  var downloadBtn = bar.querySelector('[data-preview-more-action="download"]');
  if (downloadBtn) {
    downloadBtn.classList.toggle('requires-remote', offline);
    downloadBtn.disabled = offline;
    downloadBtn.title = offline ? '下载原文件需要连接远程 Vault' : '';
    downloadBtn.querySelector('span').textContent = offline ? '需联网' : '下载原文件';
  }
}

function findPreviewItemForOverlay(overlay) {
  var itemId = overlay && overlay.dataset ? overlay.dataset.previewItemId : '';
  if (!itemId) return null;
  if (state.inspectorItem && state.inspectorItem.id === itemId) return state.inspectorItem;
  for (var i = 0; i < (state.currentItems || []).length; i++) {
    if (state.currentItems[i] && state.currentItems[i].id === itemId) return state.currentItems[i];
  }
  return null;
}

function refreshOpenPreviewMobileActions() {
  document.querySelectorAll('.preview-overlay').forEach(function(overlay) {
    var bar = overlay.querySelector('.preview-mobile-actions');
    var item = findPreviewItemForOverlay(overlay);
    if (bar && item) refreshPreviewMobileActions(bar, item);
    refreshPreviewRemoteNotice(overlay);
  });
}

function closePreviewMobileMore(bar) {
  var more = bar && bar.querySelector('.preview-mobile-more');
  var moreBtn = bar && bar.querySelector('[data-preview-action="more"]');
  if (more) more.hidden = true;
  if (moreBtn) {
    moreBtn.classList.remove('active');
    moreBtn.setAttribute('aria-expanded', 'false');
  }
}

function addPreviewMobileActions(overlay, item) {
  if (!overlay || !item || !item.id) return;
  var bar = document.createElement('div');
  bar.className = 'preview-mobile-actions';
  bar.innerHTML =
    '<button type="button" data-preview-action="inspect">' + iconInfo() + '<span>详情</span></button>' +
    '<button type="button" data-preview-action="more" aria-expanded="false" aria-controls="previewMobileMoreMenu">' + iconMenu() + '<span>更多</span></button>' +
    '<div class="preview-mobile-more" id="previewMobileMoreMenu" role="menu" aria-label="预览更多操作" hidden>' +
      '<button type="button" data-preview-more-action="share">' + iconExternalLink() + '<span>分享页面链接</span></button>' +
      '<button type="button" data-preview-more-action="download">' + iconDownload() + '<span>下载原文件</span></button>' +
    '</div>';
  refreshPreviewMobileActions(bar, item);
  bar.onclick = function(e) {
    var moreActionBtn = e.target.closest('[data-preview-more-action]');
    if (moreActionBtn) {
      e.preventDefault();
      e.stopPropagation();
      if (typeof window._runItemAction === 'function') window._runItemAction(item, moreActionBtn.dataset.previewMoreAction, moreActionBtn);
      setTimeout(function() { closePreviewMobileMore(bar); }, 450);
      return;
    }
    var btn = e.target.closest('[data-preview-action]');
    if (!btn) return;
    e.preventDefault();
    e.stopPropagation();
    var action = btn.dataset.previewAction;
    if (action === 'more') {
      var more = bar.querySelector('.preview-mobile-more');
      var open = more && more.hidden;
      if (more) more.hidden = !open;
      btn.classList.toggle('active', !!open);
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
      return;
    }
    closePreviewMobileMore(bar);
    if (action === 'inspect') {
      if (overlay && overlay.dataset) overlay.dataset.suppressReturnFocus = '1';
      closePreviewOverlay(overlay);
      renderModule.openInspector(item);
      return;
    }
    if (typeof window._runItemAction === 'function') window._runItemAction(item, action, btn);
  };
  overlay.appendChild(bar);
  refreshPreviewRemoteNotice(overlay);
}
