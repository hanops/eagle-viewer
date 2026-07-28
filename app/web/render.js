'use strict';

var state = EagleViewer.state;
var api = EagleViewer.modules.api;
var renderModule = EagleViewer.modules.render = EagleViewer.modules.render || {};

// ===== Sidebar rendering =====
function renderFolder(f, depth) {
  var div = document.createElement('div');
  div.className = 'folder-node' + (state.folderExpanded[f.id] ? ' expanded' : '');
  div.dataset.folderId = f.id;
  div.setAttribute('role', 'treeitem');
  div.setAttribute('aria-expanded', state.folderExpanded[f.id] ? 'true' : 'false');
  var row = document.createElement('div');
  row.className = 'sidebar-item folder-row' + (f.locked ? ' locked' : '');
  row.style.paddingLeft = '12px';
  var hasChildren = f.children && f.children.length > 0;

  var icon = document.createElement('span');
  icon.className = 'sidebar-item-icon';
  icon.innerHTML = f.locked ? iconLock() : iconFolder();

  var name = document.createElement('span');
  name.className = 'sidebar-item-name';
  name.textContent = f.name || '(未命名)';

  var count = document.createElement('span');
  count.className = 'sidebar-item-count';
  count.textContent = f.locked ? '受保护' : ((f.count != null ? f.count : 0) + '');

  row.appendChild(icon);
  row.appendChild(name);
  row.appendChild(count);

  function openFolder() {
    if (f.locked) { showLockedFolderNotice(f); return; }
    var searchInput = document.getElementById('searchInput');
    if (searchInput) searchInput.value = '';
    clearAllActive();
    row.classList.add('active');
    state.currentTagName = null;
    api.loadFolderItems(f.id);
  }
  function toggleExpand() {
    if (!hasChildren) return;
    state.folderExpanded[f.id] = !state.folderExpanded[f.id];
    if (childrenEl) childrenEl.classList.toggle('collapsed', !state.folderExpanded[f.id]);
    div.classList.toggle('expanded', state.folderExpanded[f.id]);
    div.setAttribute('aria-expanded', state.folderExpanded[f.id] ? 'true' : 'false');
  }

  row.tabIndex = 0;
  row.onclick = function(e) {
    e.stopPropagation();
    if (hasChildren) toggleExpand();
    openFolder();
  };
  row.ondblclick = function(e) {
    e.stopPropagation();
    openFolder();
  };
  row.onkeydown = function(e) {
    if (e.key === 'Enter') { e.preventDefault(); openFolder(); }
    else if (e.key === ' ') { e.preventDefault(); if (hasChildren) toggleExpand(); }
  };
  if (f.locked) {
    row.setAttribute('aria-label', (f.name || '文件夹') + ' · Eagle 密码保护');
    row.title = '此文件夹受 Eagle 密码保护，远程 Viewer 不读取其中内容';
  }

  div.appendChild(row);

  var childrenEl;
  if (hasChildren) {
    childrenEl = document.createElement('div');
    childrenEl.className = 'folder-children' + (state.folderExpanded[f.id] ? '' : ' collapsed');
    f.children.forEach(function(c) { childrenEl.appendChild(renderFolder(c, depth + 1)); });
    div.appendChild(childrenEl);
  }

  return div;
}

function renderSidebar() {
  var folderTree = document.getElementById('folderTree');
  folderTree.innerHTML = '';
  state.treeData.forEach(function(f) { folderTree.appendChild(renderFolder(f, 0)); });
}

function expandFolderPathTo(folderId, nodes) {
  for (var i = 0; i < nodes.length; i++) {
    var node = nodes[i];
    if (String(node.id) === String(folderId)) return true;
    if (node.children && node.children.length && expandFolderPathTo(folderId, node.children)) {
      state.folderExpanded[node.id] = true;
      return true;
    }
  }
  return false;
}

function getFolderPathMatches(query, nodes, trail, out) {
  for (var i = 0; i < nodes.length; i++) {
    var node = nodes[i];
    var nextTrail = trail.concat([node.name || '(未命名)']);
    var fullPath = nextTrail.join(' / ');
    if (fullPath.toLowerCase().indexOf(query) >= 0 || String(node.name || '').toLowerCase().indexOf(query) >= 0) {
      out.push({ id: node.id, path: fullPath, locked: !!node.locked, name: node.name || '(未命名)' });
    }
    if (node.children && node.children.length) getFolderPathMatches(query, node.children, nextTrail, out);
  }
}

function renderTagList() {
  var list = document.getElementById('tagList');
  var section = document.getElementById('tagSection');
  var query = ((document.getElementById('tagSearchInput') || {}).value || '').trim().toLowerCase();
  list.innerHTML = '';
  if (!state.tagData.length) { section.style.display = 'none'; return; }
  section.style.display = 'block';
  state.tagData.forEach(function(t) {
    if (query && String(t.name || '').toLowerCase().indexOf(query) < 0) return;
    var chip = document.createElement('span');
    chip.className = 'tag-chip';
    chip.textContent = t.name + ' (' + t.count + ')';
    chip.title = t.name;
    chip.onclick = function() {
      clearAllActive();
      chip.classList.add('active');
      state.currentTagName = t.name;
      api.loadTagItems(t.name);
    };
    list.appendChild(chip);
  });
  if (!list.children.length) {
    list.innerHTML = '<span class="content-title">无匹配标签</span>';
  }
}

function clearAllActive() {
  document.querySelectorAll('.sidebar-item.active').forEach(function(el) { el.classList.remove('active'); });
  document.querySelectorAll('.tag-chip.active').forEach(function(el) { el.classList.remove('active'); });
}

function setRecentActive(days) {
  clearAllActive();
  var r7 = document.getElementById('recent7');
  var r30 = document.getElementById('recent30');
  if (days === 7 && r7) r7.classList.add('active');
  if (days === 30 && r30) r30.classList.add('active');
}

function syncActiveNavigationState() {
  clearAllActive();
  if (state.currentView === 'all') {
    var allRow = document.getElementById('allItems');
    if (allRow) allRow.classList.add('active');
    return;
  }
  if (state.currentView === 'recent') {
    setRecentActive(state.recentDays);
    return;
  }
  if (state.currentView === 'folder' && state.currentFolderId) {
    expandFolderPathTo(state.currentFolderId, state.treeData);
    renderSidebar();
    var folderRow = document.querySelector('[data-folder-id="' + state.currentFolderId + '"] > .sidebar-item');
    if (folderRow) folderRow.classList.add('active');
    return;
  }
  if (state.currentView === 'tag' && state.currentTagName) {
    Array.prototype.forEach.call(document.querySelectorAll('.tag-chip'), function(chip) {
      if (chip.title === state.currentTagName) chip.classList.add('active');
    });
  }
}

function findFolderTrailById(folderId, nodes, trail) {
  for (var i = 0; i < (nodes || []).length; i++) {
    var node = nodes[i];
    var nextTrail = trail.concat([{ id: node.id, name: node.name || '(未命名)' }]);
    if (String(node.id) === String(folderId)) return nextTrail;
    var childTrail = findFolderTrailById(folderId, node.children || [], nextTrail);
    if (childTrail) return childTrail;
  }
  return null;
}

function getViewCrumbs() {
  var crumbs = [{ label: '资料库', action: 'all' }];
  if (state.currentView === 'folder' && state.currentFolderId) {
    var trail = findFolderTrailById(state.currentFolderId, state.treeData, []) || [];
    trail.forEach(function(folder) { crumbs.push({ label: folder.name, folderId: folder.id }); });
  } else if (state.currentView === 'tag' && state.currentTagName) {
    crumbs.push({ label: '标签', action: 'tag-root' });
    crumbs.push({ label: state.currentTagName, tag: state.currentTagName });
  } else if (state.currentView === 'recent') {
    crumbs.push({ label: '最近 ' + (state.recentDays || 7) + ' 天', recentDays: state.recentDays || 7 });
  } else if (state.currentView === 'search') {
    crumbs.push({ label: '搜索', action: 'search-root' });
    if (state.searchQuery) crumbs.push({ label: state.searchQuery, search: state.searchQuery });
  } else if (state.currentTitle && state.currentView !== 'all') {
    crumbs.push({ label: state.currentTitle, action: state.currentView });
  }
  return crumbs;
}

function renderContentCrumbs() {
  var nav = document.getElementById('contentCrumbs');
  if (!nav) return;
  var crumbs = getViewCrumbs();
  nav.innerHTML = crumbs.map(function(crumb, idx) {
    var attrs = '';
    if (crumb.folderId) attrs += ' data-crumb-folder="' + escapeHtml(crumb.folderId) + '"';
    if (crumb.tag) attrs += ' data-crumb-tag="' + escapeHtml(crumb.tag) + '"';
    if (crumb.recentDays) attrs += ' data-crumb-recent="' + escapeHtml(String(crumb.recentDays)) + '"';
    if (crumb.search) attrs += ' data-crumb-search="' + escapeHtml(crumb.search) + '"';
    if (crumb.action) attrs += ' data-crumb-action="' + escapeHtml(crumb.action) + '"';
    var current = idx === crumbs.length - 1 ? ' aria-current="page"' : '';
    var sep = idx ? '<span class="content-crumb-sep">' + iconChevronRightSm() + '</span>' : '';
    return sep + '<button type="button" class="content-crumb"' + attrs + current + '><span>' + escapeHtml(crumb.label) + '</span></button>';
  }).join('');
}

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

