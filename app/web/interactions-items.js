'use strict';

function findCurrentItem(itemId) {
  return (state.currentItems || []).find(function(item) { return item.id === itemId; }) ||
    (state.inspectorItem && state.inspectorItem.id === itemId ? state.inspectorItem : null);
}

async function restorePendingInspector() {
  if (!state.pendingItemId) return;
  var itemId = state.pendingItemId;
  var item = findCurrentItem(itemId);
  if (!item) {
    var resolved = await api.resolveItems([itemId]);
    item = resolved && resolved[0];
  }
  if (item && state.pendingItemId === itemId) render.openInspector(item);
}

function buildItemShareUrl(item) {
  var itemId = item && item.id ? item.id : '';
  if (!itemId) return location.href;
  var params = new URLSearchParams(location.hash ? location.hash.slice(1) : '');
  params.set('view', state.currentView || 'all');
  params.set('sort', state.listSort || 'mtime');
  params.set('dir', state.listDir || 'desc');
  params.set('type', state.listType || 'all');
  if (state.currentView === 'folder' && state.currentFolderId) params.set('id', state.currentFolderId);
  else params.delete('id');
  if (state.currentView === 'tag' && state.currentTagName) params.set('tag', state.currentTagName);
  else params.delete('tag');
  if (state.currentView === 'recent') params.set('days', String(state.recentDays || 7));
  else params.delete('days');
  if (state.currentView === 'search' && state.searchQuery) params.set('q', state.searchQuery);
  else params.delete('q');
  params.set('item', itemId);
  return location.origin + location.pathname + location.search + '#' + params.toString();
}

async function shareItemLink(item, button) {
  if (!item) return;
  var url = buildItemShareUrl(item);
  var title = item.name || 'Eagle Vault 素材';
  try {
    if (navigator.share && window.innerWidth <= 768) {
      await navigator.share({ title: title, text: title, url: url });
      showToast('已打开系统分享', 'success');
    } else if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(url);
      showToast('素材链接已复制', 'success');
      if (button) {
        var label = button.querySelector('span') || button;
        var old = label.textContent;
        label.textContent = '已复制';
        setTimeout(function() { label.textContent = old; }, 1200);
      }
    } else {
      window.prompt('复制素材链接', url);
      showToast('素材链接已准备复制');
    }
  } catch (err) {
    if (err && err.name === 'AbortError') return;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(url);
      showToast('素材链接已复制', 'success');
    } else {
      window.prompt('复制素材链接', url);
      showToast('素材链接已准备复制');
    }
  }
}

async function shareItemFile(item, button) {
  if (!item) return;
  if (isRemoteAccessUnavailable()) {
    showToast('分享原文件需要连接远程 Vault', 'error');
    return;
  }
  if (!navigator.share || !navigator.canShare || typeof File === 'undefined') {
    showToast('当前浏览器不支持原文件系统分享，请使用下载', 'error');
    return;
  }
  var maxShareBytes = 64 * 1024 * 1024;
  if (Number(item.size || 0) > maxShareBytes) {
    showToast('原文件超过 64 MB，请使用下载或分享页面链接', 'error');
    return;
  }
  var label = button ? (button.querySelector('span') || button) : null;
  var oldLabel = label ? label.textContent : '';
  var oldDisabled = button ? button.disabled : false;
  if (button) {
    button.disabled = true;
    button.classList.add('is-loading');
  }
  if (label) label.textContent = '准备原文件…';
  try {
    var response = await fetch(buildItemFileUrl(item), { cache: 'no-store' });
    if (handleAuthResponse(response)) return;
    if (response.status === 503) throw new Error('远程 Vault 暂不可达');
    if (!response.ok) throw new Error('读取原文件失败');
    var blob = await response.blob();
    if (blob.size > maxShareBytes) throw new Error('原文件超过 64 MB，请使用下载');
    var file = new File([blob], buildItemDownloadName(item), { type: blob.type || 'application/octet-stream' });
    if (!navigator.canShare({ files: [file] })) throw new Error('当前浏览器不支持分享这种文件，请使用下载');
    await navigator.share({ files: [file], title: item.name || 'Eagle Vault 素材' });
    showToast('已交给系统分享', 'success');
    closeQuickActionSheet();
  } catch (err) {
    if (err && err.name === 'AbortError') return;
    showToast((err && err.message) || '分享原文件失败，请使用下载', 'error');
  } finally {
    if (button && button.isConnected) {
      button.disabled = oldDisabled;
      button.classList.remove('is-loading');
    }
    if (label && label.isConnected) label.textContent = oldLabel;
  }
}

function buildItemFileUrl(item) {
  return API + '/api/items/' + item.id + '/file';
}

function buildAbsoluteItemFileUrl(item) {
  return new URL(buildItemFileUrl(item), location.href).href;
}

function buildItemDownloadName(item) {
  return (item.name || 'file') + (item.ext ? '.' + item.ext : '');
}

