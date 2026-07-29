'use strict';

// ===== Selection =====
function updateBatchBar() {
  var n = state.selectedIds.size;
  var bar = document.getElementById('batchBar');
  var countEl = document.getElementById('selectedCount');
  var metaEl = document.getElementById('selectedMeta');
  var breakdownEl = document.getElementById('selectedBreakdown');
  var scopeEl = document.getElementById('selectedScope');
  var hintEl = document.getElementById('selectedHint');
  var previewRail = document.getElementById('selectedPreviewRail');
  var compareBtn = document.getElementById('batchCompareBtn');
  var removeCollectionBtn = document.getElementById('batchRemoveCollectionBtn');
  var selectedItems = getSelectedItems();
  var selectedSize = selectedItems.reduce(function(sum, item) { return sum + (item.size || 0); }, 0);
  if (countEl) countEl.textContent = '已选 ' + n + ' 个';
  if (metaEl) metaEl.textContent = '总大小 ' + (selectedSize > 0 ? formatSize(selectedSize) : '0 B');
  if (breakdownEl) {
    var counts = {};
    selectedItems.forEach(function(item) {
      var kind = getItemKind(item.ext);
      counts[kind] = (counts[kind] || 0) + 1;
    });
    var parts = Object.keys(counts).sort().map(function(kind) {
      var label = kind === 'image' ? '图片' : kind === 'video' ? '视频' : kind === 'pdf' ? 'PDF' : kind === 'text' ? 'TXT' : kind === 'document' ? '文档' : '其他';
      return label + ' ' + counts[kind];
    });
    breakdownEl.textContent = '类型分布 ' + (parts.length ? parts.join(' · ') : '-');
  }
  if (scopeEl) {
    var selectedInView = selectedItems.length;
    var loadedTotal = state.currentItems.length;
    scopeEl.textContent = loadedTotal ? ('当前视图 ' + selectedInView + '/' + loadedTotal + ' 已载入') : '当前视图';
  }
  if (hintEl && !(bar && bar.dataset.batchFeedback === 'true')) {
    hintEl.textContent = window.innerWidth <= 768 ? '移动选择模式 · 点素材继续选择' : '⌘/Ctrl+A 全选 · Shift 范围 · Esc 取消';
  }
  if (previewRail) {
    var visibleItems = selectedItems.slice(0, 12);
    previewRail.innerHTML = visibleItems.map(function(item) {
      var thumbUrl = API + '/api/items/' + item.id + '/thumbnail';
      var label = (item.name || item.id || '素材') + (item.ext ? '.' + item.ext : '');
      var inner = (item.hasThumbnail || isImageExt(item.ext)) ?
        '<img src="' + escapeHtml(thumbUrl) + '" alt="" loading="lazy" decoding="async" />' :
        '<span>' + escapeHtml((item.ext || '?').slice(0, 4).toUpperCase()) + '</span>';
      return '<button type="button" class="batch-preview-thumb" data-selected-preview-id="' + escapeHtml(item.id) + '" title="' + escapeHtml(label) + '" aria-label="定位已选素材 ' + escapeHtml(label) + '">' + inner + '</button>';
    }).join('') + (selectedItems.length > visibleItems.length ? '<span class="batch-preview-more">+' + (selectedItems.length - visibleItems.length) + '</span>' : '');
  }
  if (compareBtn) {
    var comparableCount = selectedItems.filter(function(item) { return isImageExt(item.ext); }).length;
    compareBtn.disabled = comparableCount < 2;
    compareBtn.textContent = comparableCount > 4 ? '对比前 4 张' : ('对比图片' + (comparableCount ? ' ' + comparableCount : ''));
    compareBtn.title = comparableCount < 2 ? '至少选择 2 张图片' : '打开 2–4 张图片并排审阅';
  }
  if (n) bar.classList.add('visible'); else bar.classList.remove('visible');
  if (n > 1 && state.inspectorItem) renderModule.closeInspector();
}