// ===== Inspector panel =====
function openInspector(item) {
  if (isBatchSelectionMode()) return;
  if (EagleViewer.modules.interactions && EagleViewer.modules.interactions.rememberViewedItem) {
    EagleViewer.modules.interactions.rememberViewedItem(item);
  }
  state.inspectorItem = item;
  state.pendingItemId = item && item.id ? item.id : '';
  rememberFocusedItem(item);
  var panel = document.getElementById('inspector');
  var inner = document.getElementById('inspectorInner');
  var actions = document.getElementById('inspectorActions');
  var thumbUrl = API + '/api/items/' + item.id + '/thumbnail';
  var fileUrl = API + '/api/items/' + item.id + '/file';
  var fileUrlDownload = fileUrl + '?download=true';
  var downloadName = (item.name || 'file') + (item.ext ? '.' + item.ext : '');

  var html = '';

  html += '<div class="inspector-preview" id="inspectorPreview"></div>';

  html += '<div class="inspector-identity">';
  html += '<div class="inspector-kind">' + escapeHtml(getInspectorTypeLabel(item)) + '</div>';
  html += '<h2>' + escapeHtml(item.name || '未命名素材') + '</h2>';
  html += '<div class="inspector-file-line">' + escapeHtml(downloadName) + '</div>';
  var statusPills = renderInspectorStatusPills(item);
  if (statusPills) html += '<div class="inspector-status-row">' + statusPills + '</div>';
  html += '</div>';

  html += '<div class="inspector-fields">';

  var specHtml = '';
  specHtml += renderInspectorSpec('格式', item.ext ? '<span class="inspector-badge">' + escapeHtml(item.ext.toUpperCase()) + '</span>' : '—', 'format');
  specHtml += renderInspectorSpec('大小', item.size ? escapeHtml(formatSize(item.size)) : '—');
  if (item.width && item.height) specHtml += renderInspectorSpec('尺寸', escapeHtml(item.width + ' × ' + item.height));
  if (item.duration) specHtml += renderInspectorSpec('时长', escapeHtml(formatMediaDuration(item.duration)));
  if (item.bpm) specHtml += renderInspectorSpec('BPM', escapeHtml(String(Math.round(item.bpm))));
  specHtml += renderInspectorSpec('创建', escapeHtml(formatDate(item.btime)));
  specHtml += renderInspectorSpec('修改', escapeHtml(formatDate(item.mtime)));
  html += renderInspectorSection('规格', '<div class="inspector-spec-grid">' + specHtml + '</div>');

  var paths = item.folderPaths || [];
  var locationHtml = '';
  locationHtml += renderInspectorField('文件夹', paths.length ? '<div class="inspector-path-list">' + renderInspectorFolderLinks(item) + '</div>' : '<span class="inspector-muted">未归档</span>');
  locationHtml += renderInspectorField('标签', (item.tags && item.tags.length) ? '<div class="inspector-tags">' + renderInspectorTagLinks(item.tags) + '</div>' : '<span class="inspector-muted">未添加标签</span>');
  html += renderInspectorSection('位置', locationHtml);

  var contextHtml = '';
  var sourceHtml = '<span class="inspector-muted">未记录来源</span>';
  if (item.url) {
    sourceHtml = '<a class="inspector-source-link" href="' + escapeHtml(item.url) + '" target="_blank" rel="noopener">' + escapeHtml(item.url.length > 80 ? item.url.substring(0, 80) + '…' : item.url) + ' ' + iconExternalLink() + '</a>';
  }
  contextHtml += renderInspectorField('来源', sourceHtml);
  contextHtml += renderInspectorField('Eagle 备注', item.annotation ? '<div class="inspector-note">' + escapeHtml(item.annotation) + '</div>' : '<span class="inspector-muted">暂无 Eagle 备注</span>');
  html += renderInspectorSection('上下文', contextHtml);

  html += '</div>';
  inner.innerHTML = html;
  renderInspectorMobileSummary(item);
  renderInspectorPreview(document.getElementById('inspectorPreview'), item, thumbUrl, fileUrl);
  bindInspectorPreviewAction(item, fileUrl);

  var actionsHtml = '';
  if (isItemPreviewable(item)) {
    actionsHtml += '<button type="button" class="primary inspector-action-main" onclick="window._previewInspectorItem()">' + iconEye() + ' 预览</button>';
  }
  actionsHtml += '<details class="inspector-more inspector-action-more"><summary aria-label="更多操作">更多</summary><div class="inspector-more-menu">';
  var downloadDisabled = isRemoteAccessUnavailableForRender();
  actionsHtml += '<button type="button" class="btn-download-original' + (downloadDisabled ? ' requires-remote' : '') + '" data-id="' + escapeHtml(item.id) + '"' + (downloadDisabled ? ' disabled title="下载原文件需要连接远程 Vault"' : '') + '>' + iconDownload() + ' ' + (downloadDisabled ? '需联网' : '下载') + '</button>';
  actionsHtml += '<button type="button" class="btn-share-link" data-id="' + escapeHtml(item.id) + '">' + iconExternalLink() + ' 分享链接</button>';
  if (canCopyImage(item.ext)) actionsHtml += '<button type="button" class="btn-copy" data-id="' + escapeHtml(item.id) + '">' + iconCopy() + ' 复制</button>';
  actionsHtml += '</div></details>';
  actions.innerHTML = actionsHtml;

  panel.classList.add('open');
  panel.classList.remove('mobile-expanded');
  document.body.classList.add('inspector-open');
  setupInspectorSwipe();
  requestAnimationFrame(refreshMasonryLayout);
  updateInspectorNav();
  syncFocusedItem(item.id);
  updateReturnToCurrentItemButton();
  updateUrlFromState();
}

window._previewInspectorItem = function() {
  if (state.inspectorItem) {
    var fileUrl = API + '/api/items/' + state.inspectorItem.id + '/file';
    renderModule.previewItem(state.inspectorItem, fileUrl);
  }
};

function closeInspector() {
  var focusItemId = state.inspectorItem && state.inspectorItem.id;
  var panel = document.getElementById('inspector');
  panel.classList.remove('open', 'mobile-expanded', 'sheet-dragging');
  panel.style.transform = '';
  document.body.classList.remove('inspector-open');
  var summary = document.getElementById('inspectorMobileSummary');
  if (summary) summary.innerHTML = '';
  state.inspectorItem = null;
  state.pendingItemId = '';
  requestAnimationFrame(refreshMasonryLayout);
  updateInspectorNav();
  updateUrlFromState();
  requestAnimationFrame(function() { returnFocusToItem(focusItemId); });
}

// ===== Card rendering (masonry) =====
function renderCardQuickActions(item) {
  return '<div class="card-quick-actions" aria-label="卡片快捷操作">' +
    '<button type="button" class="card-quick-action" data-card-action="preview" data-id="' + escapeHtml(item.id) + '" title="' + (isItemPreviewable(item) ? '预览' : '打开') + '" aria-label="' + (isItemPreviewable(item) ? '预览' : '打开') + '">' + iconEye() + '</button>' +
    '<button type="button" class="card-quick-action" data-card-action="inspect" data-id="' + escapeHtml(item.id) + '" title="详情" aria-label="详情">' + iconInfo() + '</button>' +
  '</div>';
}

