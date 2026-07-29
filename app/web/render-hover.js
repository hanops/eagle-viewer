'use strict';

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