function isBatchSelectionMode() {
  return state.selectedIds.size > 0;
}

function getCurrentItemIndex(id) {
  for (var i = 0; i < state.currentItems.length; i++) {
    if (state.currentItems[i].id === id) return i;
  }
  return -1;
}

function selectRangeTo(id) {
  var targetIdx = getCurrentItemIndex(id);
  var anchorIdx = getCurrentItemIndex(state.lastSelectedId);
  if (targetIdx < 0 || anchorIdx < 0) {
    toggleSelect(id);
    return;
  }
  var start = Math.min(anchorIdx, targetIdx);
  var end = Math.max(anchorIdx, targetIdx);
  for (var i = start; i <= end; i++) {
    if (state.currentItems[i] && state.currentItems[i].id) state.selectedIds.add(state.currentItems[i].id);
  }
  state.lastSelectedId = id;
  updateBatchBar();
  updateCheckboxesInView();
}

function toggleSelect(id, options) {
  options = options || {};
  if (options.range) {
    selectRangeTo(id);
    return;
  }
  if (state.selectedIds.has(id)) state.selectedIds.delete(id);
  else state.selectedIds.add(id);
  state.lastSelectedId = id;
  updateBatchBar();
  updateCheckboxesInView();
}

function invertSelection() {
  var next = new Set();
  state.currentItems.forEach(function(item) {
    if (!state.selectedIds.has(item.id)) next.add(item.id);
  });
  state.selectedIds = next;
  updateBatchBar();
  updateCheckboxesInView();
}

function updateCheckboxesInView() {
  document.querySelectorAll('.item-cb').forEach(function(cb) {
    var selected = state.selectedIds.has(cb.dataset.id);
    cb.checked = selected;
    var card = cb.closest('.card');
    if (card) {
      card.classList.toggle('selected', selected);
      card.setAttribute('aria-selected', selected ? 'true' : 'false');
    }
    var row = cb.closest('.item-row');
    if (row) {
      row.classList.toggle('selected', selected);
      row.setAttribute('aria-selected', selected ? 'true' : 'false');
    }
  });
  document.querySelectorAll('[data-list-mobile-action="select"]').forEach(function(btn) {
    var selected = state.selectedIds.has(btn.dataset.id);
    btn.textContent = selected ? '取消选择' : '选择';
    btn.classList.toggle('is-selected', selected);
    btn.setAttribute('aria-pressed', selected ? 'true' : 'false');
  });
}

function getSelectedItems() {
  return state.currentItems.filter(function(item) { return state.selectedIds.has(item.id); });
}

function getInspectorIndex() {
  if (!state.inspectorItem) return -1;
  for (var i = 0; i < state.currentItems.length; i++) {
    if (state.currentItems[i].id === state.inspectorItem.id) return i;
  }
  return -1;
}

function syncFocusedItem(itemId) {
  document.querySelectorAll('.keyboard-focus').forEach(function(el) { el.classList.remove('keyboard-focus'); });
  if (!itemId) return;
  var target = document.querySelector('.card[data-item-id="' + itemId + '"]') ||
    (function() {
      var cb = document.querySelector('.list-table .item-cb[data-id="' + itemId + '"]');
      return cb ? cb.closest('tr') : null;
    })();
  if (target) {
    target.classList.add('keyboard-focus');
    target.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }
}