function renderItemCard(item, container) {
  var card = document.createElement('div');
  card.className = 'card' + (state.selectedIds.has(item.id) ? ' selected' : '');
  card.dataset.itemId = item.id;
  card.dataset.mediaKind = getViewMediaKind(item);
  var rawAspect = item.width && item.height ? Number(item.width) / Number(item.height) : (getViewMediaKind(item) === 'document' ? 0.78 : 1);
  card.dataset.aspectRatio = String(Math.max(0.52, Math.min(2.6, rawAspect || 1)));

  var cb = document.createElement('input');
  cb.type = 'checkbox';
  cb.className = 'card-checkbox item-cb';
  cb.dataset.id = item.id;
  cb.setAttribute('aria-label', '选择 ' + (item.name || '素材'));
  cb.checked = state.selectedIds.has(item.id);
  cb.onclick = function(e) { e.stopPropagation(); toggleSelect(item.id); };
  card.appendChild(cb);

  var thumb = document.createElement('div');
  thumb.className = 'card-thumb';

  if (item.width && item.height) {
    thumb.style.aspectRatio = item.width + '/' + item.height;
  } else {
    thumb.style.aspectRatio = '4/3';
  }

  var thumbUrl = API + '/api/items/' + item.id + '/thumbnail';
  var fileUrl = API + '/api/items/' + item.id + '/file';

  if (item.hasThumbnail || isImageExt(item.ext)) {
    var img = document.createElement('img');
    img.loading = 'lazy';
    img.decoding = 'async';
    img.fetchPriority = 'low';
    img.alt = item.name;
    setImageFallback(img, isImageExt(item.ext) ? fileUrl : '', function() {
      thumb.innerHTML = renderFilePlaceholder(item, true);
      thumb.style.aspectRatio = '4/3';
    });
    img.src = thumbUrl;
    thumb.appendChild(img);
  } else {
    thumb.innerHTML = renderFilePlaceholder(item, true);
    thumb.style.aspectRatio = '4/3';
    loadTextSnippet(item, thumb);
  }

  if (isVideoExt(item.ext)) {
    var badge = document.createElement('div');
    badge.className = 'card-video-badge';
    badge.innerHTML = iconPlay();
    thumb.appendChild(badge);
  }

  var overlay = document.createElement('div');
  overlay.className = 'card-overlay';
  overlay.innerHTML = '<div class="card-overlay-name">' + escapeHtml(item.name) + (item.ext ? '.' + item.ext : '') + '</div>';
  thumb.appendChild(overlay);

  var quickActions = document.createElement('div');
  quickActions.innerHTML = renderCardQuickActions(item);
  thumb.appendChild(quickActions.firstChild);

  card.appendChild(thumb);

  if (item.hasThumbnail || isImageExt(item.ext)) {
    var details = document.createElement('div');
    details.className = 'card-details';
    var meta = [];
    var sourceDomain = getItemSourceDomain(item);
    var folderLink = getItemFolderLinks(item, 1)[0];
    if (item.duration) meta.push(formatMediaDuration(item.duration));
    if (item.width && item.height) meta.push(item.width + ' × ' + item.height);
    else if (item.size) meta.push(formatSize(item.size));
    details.innerHTML = '<div class="card-details-name">' + escapeHtml(item.name || '未命名') + '</div>' +
      '<div class="card-details-meta">' + escapeHtml(meta.join(' · ') || '素材') + '</div>' +
      '<div class="card-details-pills">' +
        (folderLink && folderLink.id ? '<button type="button" class="card-details-folder" data-item-folder="' + escapeHtml(folderLink.id) + '" data-item-focus-id="' + escapeHtml(item.id) + '" title="打开文件夹：' + escapeHtml(folderLink.path || folderLink.label) + '">' + iconFolder() + escapeHtml(folderLink.label) + '</button>' : '') +
        (item.ext ? '<button type="button" class="card-details-ext" data-item-ext="' + escapeHtml(item.ext) + '" title="筛选格式：.' + escapeHtml(item.ext) + '">.' + escapeHtml(String(item.ext).toUpperCase()) + '</button>' : '') +
        ((item.tags && item.tags.length) ? '<button type="button" class="card-details-tag" data-item-tag="' + escapeHtml(item.tags[0]) + '" title="打开标签：' + escapeHtml(item.tags[0]) + '"># ' + escapeHtml(item.tags[0]) + '</button>' : '') +
        (sourceDomain ? '<span class="card-details-source">' + iconExternalLink() + escapeHtml(sourceDomain) + '</span>' : '') +
      '</div>';
    card.appendChild(details);
  }

  card.onclick = function(e) {
    if (e.target.closest('.card-checkbox, [data-item-folder], [data-item-ext], [data-item-tag], [data-source-domain], .card-quick-action')) return;
    if (isBatchSelectionMode()) {
      toggleSelect(item.id);
      return;
    }
    renderModule.openInspector(item);
  };

  card.addEventListener('dblclick', function(e) {
    if (e.target.closest('.card-checkbox, [data-item-folder], [data-item-ext], [data-item-tag], [data-source-domain], .card-quick-action')) return;
    if (isBatchSelectionMode()) return;
    if (isItemPreviewable(item)) renderModule.previewItem(item, fileUrl);
    else window.open(fileUrl, '_blank');
  });

  // Hover preview setup
  if ((item.hasThumbnail && isImageExt(item.ext)) || (item.ext || '').toLowerCase() === 'pdf') {
    card.addEventListener('mouseenter', function(ev) {
      state.hoverTimer = setTimeout(function() {
        showHoverPreview(
          (item.ext || '').toLowerCase() === 'pdf' ? (API + '/api/items/' + item.id + '/file') : thumbUrl,
          ev,
          (item.ext || '').toLowerCase() === 'pdf' ? 'pdf' : 'image'
        );
      }, 300);
    });
    card.addEventListener('mousemove', function(ev) {
      if (state.hoverPreviewEl) positionHoverPreview(ev);
    });
    card.addEventListener('mouseleave', function() {
      clearTimeout(state.hoverTimer);
      renderModule.hideHoverPreview();
    });
  }

  container.appendChild(card);
}

function renderFolderCard(sub, container) {
  var card = document.createElement('div');
  card.className = 'folder-card' + (sub.locked ? ' locked' : '');
  card.dataset.aspectRatio = '1.4';
  card.innerHTML = '<span class="folder-card-icon">' + (sub.locked ? iconLock() : iconFolderLarge()) + '</span><span class="folder-card-copy"><span class="folder-card-name">' + escapeHtml(sub.name) + '</span>' + (sub.locked ? '<small>Eagle 密码保护</small>' : '') + '</span>';
  card.onclick = function() {
    if (sub.locked) {
      showLockedFolderNotice(sub);
      return;
    }
    clearAllActive();
    var folderEl = document.querySelector('[data-folder-id="' + sub.id + '"] > .sidebar-item');
    if (folderEl) folderEl.classList.add('active');
    state.currentFolderId = sub.id;
    api.loadFolderItems(sub.id);
  };
  container.appendChild(card);
}

// ===== List view =====
function renderListRow(item, tbody) {
  var fileUrl = API + '/api/items/' + item.id + '/file';
  var thumbUrl = API + '/api/items/' + item.id + '/thumbnail';
  var tr = document.createElement('tr');
  tr.className = 'item-row' + (state.selectedIds.has(item.id) ? ' selected' : '');
  tr.dataset.itemId = item.id;

  var checkCell = document.createElement('td');
  checkCell.className = 'col-check';
  var cb = document.createElement('input');
  cb.type = 'checkbox';
  cb.className = 'item-cb';
  cb.dataset.id = item.id;
  cb.setAttribute('aria-label', '选择 ' + (item.name || '素材'));
  cb.checked = state.selectedIds.has(item.id);
  cb.onclick = function(e) { e.stopPropagation(); toggleSelect(item.id); };
  checkCell.appendChild(cb);
  tr.appendChild(checkCell);

  var thumbCell = document.createElement('td');
  thumbCell.className = 'col-thumb';
  if (item.hasThumbnail || isImageExt(item.ext)) {
    var thumbImg = document.createElement('img');
    thumbImg.loading = 'lazy';
    thumbImg.decoding = 'async';
    thumbImg.fetchPriority = 'low';
    thumbImg.alt = '';
    setImageFallback(thumbImg, isImageExt(item.ext) ? fileUrl : '', function() {
      thumbCell.innerHTML = '<span class="placeholder">' + iconFile() + '</span>';
    });
    thumbImg.src = thumbUrl;
    thumbCell.appendChild(thumbImg);
  } else {
    thumbCell.innerHTML = '<span class="placeholder">' + iconFile() + '</span>';
  }
  tr.appendChild(thumbCell);

  var nameCell = document.createElement('td');
  nameCell.className = 'col-name';
  var sourceDomain = getItemSourceDomain(item);
  var mobileMeta = [];
  if (item.ext) mobileMeta.push(String(item.ext).toUpperCase());
  if (item.width && item.height) mobileMeta.push(item.width + ' × ' + item.height);
  else if (item.size) mobileMeta.push(formatSize(item.size));
  if (sourceDomain) mobileMeta.push(sourceDomain);
  nameCell.innerHTML = '<div class="list-name-wrap">' +
    '<span class="list-name-text" title="' + escapeHtml(item.name) + '">' + escapeHtml(item.name) + '</span>' +
    '</div>' +
    (mobileMeta.length ? '<div class="list-mobile-meta">' + mobileMeta.map(function(part) { return '<span>' + escapeHtml(part) + '</span>'; }).join('') + '</div>' : '') +
    '<div class="list-mobile-actions">' +
      '<button type="button" data-list-mobile-action="preview" data-id="' + escapeHtml(item.id) + '">' + (isItemPreviewable(item) ? '预览' : '打开') + '</button>' +
      '<button type="button" data-list-mobile-action="inspect" data-id="' + escapeHtml(item.id) + '">详情</button>' +
      '<button type="button" data-list-mobile-action="select" data-id="' + escapeHtml(item.id) + '" aria-pressed="' + (state.selectedIds.has(item.id) ? 'true' : 'false') + '" class="' + (state.selectedIds.has(item.id) ? 'is-selected' : '') + '">' + (state.selectedIds.has(item.id) ? '取消选择' : '选择') + '</button>' +
    '</div>' +
    (sourceDomain ? '<span class="list-source-domain">' + iconExternalLink() + '<span>' + escapeHtml(sourceDomain) + '</span></span>' : '');
  nameCell.style.cursor = 'pointer';
  nameCell.onclick = function(e) {
    if (e.target.closest('[data-source-domain], [data-list-mobile-action]')) return;
    if (isBatchSelectionMode()) {
      toggleSelect(item.id);
      return;
    }
    renderModule.openInspector(item);
  };
  tr.appendChild(nameCell);

  var pathCell = document.createElement('td');
  pathCell.className = 'col-path';
  var pathList = item.folderPaths || [];
  pathCell.title = pathList.length ? pathList.join(' ; ') : '';
  var folderLinks = getItemFolderLinks(item, 2);
  if (folderLinks.length) {
    pathCell.innerHTML = folderLinks.map(function(link) {
      if (!link.id) return '<span class="list-folder-chip muted">' + iconFolder() + '<span>' + escapeHtml(link.label) + '</span></span>';
      return '<button type="button" class="list-folder-chip" data-item-folder="' + escapeHtml(link.id) + '" data-item-focus-id="' + escapeHtml(item.id) + '" title="打开文件夹：' + escapeHtml(link.path || link.label) + '">' + iconFolder() + '<span>' + escapeHtml(link.label) + '</span></button>';
    }).join('') + ((Math.max((item.folders || []).length, pathList.length) > folderLinks.length) ? '<span class="list-folder-more">+' + (Math.max((item.folders || []).length, pathList.length) - folderLinks.length) + '</span>' : '');
  } else {
    pathCell.textContent = '—';
  }
  tr.appendChild(pathCell);

  var extCell = document.createElement('td');
  extCell.className = 'col-ext';
  extCell.innerHTML = item.ext ? '<button type="button" class="list-ext-chip" data-item-ext="' + escapeHtml(item.ext) + '" title="筛选格式：.' + escapeHtml(item.ext) + '">.' + escapeHtml(item.ext) + '</button>' : '—';
  tr.appendChild(extCell);

  var dimsCell = document.createElement('td');
  dimsCell.className = 'col-meta';
  dimsCell.textContent = (item.width && item.height) ? (item.width + ' × ' + item.height) : '—';
  tr.appendChild(dimsCell);

  var sizeCell = document.createElement('td');
  sizeCell.className = 'col-meta';
  sizeCell.textContent = formatSize(item.size);
  tr.appendChild(sizeCell);

  var btimeCell = document.createElement('td');
  btimeCell.className = 'col-meta';
  btimeCell.textContent = formatDate(item.btime);
  tr.appendChild(btimeCell);

  var mtimeCell = document.createElement('td');
  mtimeCell.className = 'col-meta';
  mtimeCell.textContent = formatDate(item.mtime);
  tr.appendChild(mtimeCell);

  var tagsCell = document.createElement('td');
  tagsCell.className = 'col-tags';
  tagsCell.innerHTML = (item.tags && item.tags.length) ? item.tags.slice(0, 5).map(function(tag) {
    return '<button type="button" class="list-tag-chip" data-item-tag="' + escapeHtml(tag) + '" title="打开标签：' + escapeHtml(tag) + '">#' + escapeHtml(tag) + '</button>';
  }).join('') : '—';
  tr.appendChild(tagsCell);

  var actionsCell = document.createElement('td');
  actionsCell.className = 'col-actions';
  var downloadDisabled = isRemoteAccessUnavailableForRender();
  var actHtml = '';
  if (isPreviewable(item.ext)) actHtml += '<a href="' + fileUrl + '" target="_blank" rel="noopener">预览</a>';
  else if (isItemPreviewable(item)) actHtml += '<button type="button" data-list-mobile-action="preview" data-id="' + escapeHtml(item.id) + '">缓存预览</button>';
  actHtml += '<button type="button" class="btn-download-original list-download-action' + (downloadDisabled ? ' requires-remote' : '') + '" data-id="' + escapeHtml(item.id) + '"' + (downloadDisabled ? ' disabled title="下载原文件需要连接远程 Vault"' : '') + '>' + (downloadDisabled ? '需联网' : '下载') + '</button>';
  if (canCopyImage(item.ext)) actHtml += '<button type="button" class="btn-copy" data-id="' + escapeHtml(item.id) + '">复制</button>';
  actionsCell.innerHTML = actHtml;
  tr.appendChild(actionsCell);

  thumbCell.style.cursor = 'pointer';
  thumbCell.onclick = function(e) {
    if (isBatchSelectionMode()) {
      toggleSelect(item.id);
      return;
    }
    if (isItemPreviewable(item)) renderModule.previewItem(item, fileUrl);
    else window.open(fileUrl, '_blank');
  };

  tbody.appendChild(tr);
}