function buildItemInfoText(item) {
  if (!item) return '';
  var rows = [
    ['Name', item.name || ''],
    ['Type', item.ext ? item.ext.toUpperCase() : ''],
    ['Dimensions', item.width && item.height ? item.width + ' × ' + item.height : ''],
    ['Size', item.size ? formatSize(item.size) : ''],
    ['Duration', item.duration ? formatMediaDuration(item.duration) : ''],
    ['BPM', item.bpm ? String(Math.round(item.bpm)) : ''],
    ['Folders', (item.folderPaths || []).join(' ; ')],
    ['Tags', (item.tags || []).join(', ')],
    ['Created', item.btime ? formatDate(item.btime) : ''],
    ['Modified', item.mtime ? formatDate(item.mtime) : ''],
    ['Source', item.url || ''],
    ['Link', buildItemShareUrl(item)]
  ].filter(function(row) { return row[1]; });
  return rows.map(function(row) { return row[0] + ': ' + row[1]; }).join('\n');
}

function escapeMarkdownText(text) {
  return String(text || '').replace(/([\\`*_{}\[\]()#+\-.!|>])/g, '\\$1');
}

function escapeHtmlAttributeText(text) {
  return String(text || '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function buildItemReferenceText(item, format) {
  if (!item) return '';
  var name = item.name || item.id || 'Eagle Vault asset';
  var shareUrl = buildItemShareUrl(item);
  var fileUrl = buildAbsoluteItemFileUrl(item);
  var source = item.url || '';
  var tags = (item.tags || []).join(', ');
  var dims = item.width && item.height ? item.width + ' × ' + item.height : '';

  if (format === 'html') {
    if (isImageExt(item.ext)) {
      var sizeAttrs = item.width && item.height ? ' width="' + item.width + '" height="' + item.height + '"' : '';
      return '<figure>\n  <img src="' + escapeHtmlAttributeText(fileUrl) + '" alt="' + escapeHtmlAttributeText(name) + '"' + sizeAttrs + ' />\n  <figcaption><a href="' + escapeHtmlAttributeText(shareUrl) + '">' + escapeHtml(name) + '</a></figcaption>\n</figure>';
    }
    return '<a href="' + escapeHtmlAttributeText(shareUrl) + '">' + escapeHtml(name) + '</a>';
  }

  if (format === 'text') {
    return [
      name,
      dims ? 'Dimensions: ' + dims : '',
      tags ? 'Tags: ' + tags : '',
      source ? 'Source: ' + source : '',
      'Viewer: ' + shareUrl,
      'File: ' + fileUrl
    ].filter(Boolean).join('\n');
  }

  var title = escapeMarkdownText(name);
  var lines = [];
  if (isImageExt(item.ext)) lines.push('![' + title + '](' + fileUrl + ')');
  else lines.push('[' + title + '](' + shareUrl + ')');
  if (dims || tags || source) {
    lines.push('');
    if (dims) lines.push('- Dimensions: ' + dims);
    if (tags) lines.push('- Tags: ' + escapeMarkdownText(tags));
    if (source) lines.push('- Source: ' + source);
    lines.push('- Viewer: ' + shareUrl);
  }
  return lines.join('\n');
}

async function copyTextToClipboard(text, title, button) {
  if (!text) return;
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text);
      showToast((title || '文本') + '已复制', 'success');
      if (button) {
        var label = button.querySelector('span') || button;
        var old = label.textContent;
        label.textContent = '已复制';
        setTimeout(function() { label.textContent = old; }, 1200);
      }
    } else {
      window.prompt(title || '复制文本', text);
      showToast((title || '文本') + '已准备复制');
    }
  } catch (err) {
    window.prompt(title || '复制文本', text);
    showToast((title || '文本') + '已准备复制');
  }
}

function copyItemInfo(item, button) {
  copyTextToClipboard(buildItemInfoText(item), '复制素材信息', button);
}

function copyItemReference(item, format, button) {
  var title = format === 'html' ? '复制 HTML 引用' : (format === 'text' ? '复制纯文本引用' : '复制 Markdown 引用');
  copyTextToClipboard(buildItemReferenceText(item, format), title, button);
}

function buildBatchLinksText(items) {
  return items.map(function(item) {
    return (item.name || item.id || 'Untitled') + '\n' + buildItemShareUrl(item);
  }).join('\n\n');
}

function buildBatchInfoText(items) {
  return items.map(function(item, idx) {
    return '# ' + (idx + 1) + ' · ' + (item.name || item.id || 'Untitled') + '\n' + buildItemInfoText(item);
  }).join('\n\n---\n\n');
}

function buildBatchReferencesText(items) {
  return items.map(function(item) {
    return buildItemReferenceText(item, 'markdown');
  }).join('\n\n');
}

function copySelectedLinks(button) {
  var items = getSelectedItems();
  if (!items.length) return;
  copyTextToClipboard(buildBatchLinksText(items), '复制素材链接', button);
}

function copySelectedInfo(button) {
  var items = getSelectedItems();
  if (!items.length) return;
  copyTextToClipboard(buildBatchInfoText(items), '复制素材信息', button);
}

function copySelectedReferences(button) {
  var items = getSelectedItems();
  if (!items.length) return;
  copyTextToClipboard(buildBatchReferencesText(items), '复制素材引用', button);
}

async function copyItemImage(id, button) {
  if (!id) return;
  if (!navigator.clipboard || typeof navigator.clipboard.write !== 'function') {
    showToast('当前环境不支持复制图片，请使用 HTTPS', 'error');
    return;
  }
  var old = button ? button.innerHTML : '';
  var url = API + '/api/items/' + id + '/file';
  try {
    var response = await fetch(url);
    var blob = await response.blob();
    var type = blob.type || 'image/png';
    if (!type.startsWith('image/')) type = 'image/png';
    await navigator.clipboard.write([new ClipboardItem({ [type]: blob })]);
    showToast('图片已复制到剪贴板', 'success');
    if (button) {
      button.innerHTML = iconCopy() + ' 已复制';
      setTimeout(function() { button.innerHTML = old; }, 1500);
    }
  } catch (err) {
    showToast('复制图片失败，请使用 HTTPS 或受支持浏览器', 'error');
  }
}

function getPrimaryItemFolder(item) {
  var folderId = ((item && item.folders) || [])[0] || '';
  if (!folderId) return null;
  var path = ((item && item.folderPaths) || [])[0] || folderId;
  var parts = String(path).split(' / ').filter(Boolean);
  return {
    id: folderId,
    label: parts.length ? parts[parts.length - 1] : path
  };
}

function openFolderAndFocus(folderId, itemId) {
  if (!folderId) return;
  if (itemId) {
    state.pendingFocusItemId = itemId;
    state.pendingFocusLoads = 0;
  }
  var search = document.getElementById('searchInput');
  if (search) search.value = '';
  clearAllActive();
  render.closeInspector();
  api.loadFolderItems(folderId).then(function() {
    if (render.syncActiveNavigationState) render.syncActiveNavigationState();
    if (render.focusPendingItemWhenLoaded) render.focusPendingItemWhenLoaded();
  });
}

function openItemFolder(item) {
  var folder = getPrimaryItemFolder(item);
  if (!folder || !folder.id) {
    showToast('这个素材没有文件夹归属', 'error');
    return;
  }
  closeQuickActionSheet();
  closeDesktopContextMenu();
  openFolderAndFocus(folder.id, item.id);
}

function isRemoteAccessUnavailable() {
  var strip = document.getElementById('remoteStatusStrip');
  return navigator.onLine === false || !!(strip && !strip.hidden && strip.dataset.state === 'offline');
}

function runItemAction(item, action, sourceEl) {
  if (!item || !action) return;
  var fileUrl = buildItemFileUrl(item);
  if (action === 'preview') {
    if (isItemPreviewable(item)) render.previewItem(item, fileUrl);
    else window.open(fileUrl, '_blank');
  } else if (action === 'inspect') {
    render.openInspector(item);
  } else if (action === 'folder') {
    openItemFolder(item);
  } else if (action === 'source') {
    var sourceDomain = getItemSourceDomain(item);
    if (!sourceDomain) {
      showToast('这个素材没有来源站点', 'error');
      return;
    }
    closeQuickActionSheet();
    closeDesktopContextMenu();
    openSourceDomainView(sourceDomain);
  } else if (action === 'select') {
    if (render.toggleSelect) render.toggleSelect(item.id);
    var selectSheet = document.getElementById('quickActionSheet');
    if (selectSheet) updateQuickActionSheetState(selectSheet, item);
    var selectMenu = document.getElementById('itemContextMenu');
    if (selectMenu) updateDesktopContextMenuState(selectMenu, item);
  } else if (action === 'share') {
    shareItemLink(item, sourceEl);
  } else if (action === 'share-file') {
    shareItemFile(item, sourceEl);
  } else if (action === 'copy') {
    copyItemImage(item.id, sourceEl);
  } else if (action === 'copy-info') {
    copyItemInfo(item, sourceEl);
  } else if (action === 'copy-md' || action === 'copy-html' || action === 'copy-ref') {
    copyItemReference(item, action === 'copy-html' ? 'html' : (action === 'copy-ref' ? 'text' : 'markdown'), sourceEl);
  } else if (action === 'download') {
    if (isRemoteAccessUnavailable()) {
      showToast('下载原文件需要连接远程 Vault', 'error');
      return;
    }
    var resetDownloadButton = null;
    if (sourceEl) {
      var oldDisabled = sourceEl.disabled;
      sourceEl.classList.add('is-loading');
      sourceEl.disabled = true;
      var label = sourceEl.querySelector('span');
      var oldLabel = label ? label.textContent : '';
      if (label) label.textContent = '开始下载';
      resetDownloadButton = function() {
        if (!sourceEl.isConnected) return;
        sourceEl.classList.remove('is-loading');
        sourceEl.disabled = oldDisabled;
        if (label && label.isConnected) label.textContent = oldLabel;
      };
    }
    var a = document.createElement('a');
    a.href = fileUrl + '?download=true';
    a.download = buildItemDownloadName(item);
    a.click();
    showToast('原文件已开始下载', 'success');
    if (resetDownloadButton) setTimeout(resetDownloadButton, 1200);
    closeQuickActionSheet();
  }
}

window._runItemAction = runItemAction;