function updateReturnToCurrentItemButton() {
  var btn = document.getElementById('returnToCurrentItemBtn');
  if (!btn) return;
  var itemId = state.lastFocusedItemId;
  var target = itemId ? (document.querySelector('.card[data-item-id="' + itemId + '"]') ||
    document.querySelector('.item-row[data-item-id="' + itemId + '"]')) : null;
  var hasView = state.currentItems && state.currentItems.length;
  var loadedInView = !!(itemId && (state.currentItems || []).some(function(item) { return item && item.id === itemId; }));
  var canContinueFinding = !!(itemId && state.currentView === 'folder' && state.currentFolderId && state.incrementalHasMore);
  btn.hidden = !(itemId && hasView && (loadedInView || canContinueFinding));
  btn.classList.toggle('is-offscreen', !!itemId && !target);
  var label = state.lastFocusedItemName || '\u5F53\u524D\u7D20\u6750';
  btn.title = target ? ('\u56DE\u5230\u7D20\u6750\uFF1A' + label) : ('\u7EE7\u7EED\u52A0\u8F7D\u5E76\u5B9A\u4F4D\uFF1A' + label);
  var strong = btn.querySelector('strong');
  if (strong) strong.textContent = target ? '回到当前项' : '定位当前项';
}

function rememberFocusedItem(item) {
  if (!item || !item.id) return;
  state.lastFocusedItemId = item.id;
  state.lastFocusedItemName = item.name || item.id;
  updateReturnToCurrentItemButton();
}

function returnFocusToItem(itemId) {
  if (!itemId) return false;
  syncFocusedItem(itemId);
  var target = document.querySelector('.card[data-item-id="' + itemId + '"]') ||
    document.querySelector('.item-row[data-item-id="' + itemId + '"]');
  if (!target) return false;
  target.classList.add('located-item');
  setTimeout(function() { target.classList.remove('located-item'); }, 1200);
  updateReturnToCurrentItemButton();
  return true;
}

function focusPendingItemWhenLoaded() {
  var itemId = state.pendingFocusItemId;
  if (!itemId) return false;
  var target = document.querySelector('.card[data-item-id="' + itemId + '"]') ||
    document.querySelector('.item-row[data-item-id="' + itemId + '"]');
  if (target) {
    syncFocusedItem(itemId);
    target.classList.add('located-item');
    setTimeout(function() { target.classList.remove('located-item'); }, 1600);
    state.pendingFocusItemId = '';
    state.pendingFocusLoads = 0;
    if (window.showToast) window.showToast('已定位到素材', 'success');
    updateReturnToCurrentItemButton();
    return true;
  }
  if (state.currentView === 'folder' && state.currentFolderId && state.incrementalHasMore && !state.incrementalLoading && state.pendingFocusLoads < 8) {
    state.pendingFocusLoads += 1;
    api.loadFolderItems(state.currentFolderId, false);
    return false;
  }
  if (!state.incrementalHasMore) {
    state.pendingFocusItemId = '';
    state.pendingFocusLoads = 0;
    if (window.showToast) window.showToast('已打开文件夹，但当前排序下未定位到素材', 'error');
    updateReturnToCurrentItemButton();
  }
  return false;
}

function updateInspectorNav() {
  var prevBtn = document.getElementById('inspectorPrev');
  var nextBtn = document.getElementById('inspectorNext');
  var idx = getInspectorIndex();
  var hasItems = state.currentItems.length > 0 && idx >= 0;
  if (prevBtn) prevBtn.disabled = !hasItems || idx <= 0;
  if (nextBtn) nextBtn.disabled = !hasItems || idx >= state.currentItems.length - 1;
}

function navigateInspector(direction) {
  if (!state.inspectorItem || isBatchSelectionMode()) return;
  var idx = getInspectorIndex();
  if (idx < 0) return;
  var nextIdx = idx + direction;
  if (nextIdx < 0 || nextIdx >= state.currentItems.length) return;
  renderModule.openInspector(state.currentItems[nextIdx]);
}