function renderFolderListRow(sub, tbody) {
  var tr = document.createElement('tr');
  tr.className = 'folder-row' + (sub.locked ? ' locked' : '');
  tr.style.cursor = 'pointer';

  tr.appendChild(document.createElement('td')).className = 'col-check';
  var thumbTd = document.createElement('td');
  thumbTd.className = 'col-thumb';
  thumbTd.innerHTML = '<span class="placeholder">' + (sub.locked ? iconLock() : iconFolder()) + '</span>';
  tr.appendChild(thumbTd);

  var nameTd = document.createElement('td');
  nameTd.className = 'col-name';
  nameTd.innerHTML = '<span>' + escapeHtml(sub.name) + '</span>' + (sub.locked ? '<small class="folder-row-locked">Eagle 密码保护</small>' : '');
  tr.appendChild(nameTd);

  var pathTd = document.createElement('td');
  pathTd.className = 'col-path';
  pathTd.textContent = '—';
  tr.appendChild(pathTd);

  var extTd = document.createElement('td');
  extTd.className = 'col-ext';
  extTd.textContent = '—';
  tr.appendChild(extTd);

  for (var i = 0; i < 4; i++) {
    var metaTd = document.createElement('td');
    metaTd.className = 'col-meta';
    metaTd.textContent = '—';
    tr.appendChild(metaTd);
  }

  var tagsTd = document.createElement('td');
  tagsTd.className = 'col-tags';
  tagsTd.textContent = '—';
  tr.appendChild(tagsTd);

  var actTd = document.createElement('td');
  actTd.className = 'col-actions';
  actTd.textContent = sub.locked ? '已锁定' : '进入';
  tr.appendChild(actTd);

  tr.onclick = function() {
    if (sub.locked) {
      showLockedFolderNotice(sub);
      return;
    }
    clearAllActive();
    var folderEl = document.querySelector('[data-folder-id="' + sub.id + '"] > .sidebar-item');
    if (folderEl) folderEl.classList.add('active');
    state.currentFolderId = sub.id;
    api.loadFolderItems(sub.id);
  };

  tbody.appendChild(tr);
}

function closeLockedFolderNotice() {
  var overlay = document.querySelector('.locked-folder-overlay');
  if (!overlay) return;
  overlay.classList.remove('open');
  window.setTimeout(function() { if (overlay.isConnected) overlay.remove(); }, 180);
}

function showLockedFolderNotice(folder) {
  closeLockedFolderNotice();
  var overlay = document.createElement('div');
  overlay.className = 'locked-folder-overlay';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-label', 'Eagle 保护文件夹');
  overlay.innerHTML = '<section class="locked-folder-card">' +
    '<div class="locked-folder-mark"><span>' + iconLock() + '</span><small>REMOTE PRIVACY BOUNDARY</small></div>' +
    '<div class="locked-folder-copy"><span>EAGLE PROTECTED</span><h2>' + escapeHtml((folder && folder.name) || '受保护文件夹') + '</h2><p>这个文件夹由 Eagle 密码保护。远程 Viewer 不会索引、搜索、预览或传输其中任何素材。</p></div>' +
    '<div class="locked-folder-rules"><div><strong>0</strong><span>远程可见素材</span></div><div><strong>423</strong><span>API 锁定响应</span></div><div><strong>只读</strong><span>Vault 保持原样</span></div></div>' +
    '<div class="locked-folder-note"><i></i><span>如需访问，请先在本机 Eagle 中解除文件夹密码，再回到 Viewer 重新载入 Vault。</span></div>' +
    '<button type="button" data-close-locked-folder>知道了</button>' +
  '</section>';
  overlay.onclick = function(e) { if (e.target === overlay || e.target.closest('[data-close-locked-folder]')) closeLockedFolderNotice(); };
  overlay.onkeydown = function(e) { if (e.key === 'Escape') closeLockedFolderNotice(); };
  document.body.appendChild(overlay);
  requestAnimationFrame(function() {
    overlay.classList.add('open');
    var button = overlay.querySelector('[data-close-locked-folder]');
    if (button) button.focus({ preventScroll: true });
  });
}

function renderItemsList(subfolders, items, container, emptyMsg) {
  if (!subfolders.length && !items.length) {
    container.innerHTML = '<div class="empty-state">' + iconFolderOutline() + '<span>' + (emptyMsg || '暂无素材') + '</span></div>';
    return;
  }
  var itemIds = items.map(function(it) { return it.id; });
  var allChecked = itemIds.length > 0 && itemIds.every(function(id) { return state.selectedIds.has(id); });
  container.innerHTML = '<div class="list-wrap"><table class="list-table"><thead><tr>' +
    '<th class="col-check"><input type="checkbox" id="listSelectAll" ' + (allChecked ? 'checked' : '') + '></th>' +
    '<th class="col-thumb"></th><th>名称</th><th>路径</th><th>格式</th><th>尺寸</th><th>大小</th><th>创建时间</th><th>修改时间</th><th>标签</th><th>操作</th>' +
    '</tr></thead><tbody></tbody></table></div>';
  var tbody = container.querySelector('tbody');
  subfolders.forEach(function(sub) { renderFolderListRow(sub, tbody); });
  items.forEach(function(item) { renderListRow(item, tbody); });
  var listSelectAll = container.querySelector('#listSelectAll');
  if (listSelectAll) {
    listSelectAll.onclick = function(e) {
      e.stopPropagation();
      if (this.checked) itemIds.forEach(function(id) { state.selectedIds.add(id); });
      else itemIds.forEach(function(id) { state.selectedIds.delete(id); });
      updateBatchBar();
      updateCheckboxesInView();
    };
  }
  renderLoadMoreStatus(container);
}

