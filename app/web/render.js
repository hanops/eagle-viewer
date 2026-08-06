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
  var row = document.createElement('button');
  row.type = 'button';
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
