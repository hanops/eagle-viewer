'use strict';

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
