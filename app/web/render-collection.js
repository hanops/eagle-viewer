'use strict';

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
        (item.ext ? '<button type="button" class="card-details-ext" data-item-ext="' + escapeHtml(item.ext) + '" title="筛选格式：' + escapeHtml(item.ext) + '">' + escapeHtml(String(item.ext).toUpperCase()) + '</button>' : '') +
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
  }).join('') : '';
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
  return (current && current.label) || state.currentTitle || t('library_title');
}

function getMobileWorkbarKind() {
  if (state.currentView === 'folder') return t('folder_view');
  if (state.currentView === 'tag') return t('tag_view');
  if (state.currentView === 'recent') return t('recent_view');
  if (state.currentView === 'search') return t('search_results');
  return t('library_title');
}

function getMobileWorkbarMeta() {
  var loaded = (state.currentItems || []).length;
  var subfolders = (state.currentSubfolders || []).length;
  var total = Number(state.currentTotal || 0);
  var parts = [];
  if (total > 0 && loaded && loaded < total) parts.push(tFmt('loaded_count', { loaded: loaded, total: total }));
  else if (loaded || total) parts.push(tFmt('item_count', { n: total || loaded }));
  else parts.push(t('no_items'));
  if (subfolders) parts.push(tFmt('folder_count', { n: subfolders }));
  if (state.sortKey) {
    var sortKey = 'sort_' + state.sortKey;
    var directionKey = state.sortDir === 'asc' ? 'sort_asc' : 'sort_desc';
    parts.push(t(sortKey) + ' · ' + t(directionKey));
  }
  var filterCount = Object.keys(state.advancedFilters || {}).filter(function(key) {
    return state.advancedFilters[key] !== undefined && state.advancedFilters[key] !== null && state.advancedFilters[key] !== '';
  }).length;
  if (filterCount) parts.push(tFmt('filter_count', { n: filterCount }));
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
    '<div class="mobile-workbar-status" title="' + escapeHtml(remote.label) + '" data-state="' + escapeHtml(remote.state) + '">' +
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
  if (!state.currentItems.length) return false;
  return state.currentItems.every(function(item) {
    return !(item.hasThumbnail || isImageExt(item.ext));
  });
}