function setupInspectorSwipe() {
  var panel = document.getElementById('inspector');
  var inner = document.getElementById('inspectorInner');
  if (!panel || !inner || inner._swipeBound) return;
  inner._swipeBound = true;
  var sheetHandle = document.getElementById('inspectorSheetHandle');
  var header = panel.querySelector('.inspector-header');
  var startX = 0;
  var startY = 0;
  var lastX = 0;
  var lastY = 0;
  var tracking = false;
  var horizontal = false;
  var sheetStartY = 0;
  var sheetLastY = 0;
  var sheetTracking = false;
  var sheetDragging = false;
  var sheetTapAt = 0;

  function resetSwipe() {
    tracking = false;
    horizontal = false;
    inner.classList.remove('inspector-swiping');
    inner.style.transform = '';
  }

  function resetSheetDrag() {
    sheetTracking = false;
    sheetDragging = false;
    panel.classList.remove('sheet-dragging');
    panel.style.transform = '';
  }

  function toggleMobileSheet() {
    if (window.innerWidth > 768 || !panel.classList.contains('open')) return;
    panel.classList.toggle('mobile-expanded');
  }

  function shouldIgnore(target) {
    return !!(target && target.closest('button, a, input, textarea, select, summary, .inspector-more-menu, .preview-tools'));
  }

  function shouldStartSheetDrag(target) {
    if (window.innerWidth > 768 || !panel.classList.contains('open')) return false;
    return !!(target && target.closest('.inspector-sheet-handle, .inspector-header'));
  }

  function beginSheetDrag(y) {
    sheetStartY = y;
    sheetLastY = y;
    sheetTracking = true;
    sheetDragging = false;
  }

  function moveSheetDrag(y) {
    if (!sheetTracking) return;
    sheetLastY = y;
    var dy = sheetLastY - sheetStartY;
    if (!sheetDragging && Math.abs(dy) > 10) sheetDragging = true;
    if (!sheetDragging) return;
    panel.classList.add('sheet-dragging');
    if (dy > 0) {
      panel.style.transform = 'translate3d(0,' + Math.min(180, dy) + 'px,0)';
    } else {
      panel.style.transform = 'translate3d(0,' + Math.max(-24, dy * 0.2) + 'px,0)';
    }
  }

  function endSheetDrag() {
    if (!sheetTracking) return;
    var dy = sheetLastY - sheetStartY;
    var wasDragging = sheetDragging;
    resetSheetDrag();
    if (dy > 92) {
      renderModule.closeInspector();
    } else if (dy < -54) {
      panel.classList.add('mobile-expanded');
    } else if (!wasDragging) {
      sheetTapAt = Date.now();
      toggleMobileSheet();
    }
  }

  if (sheetHandle) {
    sheetHandle.addEventListener('click', function(e) {
      if (window.innerWidth > 768) return;
      e.preventDefault();
      if (Date.now() - sheetTapAt < 500) return;
      toggleMobileSheet();
    });
  }

  [sheetHandle, header].forEach(function(target) {
    if (!target) return;
    target.addEventListener('touchstart', function(e) {
      if (e.touches.length !== 1 || !shouldStartSheetDrag(e.target)) return;
      beginSheetDrag(e.touches[0].clientY);
    }, { passive: true });
    target.addEventListener('touchmove', function(e) {
      if (!sheetTracking || e.touches.length !== 1) return;
      moveSheetDrag(e.touches[0].clientY);
      if (sheetDragging) e.preventDefault();
    }, { passive: false });
    target.addEventListener('touchend', endSheetDrag, { passive: true });
    target.addEventListener('touchcancel', resetSheetDrag, { passive: true });
    target.addEventListener('pointerdown', function(e) {
      if (e.pointerType === 'touch' || e.button !== 0 || !shouldStartSheetDrag(e.target)) return;
      beginSheetDrag(e.clientY);
      try { target.setPointerCapture(e.pointerId); } catch (err) {}
    });
    target.addEventListener('pointermove', function(e) {
      if (!sheetTracking || e.pointerType === 'touch') return;
      moveSheetDrag(e.clientY);
    });
    target.addEventListener('pointerup', function(e) {
      if (!sheetTracking || e.pointerType === 'touch') return;
      endSheetDrag();
    });
    target.addEventListener('pointercancel', resetSheetDrag);
  });

  inner.addEventListener('touchstart', function(e) {
    if (window.innerWidth > 768 || !panel.classList.contains('open') || e.touches.length !== 1 || shouldIgnore(e.target)) return;
    if (!state.inspectorItem || state.currentItems.length < 2) return;
    startX = e.touches[0].clientX;
    startY = e.touches[0].clientY;
    lastX = startX;
    lastY = startY;
    tracking = true;
    horizontal = false;
  }, { passive: true });

  inner.addEventListener('touchmove', function(e) {
    if (!tracking || e.touches.length !== 1) return;
    lastX = e.touches[0].clientX;
    lastY = e.touches[0].clientY;
    var dx = lastX - startX;
    var dy = lastY - startY;
    var absX = Math.abs(dx);
    var absY = Math.abs(dy);
    if (!horizontal && absX > 18 && absX > absY * 1.25) horizontal = true;
    if (!horizontal) return;
    inner.classList.add('inspector-swiping');
    inner.style.transform = 'translate3d(' + Math.max(-18, Math.min(18, dx * 0.14)) + 'px,0,0)';
  }, { passive: true });

  inner.addEventListener('touchend', function() {
    if (!tracking) return;
    var dx = lastX - startX;
    var dy = lastY - startY;
    var absX = Math.abs(dx);
    var absY = Math.abs(dy);
    resetSwipe();
    if (absX > 72 && absX > absY * 1.35) navigateInspector(dx < 0 ? 1 : -1);
  }, { passive: true });

  inner.addEventListener('touchcancel', resetSwipe, { passive: true });

  inner.addEventListener('pointerdown', function(e) {
    if (window.innerWidth > 768 || e.pointerType === 'touch' || e.button !== 0 || !panel.classList.contains('open') || shouldIgnore(e.target)) return;
    if (!state.inspectorItem || state.currentItems.length < 2) return;
    startX = e.clientX;
    startY = e.clientY;
    lastX = startX;
    lastY = startY;
    tracking = true;
    horizontal = false;
    try { inner.setPointerCapture(e.pointerId); } catch (err) {}
  });

  inner.addEventListener('pointermove', function(e) {
    if (!tracking || e.pointerType === 'touch') return;
    lastX = e.clientX;
    lastY = e.clientY;
    var dx = lastX - startX;
    var dy = lastY - startY;
    var absX = Math.abs(dx);
    var absY = Math.abs(dy);
    if (!horizontal && absX > 18 && absX > absY * 1.25) horizontal = true;
    if (!horizontal) return;
    inner.classList.add('inspector-swiping');
    inner.style.transform = 'translate3d(' + Math.max(-18, Math.min(18, dx * 0.14)) + 'px,0,0)';
  });

  inner.addEventListener('pointerup', function(e) {
    if (!tracking || e.pointerType === 'touch') return;
    var dx = lastX - startX;
    var dy = lastY - startY;
    var absX = Math.abs(dx);
    var absY = Math.abs(dy);
    resetSwipe();
    if (absX > 72 && absX > absY * 1.35) navigateInspector(dx < 0 ? 1 : -1);
  });

  inner.addEventListener('pointercancel', resetSwipe);
}