function renderLoadMoreStatus(container) {
  if (['all', 'recent', 'folder', 'tag', 'search'].indexOf(state.currentView) < 0) return;
  var existing = container.querySelector('.load-more-status');
  if (existing) existing.remove();
  var status = document.createElement('div');
  status.className = 'load-more-status';
  status.textContent = state.incrementalLoading ? '正在加载更多…' : (state.incrementalHasMore ? '继续向下滚动以加载更多' : '已加载全部内容');
  container.appendChild(status);
}

function renderViewSummary() {
  var el = document.getElementById('viewSummary');
  if (!el) return;
  var items = state.currentItems || [];
  if (!items.length) {
    el.hidden = true;
    el.innerHTML = '';
    return;
  }
  var counts = { image: 0, video: 0, document: 0, audio: 0, other: 0 };
  var totalSize = 0;
  var tagged = 0;
  var sourced = 0;
  var domains = {};
  items.forEach(function(item) {
    counts[getViewMediaKind(item)] += 1;
    totalSize += Number(item.size || 0);
    if (item.tags && item.tags.length) tagged += 1;
    if (item.url) {
      sourced += 1;
      var domain = getItemSourceDomain(item);
      if (domain) domains[domain] = (domains[domain] || 0) + 1;
    }
  });
  var parts = [];
  if (state.incrementalHasMore && ['all', 'recent', 'folder', 'tag', 'search'].indexOf(state.currentView) >= 0) {
    parts.push(['已载入', items.length + ' / ' + (state.currentTotal || items.length)]);
  }
  parts.push(['大小', totalSize ? formatSize(totalSize) : '0 B']);
  [
    ['图片', counts.image],
    ['视频', counts.video],
    ['文档', counts.document],
    ['音频', counts.audio],
    ['其他', counts.other]
  ].forEach(function(row) {
    if (row[1]) parts.push(row);
  });
  if (tagged) parts.push(['有标签', tagged]);
  if (sourced) parts.push(['有来源', sourced]);
  var html = parts.map(function(part) {
    return '<span class="view-summary-pill"><strong>' + escapeHtml(part[0]) + '</strong>' + escapeHtml(String(part[1])) + '</span>';
  }).join('');
  el.innerHTML = html;
  el.hidden = false;
}

function getMobileWorkbarTitle() {
  var crumbs = getViewCrumbs();
  var current = crumbs[crumbs.length - 1];
  return (current && current.label) || state.currentTitle || '资料库';
}

function getMobileWorkbarKind() {
  if (state.currentView === 'folder') return '文件夹';
  if (state.currentView === 'tag') return '标签';
  if (state.currentView === 'recent') return '最近素材';
  if (state.currentView === 'search') return '搜索结果';
  return '资料库';
}

function getMobileWorkbarMeta() {
  var loaded = (state.currentItems || []).length;
  var subfolders = (state.currentSubfolders || []).length;
  var total = Number(state.currentTotal || 0);
  var parts = [];
  if (total > 0 && loaded && loaded < total) parts.push('已载入 ' + loaded + '/' + total);
  else if (loaded || total) parts.push((total || loaded) + ' 项');
  else parts.push('暂无素材');
  if (subfolders) parts.push(subfolders + ' 个文件夹');
  var sortMap = { mtime: '修改时间', btime: '创建时间', name: '名称', size: '大小', ext: '格式' };
  if (state.sortKey) parts.push((sortMap[state.sortKey] || state.sortKey) + (state.sortDir === 'asc' ? ' ↑' : ' ↓'));
  var filterCount = Object.keys(state.advancedFilters || {}).filter(function(key) {
    return state.advancedFilters[key] !== undefined && state.advancedFilters[key] !== null && state.advancedFilters[key] !== '';
  }).length;
  if (filterCount) parts.push(filterCount + ' 个筛选');
  return parts.join(' · ');
}

function getMobileWorkbarRemoteState() {
  var strip = document.getElementById('remoteStatusStrip');
  var snapshot = null;
  try {
    snapshot = JSON.parse(localStorage.getItem('eagle-viewer-offline-snapshot-meta') || 'null');
  } catch (e) {}
  if (navigator.onLine === false || (strip && !strip.hidden && strip.dataset.state === 'offline')) {
    return {
      state: 'offline',
      label: snapshot && snapshot.savedAt ? '离线快照' : '远程离线'
    };
  }
  if (strip && !strip.hidden && strip.dataset.state === 'checking') {
    return { state: 'checking', label: '检查中' };
  }
  if (snapshot && snapshot.savedAt && window.innerWidth <= 768) {
    return { state: 'ready', label: '快照可用' };
  }
  return { state: 'online', label: 'Vault 在线' };
}

function getMobileSnapshotLabel() {
  var snapshot = null;
  try {
    snapshot = JSON.parse(localStorage.getItem('eagle-viewer-offline-snapshot-meta') || 'null');
  } catch (e) {}
  if (!snapshot || !snapshot.savedAt) return '未保存';
  var diff = Date.now() - Number(snapshot.savedAt || 0);
  if (!isFinite(diff) || diff < 0) return (snapshot.ok || 0) + ' 项 · 刚刚';
  var minutes = Math.floor(diff / 60000);
  var age = minutes < 1 ? '刚刚' : (minutes < 60 ? minutes + '分钟前' : (minutes < 1440 ? Math.floor(minutes / 60) + '小时前' : Math.floor(minutes / 1440) + '天前'));
  return (snapshot.ok || 0) + ' 项 · ' + age;
}

function updateMobileWorkbar() {
  var el = document.getElementById('mobileWorkbar');
  if (!el) return;
  var remote = getMobileWorkbarRemoteState();
  var filterSpecs = typeof getFilterChipSpecs === 'function' ? getFilterChipSpecs(state.advancedFilters || {}) : [];
  var filterHtml = filterSpecs.length
    ? '<div class="mobile-workbar-filters" aria-label="当前筛选">' +
        filterSpecs.map(function(spec) {
          return '<button type="button" data-clear-filter="' + escapeHtml(spec.key) + '">' +
            '<span>' + escapeHtml(spec.label) + '</span><strong>' + escapeHtml(String(spec.value)) + '</strong>' + iconClose() +
          '</button>';
        }).join('') +
        '<button type="button" class="mobile-workbar-clear" data-clear-all-filters>清空</button>' +
      '</div>'
    : '';
  el.hidden = false;
  el.dataset.state = remote.state;
  var backHtml = canNavigateBackInApp()
    ? '<button type="button" class="mobile-workbar-back" data-mobile-workbar-action="back" aria-label="返回上个视图">' + iconChevronLeft() + '</button>'
    : '';
  el.innerHTML =
    backHtml +
    '<div class="mobile-workbar-main">' +
      '<span class="mobile-workbar-kind">' + escapeHtml(getMobileWorkbarKind()) + '</span>' +
      '<strong title="' + escapeHtml(getMobileWorkbarTitle()) + '">' + escapeHtml(getMobileWorkbarTitle()) + '</strong>' +
      '<small>' + escapeHtml(getMobileWorkbarMeta()) + '</small>' +
    '</div>' +
    '<div class="mobile-workbar-status" data-state="' + escapeHtml(remote.state) + '">' +
      '<span></span>' + escapeHtml(remote.label) +
    '</div>' +
    '<div class="mobile-workbar-actions">' +
      '<button type="button" data-mobile-workbar-action="search" aria-label="打开搜索">' + iconSearch() + '</button>' +
      '<button type="button" data-mobile-workbar-action="more" aria-label="打开更多">' + iconSliders() + '</button>' +
    '</div>' +
    filterHtml;
}

