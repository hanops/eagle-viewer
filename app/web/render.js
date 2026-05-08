'use strict';

var state = EagleViewer.state;
var api = EagleViewer.modules.api;
var renderModule = EagleViewer.modules.render = EagleViewer.modules.render || {};

// ===== Sidebar rendering =====
function renderFolder(f, depth) {
  var div = document.createElement('div');
  div.className = 'folder-node';
  div.dataset.folderId = f.id;
  var row = document.createElement('div');
  row.className = 'sidebar-item';
  row.style.paddingLeft = (16 + depth * 12) + 'px';
  var hasChildren = f.children && f.children.length > 0;

  var toggle = document.createElement('span');
  toggle.className = 'folder-toggle' + (state.folderExpanded[f.id] ? ' expanded' : '');
  toggle.innerHTML = hasChildren ? iconChevronRight() : '';
  toggle.style.visibility = hasChildren ? 'visible' : 'hidden';
  toggle.onclick = function(e) {
    e.stopPropagation();
    if (!hasChildren) return;
    state.folderExpanded[f.id] = !state.folderExpanded[f.id];
    childrenEl.classList.toggle('collapsed', !state.folderExpanded[f.id]);
    toggle.classList.toggle('expanded', state.folderExpanded[f.id]);
  };

  var icon = document.createElement('span');
  icon.className = 'sidebar-item-icon';
  icon.innerHTML = iconFolder();

  var name = document.createElement('span');
  name.className = 'sidebar-item-name';
  name.textContent = f.name || '(未命名)';

  var count = document.createElement('span');
  count.className = 'sidebar-item-count';
  count.textContent = (f.count != null ? f.count : 0) + '';

  row.appendChild(toggle);
  row.appendChild(icon);
  row.appendChild(name);
  row.appendChild(count);

  row.onclick = function(e) {
    if (e.target.closest('.folder-toggle')) return;
    e.stopPropagation();
    document.getElementById('searchInput').value = '';
    clearAllActive();
    row.classList.add('active');
    state.currentTagName = null;
    api.loadFolderItems(f.id);
  };

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
      out.push({ id: node.id, path: fullPath });
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

// ===== Selection =====
function updateBatchBar() {
  var n = state.selectedIds.size;
  var bar = document.getElementById('batchBar');
  var countEl = document.getElementById('selectedCount');
  var metaEl = document.getElementById('selectedMeta');
  var breakdownEl = document.getElementById('selectedBreakdown');
  var selectedItems = getSelectedItems();
  var selectedSize = getSelectedItems().reduce(function(sum, item) { return sum + (item.size || 0); }, 0);
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
  if (n) bar.classList.add('visible'); else bar.classList.remove('visible');
  if (n > 1 && state.inspectorItem) renderModule.closeInspector();
}

function isBatchSelectionMode() {
  return state.selectedIds.size > 1;
}

function toggleSelect(id) {
  if (state.selectedIds.has(id)) state.selectedIds.delete(id);
  else state.selectedIds.add(id);
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
    cb.checked = state.selectedIds.has(cb.dataset.id);
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

// ===== Inspector panel =====
function openInspector(item) {
  if (isBatchSelectionMode()) return;
  state.inspectorItem = item;
  var panel = document.getElementById('inspector');
  var inner = document.getElementById('inspectorInner');
  var actions = document.getElementById('inspectorActions');
  var thumbUrl = API + '/api/items/' + item.id + '/thumbnail';
  var fileUrl = API + '/api/items/' + item.id + '/file';
  var fileUrlDownload = fileUrl + '?download=true';
  var downloadName = (item.name || 'file') + (item.ext ? '.' + item.ext : '');

  var html = '';

  html += '<div class="inspector-preview" id="inspectorPreview"></div>';

  html += '<div class="inspector-fields">';

  html += '<div class="inspector-field"><div class="inspector-field-label">名称</div><div class="inspector-field-value">' + escapeHtml(item.name || '—') + '</div></div>';

  if (item.ext) {
    html += '<div class="inspector-field"><div class="inspector-field-label">格式</div><div class="inspector-field-value"><span class="inspector-badge">' + escapeHtml(item.ext) + '</span></div></div>';
  }

  if (item.width && item.height) {
    html += '<div class="inspector-field"><div class="inspector-field-label">尺寸</div><div class="inspector-field-value">' + item.width + ' × ' + item.height + '</div></div>';
  }

  if (item.size) {
    html += '<div class="inspector-field"><div class="inspector-field-label">大小</div><div class="inspector-field-value">' + formatSize(item.size) + '</div></div>';
  }

  html += '<div class="inspector-field"><div class="inspector-field-label">创建时间</div><div class="inspector-field-value">' + formatDate(item.btime) + '</div></div>';
  html += '<div class="inspector-field"><div class="inspector-field-label">修改时间</div><div class="inspector-field-value">' + formatDate(item.mtime) + '</div></div>';

  var paths = item.folderPaths || [];
  if (paths.length) {
    html += '<div class="inspector-field"><div class="inspector-field-label">文件夹</div><div class="inspector-field-value">' + paths.map(function(p) { return escapeHtml(p); }).join('<br>') + '</div></div>';
  }

  if (item.tags && item.tags.length) {
    html += '<div class="inspector-field"><div class="inspector-field-label">标签</div><div class="inspector-tags">' + item.tags.map(function(t) { return '<span class="tag-chip">' + escapeHtml(t) + '</span>'; }).join('') + '</div></div>';
  }

  if (item.url) {
    html += '<div class="inspector-field"><div class="inspector-field-label">来源</div><div class="inspector-field-value"><a href="' + escapeHtml(item.url) + '" target="_blank" rel="noopener">' + escapeHtml(item.url.length > 60 ? item.url.substring(0, 60) + '…' : item.url) + ' ' + iconExternalLink() + '</a></div></div>';
  }

  if (item.annotation) {
    html += '<div class="inspector-field"><div class="inspector-field-label">备注</div><div class="inspector-field-value">' + escapeHtml(item.annotation) + '</div></div>';
  }

  html += '</div>';
  inner.innerHTML = html;
  renderInspectorPreview(document.getElementById('inspectorPreview'), item, thumbUrl, fileUrl);

  var actionsHtml = '';
  if (isPreviewable(item.ext)) {
    actionsHtml += '<button type="button" class="primary" onclick="window._previewInspectorItem()">' + iconEye() + ' 预览</button>';
  }
  actionsHtml += '<a href="' + escapeHtml(fileUrlDownload) + '" download="' + escapeHtml(downloadName) + '">' + iconDownload() + ' 下载</a>';
  actionsHtml += '<button type="button" class="btn-collection" data-list="favorite" data-id="' + escapeHtml(item.id) + '">收藏</button>';
  actionsHtml += '<button type="button" class="btn-collection" data-list="later" data-id="' + escapeHtml(item.id) + '">待整理</button>';
  if (canCopyImage(item.ext)) {
    actionsHtml += '<button type="button" class="btn-copy" data-id="' + escapeHtml(item.id) + '">' + iconCopy() + ' 复制</button>';
  }
  actions.innerHTML = actionsHtml;

  panel.classList.add('open');
  updateInspectorNav();
  syncFocusedItem(item.id);
}

window._previewInspectorItem = function() {
  if (state.inspectorItem) {
    var fileUrl = API + '/api/items/' + state.inspectorItem.id + '/file';
    renderModule.previewItem(state.inspectorItem, fileUrl);
  }
};

function closeInspector() {
  document.getElementById('inspector').classList.remove('open');
  state.inspectorItem = null;
  updateInspectorNav();
}

// ===== Card rendering (masonry) =====
function renderItemCard(item, container) {
  var card = document.createElement('div');
  card.className = 'card';
  card.dataset.itemId = item.id;

  var cb = document.createElement('input');
  cb.type = 'checkbox';
  cb.className = 'card-checkbox item-cb';
  cb.dataset.id = item.id;
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

  card.appendChild(thumb);

  card.onclick = function(e) {
    if (e.target.closest('.card-checkbox')) return;
    if (isBatchSelectionMode()) return;
    renderModule.openInspector(item);
  };

  card.addEventListener('dblclick', function(e) {
    if (e.target.closest('.card-checkbox')) return;
    if (isPreviewable(item.ext)) renderModule.previewItem(item, fileUrl);
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
  card.className = 'folder-card';
  card.innerHTML = '<span class="folder-card-icon">' + iconFolderLarge() + '</span><span class="folder-card-name">' + escapeHtml(sub.name) + '</span>';
  card.onclick = function() {
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
  var fileUrlDownload = fileUrl + '?download=true';
  var thumbUrl = API + '/api/items/' + item.id + '/thumbnail';
  var tr = document.createElement('tr');

  var checkCell = document.createElement('td');
  checkCell.className = 'col-check';
  var cb = document.createElement('input');
  cb.type = 'checkbox';
  cb.className = 'item-cb';
  cb.dataset.id = item.id;
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
  nameCell.innerHTML = '<span title="' + escapeHtml(item.name) + '">' + escapeHtml(item.name) + '</span>';
  nameCell.style.cursor = 'pointer';
  nameCell.onclick = function() {
    if (isBatchSelectionMode()) return;
    renderModule.openInspector(item);
  };
  tr.appendChild(nameCell);

  var pathCell = document.createElement('td');
  pathCell.className = 'col-path';
  var pathList = item.folderPaths || [];
  pathCell.title = pathList.length ? pathList.join(' ; ') : '';
  var pathDisplay = '—';
  if (pathList.length) {
    var lastParts = pathList.map(function(p) {
      var parts = (p || '').split(' / ');
      return parts.length ? parts[parts.length - 1] : p;
    });
    pathDisplay = lastParts.join(' ; ');
  }
  pathCell.textContent = pathDisplay;
  tr.appendChild(pathCell);

  var extCell = document.createElement('td');
  extCell.className = 'col-ext';
  extCell.textContent = item.ext ? '.' + item.ext : '—';
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
  tagsCell.innerHTML = (item.tags && item.tags.length) ? '<span>' + escapeHtml(item.tags.slice(0, 5).join(', ')) + '</span>' : '—';
  tr.appendChild(tagsCell);

  var actionsCell = document.createElement('td');
  actionsCell.className = 'col-actions';
  var downloadName = (item.name || 'file') + (item.ext ? '.' + item.ext : '');
  var actHtml = '';
  if (isPreviewable(item.ext)) actHtml += '<a href="' + fileUrl + '" target="_blank" rel="noopener">预览</a>';
  actHtml += '<a href="' + fileUrlDownload + '" download="' + escapeHtml(downloadName) + '">下载</a>';
  if (canCopyImage(item.ext)) actHtml += '<button type="button" class="btn-copy" data-id="' + escapeHtml(item.id) + '">复制</button>';
  actionsCell.innerHTML = actHtml;
  tr.appendChild(actionsCell);

  thumbCell.style.cursor = 'pointer';
  thumbCell.onclick = function() {
    if (isPreviewable(item.ext)) renderModule.previewItem(item, fileUrl);
    else window.open(fileUrl, '_blank');
  };

  tbody.appendChild(tr);
}

function renderFolderListRow(sub, tbody) {
  var tr = document.createElement('tr');
  tr.className = 'folder-row';
  tr.style.cursor = 'pointer';

  tr.appendChild(document.createElement('td')).className = 'col-check';
  var thumbTd = document.createElement('td');
  thumbTd.className = 'col-thumb';
  thumbTd.innerHTML = '<span class="placeholder">' + iconFolder() + '</span>';
  tr.appendChild(thumbTd);

  var nameTd = document.createElement('td');
  nameTd.className = 'col-name';
  nameTd.innerHTML = '<span>' + escapeHtml(sub.name) + '</span>';
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
  actTd.textContent = '进入';
  tr.appendChild(actTd);

  tr.onclick = function() {
    clearAllActive();
    var folderEl = document.querySelector('[data-folder-id="' + sub.id + '"] > .sidebar-item');
    if (folderEl) folderEl.classList.add('active');
    state.currentFolderId = sub.id;
    api.loadFolderItems(sub.id);
  };

  tbody.appendChild(tr);
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

function updateContentTitle() {
  var titleEl = document.getElementById('contentTitle');
  if (!titleEl) return;
  if (state.currentTitle) {
    titleEl.textContent = state.currentTitle + (state.currentTotal >= 0 ? ' · ' + state.currentTotal + ' 项' : '');
  } else if (state.currentTotal > 0) {
    titleEl.textContent = state.currentTotal + ' 项';
  } else {
    titleEl.textContent = '';
  }
}

function appendItemsToGrid(items) {
  var body = document.getElementById('contentBody');
  var masonry = body ? body.querySelector('.masonry') : null;
  if (!masonry) return false;
  items.forEach(function(item) { renderItemCard(item, masonry); });
  applyMasonryColumnCount(masonry, masonry.children.length);
  renderLoadMoreStatus(body.firstElementChild || body);
  updateCheckboxesInView();
  return true;
}

function getMasonryBaseColumnCount() {
  var width = window.innerWidth;
  if (width <= 400) return 2;
  if (width <= 768) return 2;
  if (width <= 900) return 3;
  if (width <= 1100) return 4;
  if (width <= 1400) return 5;
  return 6;
}

function applyMasonryColumnCount(masonry, itemCount) {
  if (!masonry) return;
  if (masonry.classList.contains('compact-grid')) {
    masonry.style.columnCount = '';
    masonry.style.maxWidth = '';
    masonry.style.margin = '';
    return;
  }
  var total = Math.max(1, itemCount || 0);
  var baseColumns = getMasonryBaseColumnCount();
  var usedColumns = Math.min(baseColumns, total);
  var parent = masonry.parentElement;
  var gap = 14;
  var availableWidth = parent ? parent.clientWidth : 0;
  masonry.style.columnCount = String(usedColumns);
  if (availableWidth > 0 && usedColumns < baseColumns) {
    var targetColumnWidth = (availableWidth - gap * (baseColumns - 1)) / baseColumns;
    var maxWidth = Math.max(0, usedColumns * targetColumnWidth + gap * (usedColumns - 1));
    masonry.style.maxWidth = maxWidth + 'px';
    masonry.style.margin = '0 auto';
  } else {
    masonry.style.maxWidth = '';
    masonry.style.margin = '';
  }
}

function refreshMasonryLayout() {
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
    body.innerHTML = '<div class="empty-state">' + iconFolderOutline() + '<span>' + (state.currentEmptyMsg || '暂无素材') + '</span></div>';
    return;
  }

  if (state.viewMode === 'list') {
    var wrap = document.createElement('div');
    body.appendChild(wrap);
    renderItemsList(state.currentSubfolders, state.currentItems, wrap, state.currentEmptyMsg);
    setupListMarquee(wrap);
  } else {
    var wrap = document.createElement('div');
    wrap.style.position = 'relative';
    body.appendChild(wrap);
    var masonry = document.createElement('div');
    masonry.className = 'masonry';
    if (useCompactGridLayout()) masonry.classList.add('compact-grid');
    applyMasonryColumnCount(masonry, state.currentSubfolders.length + state.currentItems.length);
    wrap.appendChild(masonry);
    state.currentSubfolders.forEach(function(sub) { renderFolderCard(sub, masonry); });
    state.currentItems.forEach(function(item) { renderItemCard(item, masonry); });
    setupGridMarquee(wrap, masonry);
  }
  updateCheckboxesInView();
}

function renderDuplicates() {
  var body = document.getElementById('contentBody');
  document.getElementById('contentToolbar').style.display = 'flex';
  updateContentTitle();
  body.innerHTML = '';
  if (!state.duplicateGroups.length) {
    body.innerHTML = '<div class="empty-state">' + iconFolderOutline() + '<span>暂无疑似重复素材</span></div>';
    return;
  }
  state.duplicateGroups.forEach(function(group, idx) {
    var section = document.createElement('div');
    section.className = 'duplicate-group';
    var meta = group.key || {};
    section.innerHTML = '<div class="duplicate-title">重复组 ' + (idx + 1) + ' · ' + group.count + ' 项 · ' + formatSize(meta.size || 0) + '</div>';
    var masonry = document.createElement('div');
    masonry.className = 'masonry compact-grid';
    (group.items || []).forEach(function(item) { renderItemCard(item, masonry); });
    section.appendChild(masonry);
    body.appendChild(section);
  });
  updateCheckboxesInView();
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
function createPreviewOverlay() {
  var overlay = document.createElement('div');
  overlay.className = 'preview-overlay';
  overlay.onclick = function(e) { if (e.target === overlay) overlay.remove(); };
  var close = document.createElement('button');
  close.className = 'preview-close';
  close.innerHTML = iconClose();
  close.onclick = function() { overlay.remove(); };
  overlay.appendChild(close);
  document.body.appendChild(overlay);
  return overlay;
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

function addImagePreviewTools(overlay, img) {
  var scale = 1;
  var toolbar = document.createElement('div');
  toolbar.className = 'preview-tools';
  toolbar.innerHTML = '<button type="button">-</button><button type="button">适应</button><button type="button">100%</button><button type="button">+</button>';
  var buttons = toolbar.querySelectorAll('button');
  function applyScale() {
    img.style.maxWidth = scale === 1 ? '100%' : 'none';
    img.style.maxHeight = scale === 1 ? '100%' : 'none';
    img.style.width = scale === 1 ? '' : (img.naturalWidth * scale) + 'px';
    img.style.height = scale === 1 ? '' : (img.naturalHeight * scale) + 'px';
  }
  buttons[0].onclick = function(e) { e.stopPropagation(); scale = Math.max(0.2, scale - 0.2); applyScale(); };
  buttons[1].onclick = function(e) { e.stopPropagation(); scale = 1; applyScale(); };
  buttons[2].onclick = function(e) { e.stopPropagation(); scale = 1; img.style.maxWidth = 'none'; img.style.maxHeight = 'none'; img.style.width = img.naturalWidth + 'px'; img.style.height = img.naturalHeight + 'px'; };
  buttons[3].onclick = function(e) { e.stopPropagation(); scale = Math.min(5, scale + 0.2); applyScale(); };
  overlay.appendChild(toolbar);
}

async function previewItem(item, fileUrl) {
  var ext = (item.ext || '').toLowerCase();
  var isVideo = PREVIEW_VIDEO_EXTS.indexOf(ext) >= 0;
  var isImage = PREVIEW_IMAGE_EXTS.indexOf(ext) >= 0;
  var isPdf = ext === 'pdf';
  var isText = ext === 'txt';
  var el;
  var overlay;
  if (isVideo) {
    overlay = createPreviewOverlay();
    setPreviewStatus(overlay, '视频加载中…');
    el = document.createElement('video');
    el.controls = true;
    el.autoplay = true;
    el.src = fileUrl;
    el.onloadeddata = function() { clearPreviewStatus(overlay); };
    el.onerror = function() { setPreviewStatus(overlay, '视频预览失败，请下载后查看'); };
  } else if (isImage) {
    overlay = createPreviewOverlay();
    setPreviewStatus(overlay, '图片加载中…');
    el = document.createElement('img');
    el.src = fileUrl;
    el.onload = function() { clearPreviewStatus(overlay); };
    el.onerror = function() { setPreviewStatus(overlay, '图片预览失败，请下载后查看'); };
    addImagePreviewTools(overlay, el);
  } else if (isPdf) {
    overlay = createPreviewOverlay();
    setPreviewStatus(overlay, 'PDF 加载中…');
    el = document.createElement('iframe');
    el.src = fileUrl;
    el.title = item.name || 'PDF Preview';
    el.onload = function() { clearPreviewStatus(overlay); };
  } else if (isText) {
    overlay = createPreviewOverlay();
    var pre = document.createElement('pre');
    pre.textContent = '加载中…';
    overlay.appendChild(pre);
    try {
      var response = await fetch(fileUrl);
      if (handleAuthResponse(response)) {
        overlay.remove();
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
  renderTagList: renderTagList,
  syncActiveNavigationState: syncActiveNavigationState,
  updateBatchBar: updateBatchBar,
  openInspector: openInspector,
  closeInspector: closeInspector,
  renderContent: renderContent,
  renderDuplicates: renderDuplicates,
  showEmptyState: showEmptyState,
  previewItem: previewItem,
  hideHoverPreview: hideHoverPreview,
  refreshMasonryLayout: refreshMasonryLayout,
  updateContentTitle: updateContentTitle,
  appendItemsToGrid: appendItemsToGrid
});