function formatMediaDuration(seconds) {
  var total = Math.max(0, Math.round(Number(seconds) || 0));
  var hours = Math.floor(total / 3600);
  var minutes = Math.floor((total % 3600) / 60);
  var secs = total % 60;
  return (hours ? hours + ':' + String(minutes).padStart(2, '0') : String(minutes)) + ':' + String(secs).padStart(2, '0');
}

function renderInspectorFolderLinks(item) {
  var paths = item.folderPaths || [];
  var folderIds = item.folders || [];
  return paths.map(function(path, idx) {
    var folderId = folderIds[idx] || '';
    var label = path || folderId || '未命名文件夹';
    if (!folderId) return '<span class="inspector-path-chip muted">' + escapeHtml(label) + '</span>';
    return '<button type="button" class="inspector-path-chip" data-inspector-folder="' + escapeHtml(folderId) + '" data-item-focus-id="' + escapeHtml(item.id || '') + '" title="打开文件夹：' + escapeHtml(label) + '">' +
      iconFolder() + '<span>' + escapeHtml(label) + '</span>' +
    '</button>';
  }).join('');
}

function getItemFolderLinks(item, limit) {
  var folderIds = item.folders || [];
  var paths = item.folderPaths || [];
  var max = limit || folderIds.length || paths.length;
  var count = Math.max(folderIds.length, paths.length);
  var links = [];
  for (var i = 0; i < count && links.length < max; i++) {
    var folderId = folderIds[i] || '';
    var path = paths[i] || folderId || '';
    if (!path && !folderId) continue;
    var parts = String(path).split(' / ').filter(Boolean);
    var label = parts.length ? parts[parts.length - 1] : (path || '未命名文件夹');
    links.push({
      id: folderId,
      path: path,
      label: label
    });
  }
  return links;
}