function getSourceDomain(url) {
  var raw = String(url || '').trim();
  if (!raw) return '';
  try {
    return new URL(raw).hostname.replace(/^www\./, '').toLowerCase();
  } catch (e) {
    return raw.replace(/^https?:\/\//i, '').replace(/^www\./i, '').split('/')[0].toLowerCase();
  }
}

function getItemSourceDomain(item) {
  return String((item && item.sourceDomain) || '').trim().toLowerCase() || getSourceDomain(item && item.url);
}

function updateContentTitle() {
  var titleEl = document.getElementById('contentTitle');
  if (!titleEl) return;
  renderContentCrumbs();
  titleEl.textContent = state.currentTotal >= 0 ? state.currentTotal + ' 项' : '';
  renderViewSummary();
  updateMobileWorkbar();
  updateSidebarCounts();
  if (EagleViewer.modules.interactions && EagleViewer.modules.interactions.syncMobileTabbar) {
    EagleViewer.modules.interactions.syncMobileTabbar();
  }
}

function updateSidebarCounts() {
  var allCount = document.getElementById('allItemsCount');
  var mobileMoreBadge = document.getElementById('mobileMoreBadge');
  if (allCount && state.currentView === 'all') allCount.textContent = state.currentTotal || '';
  if (mobileMoreBadge) {
    mobileMoreBadge.textContent = '';
    mobileMoreBadge.hidden = true;
    mobileMoreBadge.title = '';
  }
}

function getOfflineSnapshotBannerHtml() {
  var remoteStrip = document.getElementById('remoteStatusStrip');
  var stripOffline = remoteStrip && !remoteStrip.hidden && remoteStrip.dataset.state === 'offline';
  var stripChecking = remoteStrip && !remoteStrip.hidden && remoteStrip.dataset.state === 'checking';
  var offline = navigator.onLine === false || stripOffline;
  var checking = !offline && stripChecking;
  var snapshotMeta = null;
  try {
    snapshotMeta = JSON.parse(localStorage.getItem('eagle-viewer-offline-snapshot-meta') || 'null');
  } catch (e) {}
  if (!offline && !checking && !(snapshotMeta && snapshotMeta.savedAt && window.innerWidth <= 768)) return '';
  var stateName = offline ? 'offline' : (checking ? 'checking' : 'ready');
  var title = offline ? '正在浏览离线 / 缓存结果' : (checking ? '正在检查远程 Vault…' : '离线快照可用');
  var message = snapshotMeta && snapshotMeta.savedAt
    ? ('最近快照 ' + new Date(snapshotMeta.savedAt).toLocaleString('zh-CN') + ' · ' + (snapshotMeta.ok || 0) + ' 项；重连后刷新实时 Vault。')
    : '当前结果可能不是实时远程 Vault；重连后刷新最新索引。';
  return '<div class="offline-snapshot-banner" data-state="' + stateName + '">' +
    '<span class="offline-snapshot-dot"></span>' +
    '<div><strong>' + escapeHtml(title) + '</strong><small>' + escapeHtml(message) + '</small></div>' +
    '<button type="button" id="offlineBannerRetryBtn">重连</button>' +
  '</div>';
}

function bindOfflineSnapshotBanner() {
  var retry = document.getElementById('offlineBannerRetryBtn');
  if (retry) retry.onclick = function() {
    if (EagleViewer.modules.interactions && EagleViewer.modules.interactions.checkRemoteStatus) {
      EagleViewer.modules.interactions.checkRemoteStatus({ reload: false, quietStrip: false, message: '正在检查远程 Vault…' });
    }
  };
}

function appendItemsToGrid(items) {
  var body = document.getElementById('contentBody');
  var masonry = body ? body.querySelector('.masonry') : null;
  if (!masonry) return false;
  items.forEach(function(item) { renderItemCard(item, masonry); });
  applyMasonryColumnCount(masonry, masonry.children.length);
  renderLoadMoreStatus(body.firstElementChild || body);
  updateCheckboxesInView();
  focusPendingItemWhenLoaded();
  updateReturnToCurrentItemButton();
  return true;
}

function getGridThumbWidth() {
  var w = gridDensity;
  if (window.innerWidth <= 768) {
    // 移动端用更紧凑的单元格宽度，密度滑块仍控制相对大小。
    w = Math.max(96, Math.min(168, Math.round(w * 0.72)));
  }
  return w;
}

function applyMasonryColumnCount(masonry, itemCount) {
  // 统一网格：密度滑块驱动单元格宽度（--thumb-w），列数由 CSS grid 的 auto-fill 自适应。
  if (!masonry) return;
  masonry.style.columnCount = '';
  masonry.style.maxWidth = '';
  masonry.style.margin = '';
  masonry.style.setProperty('--thumb-w', getGridThumbWidth() + 'px');
}

function getJustifiedTargetHeight() {
  var raw = gridDensity;
  return window.innerWidth <= 768 ? Math.max(104, Math.min(178, raw * 0.78)) : Math.max(116, Math.min(260, raw));
}

function applyJustifiedLayout(gallery) {
  if (!gallery) return;
  var cards = Array.prototype.slice.call(gallery.children).filter(function(child) {
    return child.classList.contains('card') || child.classList.contains('folder-card');
  });
  if (!cards.length) return;
  var available = gallery.clientWidth;
  if (!available) return;
  var gap = window.innerWidth <= 768 ? 6 : 10;
  var target = getJustifiedTargetHeight();
  cards.forEach(function(card) {
    card.style.width = '';
    card.style.flexBasis = '';
    card.style.height = '';
    var thumb = card.querySelector('.card-thumb');
    if (thumb) thumb.style.height = '';
  });
  var cursor = 0;
  while (cursor < cards.length) {
    var row = [];
    var ratioSum = 0;
    while (cursor < cards.length) {
      var card = cards[cursor];
      var ratio = Number(card.dataset.aspectRatio || 1) || 1;
      row.push({ card: card, ratio: ratio });
      ratioSum += ratio;
      cursor += 1;
      if ((ratioSum * target) + (gap * (row.length - 1)) >= available) break;
    }
    var isLast = cursor >= cards.length;
    var fitted = (available - gap * (row.length - 1)) / Math.max(ratioSum, 0.1);
    var rowHeight = isLast && fitted > target * 1.18 ? target : Math.max(target * 0.72, Math.min(target * 1.32, fitted));
    row.forEach(function(entry) {
      var width = Math.max(72, Math.floor(entry.ratio * rowHeight));
      entry.card.style.flexBasis = width + 'px';
      entry.card.style.width = width + 'px';
      var thumb = entry.card.querySelector('.card-thumb');
      if (thumb) thumb.style.height = Math.round(rowHeight) + 'px';
      else if (entry.card.classList.contains('folder-card')) entry.card.style.height = Math.round(rowHeight) + 'px';
    });
  }
}

function refreshMasonryLayout() {
  if (state.viewMode === 'justified') {
    applyJustifiedLayout(document.querySelector('.justified-gallery'));
    return;
  }
  if (state.viewMode !== 'grid') return;
  var masonry = document.querySelector('.masonry');
  if (!masonry) return;
  applyMasonryColumnCount(masonry, masonry.children.length);
}

function useCompactGridLayout() {
  if (state.currentSubfolders.length) return false;
  if (!state.currentItems.length) return false;
  return state.currentItems.every(function(item) {
    return !(item.hasThumbnail || isImageExt(item.ext));
  });
}

// ===== Main render =====
function renderContent() {
  var body = document.getElementById('contentBody');
  var toolbar = document.getElementById('contentToolbar');
  var titleEl = document.getElementById('contentTitle');

  if (state.viewMode !== getPreferredViewMode()) setViewMode(getPreferredViewMode(), true);

  toolbar.style.display = (state.currentView !== 'none') ? 'flex' : 'none';

  var ctSort = document.getElementById('ctSortSelect');
  var ctDir = document.getElementById('ctSortDirSelect');
  var ctType = document.getElementById('ctTypeSelect');
  ctSort.value = state.listSort;
  ctDir.value = state.listDir;
  ctType.value = state.listType;
  updateContentTitle();

  body.innerHTML = '';

  if (!state.currentSubfolders.length && !state.currentItems.length) {
      var remoteStrip = document.getElementById('remoteStatusStrip');
      var remoteOffline = navigator.onLine === false || (remoteStrip && !remoteStrip.hidden && remoteStrip.dataset.state === 'offline');
      var snapshotMeta = null;
      try {
        snapshotMeta = JSON.parse(localStorage.getItem('eagle-viewer-offline-snapshot-meta') || 'null');
      } catch (e) {}
      if (remoteOffline) {
        body.innerHTML =
          '<div class="empty-state offline-state">' + iconFolderOutline() +
            '<strong>' + (snapshotMeta && snapshotMeta.savedAt ? '当前视图没有可用快照' : '远程 Vault 暂不可达') + '</strong>' +
            '<span>' + (snapshotMeta && snapshotMeta.savedAt ? ('已有快照保存于 ' + new Date(snapshotMeta.savedAt).toLocaleString('zh-CN') + '，但这个视图尚未缓存。') : '这不是资料库为空；请检查 VPN、NAS 或反向代理后重连。') + '</span>' +
            '<div class="empty-actions"><button type="button" id="offlineEmptyRetryBtn">重连</button><button type="button" id="offlineEmptySnapshotBtn">保存快照</button></div>' +
          '</div>';
        var retryBtn = document.getElementById('offlineEmptyRetryBtn');
        var snapshotBtn = document.getElementById('offlineEmptySnapshotBtn');
        if (retryBtn) retryBtn.onclick = function() {
          if (EagleViewer.modules.interactions && EagleViewer.modules.interactions.checkRemoteStatus) {
            EagleViewer.modules.interactions.checkRemoteStatus({ reload: false, quietStrip: false, message: '正在检查远程 Vault…' });
          }
        };
        if (snapshotBtn) snapshotBtn.onclick = function() {
          if (api && api.warmCurrentOfflineSnapshot) api.warmCurrentOfflineSnapshot();
        };
      } else {
        body.innerHTML = '<div class="empty-state">' + iconFolderOutline() + '<span>' + (state.currentEmptyMsg || '暂无素材') + '</span></div>';
      }
    return;
  }

  if (state.viewMode === 'list') {
    var wrap = document.createElement('div');
    var banner = getOfflineSnapshotBannerHtml();
    if (banner) body.insertAdjacentHTML('beforeend', banner);
    body.appendChild(wrap);
    renderItemsList(state.currentSubfolders, state.currentItems, wrap, state.currentEmptyMsg);
    setupListMarquee(wrap);
    bindOfflineSnapshotBanner();
  } else if (state.viewMode === 'justified') {
    var justifiedWrap = document.createElement('div');
    justifiedWrap.style.position = 'relative';
    var justifiedBanner = getOfflineSnapshotBannerHtml();
    if (justifiedBanner) body.insertAdjacentHTML('beforeend', justifiedBanner);
    body.appendChild(justifiedWrap);
    var gallery = document.createElement('div');
    gallery.className = 'justified-gallery';
    justifiedWrap.appendChild(gallery);
    state.currentSubfolders.forEach(function(sub) { renderFolderCard(sub, gallery); });
    state.currentItems.forEach(function(item) { renderItemCard(item, gallery); });
    renderLoadMoreStatus(justifiedWrap);
    bindOfflineSnapshotBanner();
    applyJustifiedLayout(gallery);
  } else {
    var wrap = document.createElement('div');
    wrap.style.position = 'relative';
    var bannerHtml = getOfflineSnapshotBannerHtml();
    if (bannerHtml) body.insertAdjacentHTML('beforeend', bannerHtml);
    body.appendChild(wrap);
    var masonry = document.createElement('div');
    masonry.className = 'masonry';
    if (useCompactGridLayout()) masonry.classList.add('compact-grid');
    applyMasonryColumnCount(masonry, state.currentSubfolders.length + state.currentItems.length);
    wrap.appendChild(masonry);
    state.currentSubfolders.forEach(function(sub) { renderFolderCard(sub, masonry); });
    state.currentItems.forEach(function(item) { renderItemCard(item, masonry); });
    setupGridMarquee(wrap, masonry);
    bindOfflineSnapshotBanner();
  }
  updateCheckboxesInView();
  focusPendingItemWhenLoaded();
  updateReturnToCurrentItemButton();
}

function showEmptyState() {
  state.currentView = 'none';
  state.currentItems = [];
  state.currentSubfolders = [];
  state.currentFolderId = null;
  state.currentTagName = null;
  state.currentTitle = '';
  state.currentTotal = 0;
  var body = document.getElementById('contentBody');
  body.innerHTML = '<div class="empty-state" id="emptyState">' + iconFolderOutline() + '<span>选择左侧文件夹查看素材</span></div>';
  document.getElementById('contentToolbar').style.display = 'none';
  renderModule.closeInspector();
  updateUrlFromState();
}

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

function createAudioPreviewCard(item, fileUrl, overlay) {
  var card = document.createElement('div');
  card.className = 'preview-audio-card';
  var meta = [];
  if (item.ext) meta.push(String(item.ext).toUpperCase());
  if (item.duration) meta.push(formatMediaDuration(item.duration));
  if (item.bpm) meta.push(Math.round(item.bpm) + ' BPM');
  if (item.size) meta.push(formatSize(item.size));
  card.innerHTML =
    '<div class="preview-audio-art">' + iconPlay() + '<i></i><i></i><i></i><i></i></div>' +
    '<div class="preview-audio-main">' +
      '<span>音频预览</span>' +
      '<strong>' + escapeHtml(item.name || '未命名音频') + '</strong>' +
      '<small>' + escapeHtml(meta.join(' · ') || 'Audio') + '</small>' +
    '</div>';
  var audio = document.createElement('audio');
  audio.controls = true;
  audio.preload = 'metadata';
  audio.src = fileUrl;
  audio.onloadedmetadata = function() { clearPreviewStatus(overlay); };
  audio.onerror = function() { setPreviewStatus(overlay, '音频预览失败，请下载后查看'); };
  card.appendChild(audio);
  return card;
}

function renderOoxmlTable(rows, columns, compact) {
  var visibleRows = (rows || []).slice(0, compact ? 6 : 60);
  var visibleColumns = (columns || []).slice(0, compact ? 6 : 20);
  if (!visibleRows.length || !visibleColumns.length) return '<div class="ooxml-empty">表格中没有可显示的单元格</div>';
  var head = '<th class="row-number"></th>' + visibleColumns.map(function(column) { return '<th>' + escapeHtml(column) + '</th>'; }).join('');
  var body = visibleRows.map(function(row, rowIndex) {
    return '<tr><th class="row-number">' + (rowIndex + 1) + '</th>' + visibleColumns.map(function(_, columnIndex) {
      return '<td title="' + escapeHtml(row[columnIndex] || '') + '">' + escapeHtml(row[columnIndex] || '') + '</td>';
    }).join('') + '</tr>';
  }).join('');
  return '<div class="ooxml-sheet-scroll"><table class="ooxml-sheet-grid"><thead><tr>' + head + '</tr></thead><tbody>' + body + '</tbody></table></div>';
}

function renderOoxmlDocx(preview, compact) {
  var blocks = (preview.blocks || []).slice(0, compact ? 5 : 120);
  if (!blocks.length) return '<div class="ooxml-empty">文档中没有可提取的正文</div>';
  return '<article class="ooxml-doc-page">' + blocks.map(function(block) {
    if (block.type === 'table') return '<div class="ooxml-doc-table">' + renderOoxmlTable(block.rows || [], (block.rows && block.rows[0] || []).map(function(_, index) { return String(index + 1); }), compact) + '</div>';
    if (block.type === 'heading') {
      var level = Math.max(1, Math.min(6, Number(block.level) || 1));
      return '<h' + level + '>' + escapeHtml(block.text || '') + '</h' + level + '>';
    }
    return '<p>' + escapeHtml(block.text || '') + '</p>';
  }).join('') + '</article>';
}

function renderOoxmlXlsx(preview, compact) {
  var tabs = (preview.sheetNames || []).slice(0, compact ? 2 : 8).map(function(name, index) {
    return '<span class="ooxml-sheet-tab' + (index === 0 ? ' active' : '') + '">' + escapeHtml(name) + '</span>';
  }).join('');
  return '<div class="ooxml-workbook"><div class="ooxml-sheet-tabs">' + tabs + '</div>' + renderOoxmlTable(preview.rows || [], preview.columns || [], compact) + '</div>';
}

function renderOoxmlPptx(preview, compact) {
  var slides = (preview.slides || []).slice(0, compact ? 1 : 12);
  if (!slides.length) return '<div class="ooxml-empty">演示文稿中没有可提取的文字</div>';
  return '<div class="ooxml-slide-deck">' + slides.map(function(slide) {
    var lines = (slide.lines || []).slice(0, compact ? 5 : 40);
    return '<article class="ooxml-slide"><span class="ooxml-slide-number">' + String(slide.number || '') + '</span>' +
      '<div><h2>' + escapeHtml(slide.title || ('Slide ' + slide.number)) + '</h2>' +
      lines.slice(1).map(function(line) { return '<p>' + escapeHtml(line) + '</p>'; }).join('') + '</div></article>';
  }).join('') + '</div>';
}

function renderXmindTopic(topic, depth, budget) {
  if (!topic || budget.remaining <= 0) return '';
  budget.remaining -= 1;
  var children = (topic.children || []).filter(Boolean);
  var childHtml = '';
  if (depth < budget.maxDepth && children.length && budget.remaining > 0) {
    childHtml = '<ul>' + children.map(function(child) {
      var branch = renderXmindTopic(child, depth + 1, budget);
      return branch ? '<li>' + branch + '</li>' : '';
    }).join('') + '</ul>';
  }
  return '<div class="xmind-topic depth-' + Math.min(depth, 6) + '"><span>' + escapeHtml(topic.title || '未命名主题') + '</span></div>' + childHtml;
}

function renderXmindPreview(preview, compact) {
  var sheets = (preview.sheets || []).slice(0, compact ? 1 : 8);
  if (!sheets.length) return '<div class="ooxml-empty">导图中没有可读取的主题</div>';
  var budget = { remaining: compact ? 18 : 360, maxDepth: compact ? 2 : 12 };
  return '<div class="xmind-deck">' + sheets.map(function(sheet, sheetIndex) {
    if (budget.remaining <= 0) return '';
    return '<article class="xmind-sheet">' +
      '<header><span>CANVAS ' + String(sheetIndex + 1).padStart(2, '0') + '</span><strong>' + escapeHtml(sheet.title || ('画布 ' + (sheetIndex + 1))) + '</strong></header>' +
      '<div class="xmind-map"><div class="xmind-tree">' + renderXmindTopic(sheet.root, 0, budget) + '</div></div>' +
    '</article>';
  }).join('') + '</div>';
}

function renderDocumentPreviewContent(preview, compact) {
  if (!preview) return '<div class="ooxml-empty">无法读取文档结构</div>';
  if (preview.kind === 'doc') return renderOoxmlDocx(preview, compact);
  if (preview.kind === 'docx') return renderOoxmlDocx(preview, compact);
  if (preview.kind === 'xlsx') return renderOoxmlXlsx(preview, compact);
  if (preview.kind === 'pptx') return renderOoxmlPptx(preview, compact);
  if (preview.kind === 'xmind') return renderXmindPreview(preview, compact);
  return '<div class="ooxml-empty">暂不支持这种文档结构</div>';
}

function getDocumentPreviewSummary(preview) {
  if (!preview) return '只读结构预览';
  var summary = preview.summary || {};
  if (preview.kind === 'doc') return (summary.blocks || 0) + ' 个可读段落 · 旧版 Word';
  if (preview.kind === 'docx') return (summary.blocks || 0) + ' 个内容块';
  if (preview.kind === 'xlsx') return (preview.activeSheet || '首个工作表') + ' · ' + (summary.rows || 0) + ' × ' + (summary.columns || 0);
  if (preview.kind === 'pptx') return (summary.slides || 0) + ' 张幻灯片';
  if (preview.kind === 'xmind') return (summary.sheets || 0) + ' 张画布 · ' + (summary.nodes || 0) + ' 个主题';
  return '只读结构预览';
}

// Keep the remote preview deliberately small: fit, zoom out, and zoom in.
function addImagePreviewTools(overlay, img) {
  var scale = 1;
  var toolbar = document.createElement('div');
  toolbar.className = 'preview-tools preview-image-tools';
  toolbar.setAttribute('aria-label', '图片预览工具');
  toolbar.innerHTML =
    '<button type="button" data-preview-tool="zoom-out" aria-label="缩小">−</button>' +
    '<button type="button" data-preview-tool="fit">适应</button>' +
    '<button type="button" data-preview-tool="zoom-in" aria-label="放大">＋</button>';

  function applyScale() {
    if (scale === 1) {
      img.style.maxWidth = '100%';
      img.style.maxHeight = '100%';
      img.style.width = '';
      img.style.height = '';
      img.classList.remove('is-zoomed');
      return;
    }
    img.style.maxWidth = 'none';
    img.style.maxHeight = 'none';
    img.style.width = Math.max(1, img.naturalWidth * scale) + 'px';
    img.style.height = Math.max(1, img.naturalHeight * scale) + 'px';
    img.classList.add('is-zoomed');
  }

  toolbar.querySelector('[data-preview-tool="zoom-out"]').onclick = function(event) {
    event.stopPropagation();
    scale = Math.max(0.25, scale - 0.25);
    applyScale();
  };
  toolbar.querySelector('[data-preview-tool="fit"]').onclick = function(event) {
    event.stopPropagation();
    scale = 1;
    applyScale();
  };
  toolbar.querySelector('[data-preview-tool="zoom-in"]').onclick = function(event) {
    event.stopPropagation();
    scale = Math.min(4, scale + 0.25);
    applyScale();
  };
  overlay.appendChild(toolbar);
}

async function previewItem(item, fileUrl) {
  rememberFocusedItem(item);
  if (EagleViewer.modules.interactions && EagleViewer.modules.interactions.rememberViewedItem) {
    EagleViewer.modules.interactions.rememberViewedItem(item);
  }
  var ext = (item.ext || '').toLowerCase();
  var isVideo = PREVIEW_VIDEO_EXTS.indexOf(ext) >= 0;
  var isAudio = PREVIEW_AUDIO_EXTS.indexOf(ext) >= 0;
  var isImage = PREVIEW_IMAGE_EXTS.indexOf(ext) >= 0;
  var isPdf = ext === 'pdf';
  var isText = ext === 'txt';
  var el;
  var overlay;
  if (isVideo) {
    overlay = createPreviewOverlay();
    overlay.dataset.previewItemId = item.id || '';
    addPreviewInfoHud(overlay, item);
    addPreviewNavigation(overlay, item);
    addPreviewMobileActions(overlay, item);
    setPreviewStatus(overlay, '视频加载中…');
    el = document.createElement('video');
    el.controls = true;
    el.autoplay = true;
    el.src = fileUrl;
    el.onloadeddata = function() { clearPreviewStatus(overlay); };
    el.onerror = function() { setPreviewStatus(overlay, '视频预览失败，请下载后查看'); };
  } else if (isAudio) {
    overlay = createPreviewOverlay();
    overlay.dataset.previewItemId = item.id || '';
    addPreviewInfoHud(overlay, item);
    addPreviewNavigation(overlay, item);
    addPreviewMobileActions(overlay, item);
    setPreviewStatus(overlay, '音频加载中…');
    el = createAudioPreviewCard(item, fileUrl, overlay);
  } else if (isImage) {
    overlay = createPreviewOverlay();
    overlay.dataset.previewItemId = item.id || '';
    addPreviewInfoHud(overlay, item);
    addPreviewNavigation(overlay, item);
    addPreviewMobileActions(overlay, item);
    setPreviewStatus(overlay, '图片加载中…');
    el = document.createElement('img');
    var thumbnailUrl = API + '/api/items/' + encodeURIComponent(item.id || '') + '/thumbnail';
    var usingThumbnailFallback = false;
    el.dataset.previewSource = 'original';
    el.src = fileUrl;
    el.onload = function() {
      clearPreviewStatus(overlay);
      if (usingThumbnailFallback) setPreviewQualityNotice(overlay, isRemoteAccessUnavailableForRender());
    };
    el.onerror = function() {
      if (!usingThumbnailFallback && item.id) {
        usingThumbnailFallback = true;
        el.dataset.previewSource = 'thumbnail';
        setPreviewStatus(overlay, '正在打开缓存预览…');
        el.src = thumbnailUrl;
        return;
      }
      setPreviewStatus(overlay, '图片预览不可用；请重连远程 Vault 后重试');
    };
    addImagePreviewTools(overlay, el);
  } else if (isPdf) {
    overlay = createPreviewOverlay();
    overlay.dataset.previewItemId = item.id || '';
    addPreviewInfoHud(overlay, item);
    addPreviewNavigation(overlay, item);
    addPreviewMobileActions(overlay, item);
    setPreviewStatus(overlay, 'PDF 加载中…');
    el = document.createElement('iframe');
    el.src = fileUrl;
    el.title = item.name || 'PDF Preview';
    el.onload = function() { clearPreviewStatus(overlay); };
  } else if (isText) {
    overlay = createPreviewOverlay();
    overlay.dataset.previewItemId = item.id || '';
    addPreviewInfoHud(overlay, item);
    addPreviewNavigation(overlay, item);
    addPreviewMobileActions(overlay, item);
    var pre = document.createElement('pre');
    pre.textContent = '加载中…';
    overlay.appendChild(pre);
    try {
      var response = await fetch(fileUrl);
      if (handleAuthResponse(response)) {
        closePreviewOverlay(overlay);
        return;
      }
      if (!response.ok) throw new Error('无法读取文本内容');
      pre.textContent = await response.text();
    } catch (err) {
      pre.textContent = '文本预览失败：' + (err && err.message ? err.message : '请下载后查看');
    }
    return;
  } else {
    window.open(fileUrl, '_blank');
    return;
  }
  overlay.appendChild(el);
}

// ===== Hover preview =====
function showHoverPreview(url, ev, previewType) {
  if (state.hoverPreviewEl) renderModule.hideHoverPreview();
  state.hoverPreviewEl = document.createElement('div');
  state.hoverPreviewEl.className = 'hover-preview';
  if (previewType === 'pdf') {
    var frame = document.createElement('iframe');
    frame.src = url + '#toolbar=0&navpanes=0&scrollbar=0&view=FitH';
    frame.onload = function() {
      if (state.hoverPreviewEl) state.hoverPreviewEl.classList.add('visible');
    };
    state.hoverPreviewEl.appendChild(frame);
  } else {
    var img = document.createElement('img');
    img.src = url;
    img.onload = function() {
      if (state.hoverPreviewEl) state.hoverPreviewEl.classList.add('visible');
    };
    img.onerror = function() { renderModule.hideHoverPreview(); };
    state.hoverPreviewEl.appendChild(img);
  }
  document.body.appendChild(state.hoverPreviewEl);
  positionHoverPreview(ev);
}

function positionHoverPreview(ev) {
  if (!state.hoverPreviewEl) return;
  state.hoverPreviewPos = { x: ev.clientX, y: ev.clientY };
  if (state.hoverPreviewRaf) return;
  state.hoverPreviewRaf = requestAnimationFrame(function() {
    state.hoverPreviewRaf = 0;
    if (!state.hoverPreviewEl || !state.hoverPreviewPos) return;
    var x = state.hoverPreviewPos.x + 16;
    var y = state.hoverPreviewPos.y + 16;
    var vw = window.innerWidth;
    var vh = window.innerHeight;
    if (x + 370 > vw) x = state.hoverPreviewPos.x - 376;
    if (y + 370 > vh) y = state.hoverPreviewPos.y - 376;
    if (x < 0) x = 8;
    if (y < 0) y = 8;
    state.hoverPreviewEl.style.transform = 'translate3d(' + x + 'px,' + y + 'px,0)';
  });
}

function hideHoverPreview() {
  clearTimeout(state.hoverTimer);
  state.hoverPreviewPos = null;
  if (state.hoverPreviewRaf) {
    cancelAnimationFrame(state.hoverPreviewRaf);
    state.hoverPreviewRaf = 0;
  }
  if (state.hoverPreviewEl) {
    state.hoverPreviewEl.remove();
    state.hoverPreviewEl = null;
  }
}

Object.assign(renderModule, {
  renderSidebar: renderSidebar,
  showLockedFolderNotice: showLockedFolderNotice,
  renderTagList: renderTagList,
  syncActiveNavigationState: syncActiveNavigationState,
  updateBatchBar: updateBatchBar,
  openInspector: openInspector,
  closeInspector: closeInspector,
  renderContent: renderContent,
  updateSidebarCounts: updateSidebarCounts,
  showEmptyState: showEmptyState,
  previewItem: previewItem,
  openCompare: openCompare,
  closeCompareOverlay: closeCompareOverlay,
  closePreviewOverlay: closePreviewOverlay,
  toggleSelect: toggleSelect,
  updateCheckboxesInView: updateCheckboxesInView,
  hideHoverPreview: hideHoverPreview,
  refreshMasonryLayout: refreshMasonryLayout,
  updateContentTitle: updateContentTitle,
  updateMobileWorkbar: updateMobileWorkbar,
  refreshOpenPreviewMobileActions: refreshOpenPreviewMobileActions,
  appendItemsToGrid: appendItemsToGrid
});
renderModule.focusPendingItemWhenLoaded = focusPendingItemWhenLoaded;
renderModule.returnFocusToItem = returnFocusToItem;
renderModule.updateReturnToCurrentItemButton = updateReturnToCurrentItemButton;