function renderInspectorTagLinks(tags) {
  return (tags || []).map(function(tag) {
    return '<button type="button" class="tag-chip inspector-tag-chip" data-inspector-tag="' + escapeHtml(tag) + '" title="打开标签：' + escapeHtml(tag) + '">' + escapeHtml(tag) + '</button>';
  }).join('');
}

function renderInspectorField(label, value, extraClass) {
  return '<div class="inspector-field' + (extraClass ? ' ' + extraClass : '') + '">' +
    '<div class="inspector-field-label">' + escapeHtml(label) + '</div>' +
    '<div class="inspector-field-value">' + value + '</div>' +
  '</div>';
}

function renderInspectorSection(title, body, extraClass) {
  if (!body) return '';
  return '<section class="inspector-section' + (extraClass ? ' ' + extraClass : '') + '">' +
    '<div class="inspector-section-title">' + escapeHtml(title) + '</div>' +
    body +
  '</section>';
}

function renderInspectorSpec(label, value, extraClass) {
  return '<div class="inspector-spec' + (extraClass ? ' ' + extraClass : '') + '">' +
    '<span>' + escapeHtml(label) + '</span>' +
    '<strong>' + value + '</strong>' +
  '</div>';
}

function getViewMediaKind(item) {
  var ext = (item.ext || '').toLowerCase();
  if (PREVIEW_IMAGE_EXTS.indexOf(ext) >= 0) return 'image';
  if (PREVIEW_VIDEO_EXTS.indexOf(ext) >= 0) return 'video';
  if (PREVIEW_DOCUMENT_EXTS.indexOf(ext) >= 0) return 'document';
  if (['mp3','wav','flac','aac','m4a','ogg'].indexOf(ext) >= 0) return 'audio';
  if (getItemKind(ext) === 'document') return 'document';
  return 'other';
}

function getInspectorTypeLabel(item) {
  var ext = (item.ext || '').toLowerCase();
  var kind = getViewMediaKind(item);
  if (kind === 'image') return '图片素材';
  if (kind === 'video') return '视频素材';
  if (kind === 'audio') return '音频素材';
  if (ext === 'pdf') return 'PDF 文档';
  if (ext === 'txt') return '文本素材';
  if (kind === 'document') return '文档素材';
  return '通用文件';
}

function renderInspectorStatusPills(item) {
  var pills = [];
  if (item.tags && item.tags.length) pills.push('<span class="inspector-status-pill"># ' + escapeHtml(item.tags.length + ' 标签') + '</span>');
  if (item.url) pills.push('<span class="inspector-status-pill sourced">' + iconExternalLink() + ' 有来源</span>');
  return pills.join('');
}

function getInspectorMetaLine(item) {
  var meta = [];
  if (item.ext) meta.push(String(item.ext).toUpperCase());
  if (item.width && item.height) meta.push(item.width + ' × ' + item.height);
  else if (item.size) meta.push(formatSize(item.size));
  if (item.duration) meta.push(formatMediaDuration(item.duration));
  if (item.tags && item.tags.length) meta.push(item.tags.length + ' 标签');
  if (item.url) meta.push(getItemSourceDomain(item) || '有来源');
  return meta.join(' · ') || getInspectorTypeLabel(item);
}

function renderInspectorMobileSummary(item) {
  var summary = document.getElementById('inspectorMobileSummary');
  if (!summary) return;
  summary.innerHTML = '<div class="inspector-mobile-summary-main">' +
      '<strong>' + escapeHtml(item.name || '未命名素材') + '</strong>' +
      '<span>' + escapeHtml(getInspectorMetaLine(item)) + '</span>' +
    '</div>' +
    '<div class="inspector-mobile-summary-hint">上拉展开 · 下滑关闭</div>';
}

function bindInspectorPreviewAction(item, fileUrl) {
  var preview = document.getElementById('inspectorPreview');
  if (!preview) return;
  preview.onclick = null;
  preview.onkeydown = null;
  if (!isItemPreviewable(item)) return;
  preview.onclick = function(e) {
    if (e.target && e.target.closest && e.target.closest('button, a')) return;
    renderModule.previewItem(item, fileUrl);
  };
  preview.onkeydown = function(e) {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    e.preventDefault();
    renderModule.previewItem(item, fileUrl);
  };
}

function getInspectorShape(item) {
  if (!item.width || !item.height) return '';
  var ratio = item.width / item.height;
  if (Math.abs(ratio - 1) < 0.08) return 'square';
  return ratio > 1 ? 'landscape' : 'portrait';
}

function getInspectorShapeLabel(shape) {
  if (shape === 'landscape') return '横图';
  if (shape === 'portrait') return '竖图';
  if (shape === 'square') return '方图';
  return '';
}

function getInspectorRelatedType(item) {
  var kind = getViewMediaKind(item);
  return ['image', 'video', 'document', 'audio', 'other'].indexOf(kind) >= 0 ? kind : 'all';
}

function renderInspectorRelatedLinks(item) {
  var links = [];
  var ext = (item.ext || '').toLowerCase();
  var type = getInspectorRelatedType(item);
  var typeLabel = getInspectorTypeLabel(item).replace('素材', '').replace('文档', '文档');
  if (ext) {
    links.push('<button type="button" class="inspector-related-chip" data-inspector-related="ext" data-query="' + escapeHtml(ext) + '"><span>同格式</span><strong>.' + escapeHtml(ext) + '</strong></button>');
  }
  if (type && type !== 'all') {
    links.push('<button type="button" class="inspector-related-chip" data-inspector-related="type" data-type="' + escapeHtml(type) + '"><span>同类型</span><strong>' + escapeHtml(typeLabel) + '</strong></button>');
  }
  var shape = getInspectorShape(item);
  var shapeLabel = getInspectorShapeLabel(shape);
  if (shape) {
    links.push('<button type="button" class="inspector-related-chip" data-inspector-related="shape" data-type="' + escapeHtml(type) + '" data-shape="' + escapeHtml(shape) + '"><span>同构图</span><strong>' + escapeHtml(shapeLabel) + '</strong></button>');
  }
  if (item.width && item.height) {
    links.push('<button type="button" class="inspector-related-chip wide" data-inspector-related="min-dimensions" data-type="' + escapeHtml(type) + '" data-min-width="' + escapeHtml(String(item.width)) + '" data-min-height="' + escapeHtml(String(item.height)) + '"><span>不小于此尺寸</span><strong>' + escapeHtml(item.width + ' × ' + item.height) + '</strong></button>');
  }
  return links.length ? '<div class="inspector-related-grid">' + links.join('') + '</div>' : '';
}

function isRemoteAccessUnavailableForRender() {
  var strip = document.getElementById('remoteStatusStrip');
  return navigator.onLine === false || !!(strip && !strip.hidden && strip.dataset.state === 'offline');
}
