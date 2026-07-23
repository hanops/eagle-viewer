/* Eagle Vault Viewer — 纯手机端 PWA 逻辑
   自带轻量数据层（复用后端同一套 /api 接口），不依赖桌面端 api.js。 */
(function () {
  'use strict';

  // ---------- 元素引用 ----------
  const topbar = document.getElementById('topbar');
  const view = document.getElementById('view');
  const viewBody = document.getElementById('viewBody');
  const tabs = document.getElementById('tabs');
  const overlay = document.getElementById('preview');
  const pvImg = document.getElementById('pvImg');
  const pvIndex = document.getElementById('pvIndex');
  const pvName = document.getElementById('pvName');
  const pvMeta = document.getElementById('pvMeta');
  const pvDownload = document.getElementById('pvDownload');
  const pvClose = document.getElementById('pvClose');
  const pvShare = document.getElementById('pvShare');
  const pvStage = document.getElementById('pvStage');

  // ---------- 缩略图 IndexedDB 缓存（弱网 / 离线复用已浏览缩略图）----------
  // 仅作应用层缓存，绕开 SW 的 /api 不缓存契约；原生支持 Blob，失效以全局
  // status.revision flush，配合有界 LRU 与 indexedDB 不可用时的网络回退。
  const Thumbs = (function () {
    const DB = 'eagle-viewer-thumbs';
    const STORE = 'blobs';
    const MAX = 500;
    let dbp = null;
    function ok() { return typeof indexedDB !== 'undefined' && indexedDB; }
    function open() {
      if (!ok()) return Promise.resolve(null);
      if (dbp) return dbp;
      dbp = new Promise((resolve) => {
        const req = indexedDB.open(DB, 1);
        req.onupgradeneeded = () => {
          const db = req.result;
          if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => resolve(null);
      });
      return dbp;
    }
    function get(id) {
      return open().then((db) => {
        if (!db) return null;
        return new Promise((resolve) => {
          const tx = db.transaction(STORE, 'readonly');
          const r = tx.objectStore(STORE).get(id);
          r.onsuccess = () => { const v = r.result; resolve(v && v.blob ? v.blob : null); };
          r.onerror = () => resolve(null);
        });
      });
    }
    function put(id, blob) {
      return open().then((db) => {
        if (!db) return;
        return new Promise((resolve) => {
          const tx = db.transaction(STORE, 'readwrite');
          tx.objectStore(STORE).put({ blob: blob, ts: Date.now() }, id);
          tx.oncomplete = resolve; tx.onerror = resolve;
        });
      }).then(evict);
    }
    function clear() {
      return open().then((db) => {
        if (!db) return;
        return new Promise((resolve) => {
          const tx = db.transaction(STORE, 'readwrite');
          tx.objectStore(STORE).clear();
          tx.oncomplete = resolve; tx.onerror = resolve;
        });
      });
    }
    function evict() {
      return open().then((db) => {
        if (!db) return;
        try {
          if (navigator.storage && navigator.storage.estimate) {
            return navigator.storage.estimate().then((e) => {
              if (e.quota && e.usage / e.quota > 0.85) return clear();
            });
          }
        } catch (e) {}
        return new Promise((resolve) => {
          const out = [];
          const tx = db.transaction(STORE, 'readonly');
          const cur = tx.objectStore(STORE).openCursor();
          cur.onsuccess = () => {
            const c = cur.result;
            if (c) { out.push({ id: c.key, ts: (c.value && c.value.ts) || 0 }); c.continue(); }
            else resolve(out);
          };
          cur.onerror = () => resolve(out);
        }).then((entries) => {
          if (entries.length <= MAX) return;
          entries.sort((a, b) => a.ts - b.ts);
          const del = entries.slice(0, entries.length - MAX).map((e) => e.id);
          const tx = db.transaction(STORE, 'readwrite');
          del.forEach((id) => tx.objectStore(STORE).delete(id));
          return new Promise((res) => { tx.oncomplete = res; tx.onerror = res; });
        });
      });
    }
    return { ok: ok, get: get, put: put, clear: clear };
  })();

  function hydrateOne(img) {
    const id = img.dataset.id;
    const url = img.dataset.thumb;
    const apply = (blob) => {
      if (img.src && img.src.indexOf('blob:') === 0) URL.revokeObjectURL(img.src);
      img.src = URL.createObjectURL(blob);
    };
    Thumbs.get(id).then((hit) => {
      if (hit) { apply(hit); return; }
      fetch(url).then((r) => {
        if (!r.ok) { img.src = url; return; }
        r.blob().then((blob) => { Thumbs.put(id, blob); apply(blob); });
      }).catch(() => { img.src = url; });
    });
  }

  function hydrateThumbs(container) {
    if (window.__hio) { window.__hio.disconnect(); window.__hio = null; }
    const imgs = container.querySelectorAll('.th .im[data-thumb]');
    if (!imgs.length) return;
    if (!Thumbs.ok()) {
      imgs.forEach((img) => { if (!img.src) img.src = img.dataset.thumb; });
      return;
    }
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const img = entry.target;
        io.unobserve(img);
        if (!img.src) hydrateOne(img);
      });
    }, { root: view, rootMargin: '300px' });
    window.__hio = io;
    imgs.forEach((img) => io.observe(img));
  }

  // ---------- SVG 片段 ----------
  const chevSVG = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 6 6 6-6 6"/></svg>';
  const backSVG = '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 6-6 6 6 6"/></svg>';
  const folderSVG = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z"/></svg>';
  const searchSVG = '<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></svg>';
  const refreshSVG = '<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 1 1-3-6.7M21 4v4h-4"/></svg>';

  // ---------- 状态 ----------
  const S = {
    view: 'library',
    folderStack: [],
    folderItems: [], folderSubfolders: [], folderOffset: 0, folderHasMore: false, folderLoading: false,
    recents: [],
    searchQuery: '', searchItems: [], searchOffset: 0, searchHasMore: false, searchTotal: 0, searchElapsed: 0, searchLoading: false,
    status: null,
    currentGallery: [],
    preview: { list: [], index: 0, open: false, pushed: false },
  };

  // ---------- 数据层 ----------
  const API = {
    async json(path) {
      const res = await fetch(path, { credentials: 'same-origin' });
      if (res.status === 401) { location.href = '/login'; throw new Error('unauthorized'); }
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return res.json();
    },
    status(deep) { return API.json('/api/library/status?deep=' + (deep ? 'true' : 'false')); },
    tree() { return API.json('/api/tree'); },
    folderItems(id, offset) { return API.json('/api/folders/' + encodeURIComponent(id) + '/items?offset=' + (offset || 0) + '&limit=120'); },
    recent() { return API.json('/api/items?sort=mtime&dir=desc&limit=24'); },
    search(q, offset) { return API.json('/api/search?q=' + encodeURIComponent(q) + '&offset=' + (offset || 0) + '&limit=120'); },
    async reload() {
      const res = await fetch('/api/library/reload', { method: 'POST', credentials: 'same-origin' });
      if (res.status === 401) { location.href = '/login'; throw new Error('unauthorized'); }
      return res.json();
    },
  };

  // ---------- 工具 ----------
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }
  function thumbItem(it, idx) {
    const w = it.width || 0, h = it.height || 0;
    const ar = (w && h) ? 'aspect-ratio:' + w + '/' + h + ';' : '';
    const ext = (it.ext || '').toUpperCase();
    return '<div class="th" data-idx="' + idx + '">' +
      '<img class="im" data-id="' + esc(it.id) + '" data-thumb="/api/items/' + it.id + '/thumbnail" style="' + ar + '" alt="' + esc(it.name) + '" onerror="this.style.visibility=\'hidden\'">' +
      '<span class="ext">' + esc(ext) + '</span>' +
      '<span class="nm">' + esc(it.name) + '</span>' +
      '</div>';
  }
  function scrollTop() { view.scrollTop = 0; }
  function disconnectIO() {
    if (window.__io) { window.__io.disconnect(); window.__io = null; }
    if (window.__hio) { window.__hio.disconnect(); window.__hio = null; }
  }
  function fmtSize(b) {
    if (!b) return '';
    return b >= 1048576 ? (b / 1048576).toFixed(1) + ' MB' : Math.round(b / 1024) + ' KB';
  }

  // ---------- 顶栏 ----------
  function renderTop() {
    let html = '';
    if (S.view === 'folders') {
      if (S.folderStack.length) {
        html += '<button class="back" id="backBtn">' + backSVG + '</button>';
        html += '<div class="crumb">' + S.folderStack.map((s, i) =>
          '<span class="seg ' + (i === S.folderStack.length - 1 ? 'cur' : '') + '">' + esc(s.name) + '</span>' +
          (i < S.folderStack.length - 1 ? '<span class="sep">/</span>' : '')).join('') + '</div>';
      } else {
        html += '<h2>目录</h2>';
      }
    } else if (S.view === 'search') {
      html += '<h2>搜索</h2>';
    } else if (S.view === 'status') {
      html += '<button class="back" id="backBtn">' + backSVG + '</button><h2>连接状态</h2>';
    } else {
      html += '<h2>资源库</h2>';
    }
    topbar.innerHTML = html;
    const bb = topbar.querySelector('#backBtn');
    if (bb) bb.onclick = () => {
      if (S.view === 'status') { S.view = 'library'; setTabActive('library'); renderLibrary(); }
      else if (S.view === 'folders' && S.folderStack.length) { S.folderStack.pop(); renderFolders(); }
    };
  }

  function setTabActive(v) {
    tabs.querySelectorAll('.tb').forEach(t => t.classList.toggle('active', t.dataset.view === v));
  }

  function switchTab(v) {
    S.view = v;
    setTabActive(v);
    disconnectIO();
    if (v === 'library') renderLibrary();
    else if (v === 'folders') renderFolders();
    else if (v === 'search') renderSearch();
    scrollTop();
  }

  // ---------- 首页（LIBRARY） ----------
  async function renderLibrary() {
    renderTop();
    viewBody.innerHTML = '<div class="spinner"></div>';
    let status, recent;
    try {
      [status, recent] = await Promise.all([API.status(false), API.recent()]);
    } catch (e) { if (e.message === 'unauthorized') return; viewBody.innerHTML = '<div class="errbox">加载失败：' + esc(e.message) + '</div>'; return; }
    S.recents = recent.items || [];
    S.status = status;
    if (status.revision) {
      const saved = localStorage.getItem('ev:thumbRev');
      if (saved && saved !== status.revision) Thumbs.clear();
      localStorage.setItem('ev:thumbRev', status.revision);
    }
    const changed = !!status.changed;
    const connected = !!status.ok;
    const dotCls = !connected ? 'bad' : (changed ? 'warn' : '');
    const stats = status.stats || {};
    viewBody.innerHTML =
      '<div class="strip ' + (changed ? 'changed' : '') + '" id="strip">' +
        '<span class="dot ' + dotCls + '"></span>' +
        '<div class="meta">' +
          '<span class="nm">Eagle 资源库</span>' +
          '<span class="mono">' + (connected ? (changed ? '已连接 · 远程有变更' : 'CONNECTED') : 'DISCONNECTED') + '</span>' +
        '</div>' + chevSVG +
      '</div>' +
      '<div class="counts">' +
        '<div class="c"><b>' + (stats.items || 0) + '</b><span>ITEMS</span></div>' +
        '<div class="c"><b>' + (stats.folders || 0) + '</b><span>FOLDERS</span></div>' +
        '<div class="c"><b>' + (stats.tags || 0) + '</b><span>TAGS</span></div>' +
      '</div>' +
      '<div class="srch" id="srchEntry">' + searchSVG + '<input id="srchInput" placeholder="搜索素材、标签、标注…" /></div>' +
      '<div class="lbl">最近添加</div>' +
      '<div class="mas" id="recentMas">' + S.recents.map(thumbItem).join('') + '</div>';
    S.currentGallery = S.recents;
    bindThumbs(viewBody);
    hydrateThumbs(viewBody);
    document.getElementById('strip').onclick = () => goStatus();
    const si = document.getElementById('srchInput');
    si.addEventListener('keydown', e => { if (e.key === 'Enter') { S.searchQuery = si.value.trim(); switchTab('search'); } });
  }

  // ---------- 目录（FOLDERS） ----------
  async function renderFolders() {
    renderTop();
    disconnectIO();
    const atRoot = S.folderStack.length === 0;
    viewBody.innerHTML = '<div class="spinner"></div>';
    let subfolders = [], items = [], hasMore = false, offset = 0;
    try {
      if (atRoot) {
        const tree = await API.tree();
        subfolders = (tree.folders || []).map(f => ({ id: f.id, name: f.name, count: f.count, locked: f.locked }));
      } else {
        const data = await API.folderItems(S.folderStack[S.folderStack.length - 1].id, 0);
        subfolders = data.subfolders || [];
        items = data.items || [];
        hasMore = !!data.hasMore;
        offset = data.nextOffset || 0;
      }
    } catch (e) { if (e.message === 'unauthorized') return; viewBody.innerHTML = '<div class="errbox">加载失败：' + esc(e.message) + '</div>'; return; }
    S.folderSubfolders = subfolders;
    S.folderItems = items;
    S.folderHasMore = hasMore; S.folderOffset = offset;

    let html = '';
    if (!atRoot && subfolders.length) html += '<div class="lbl">子文件夹</div>';
    if (subfolders.length) {
      html += subfolders.map(f =>
        '<button class="fr" data-fid="' + esc(f.id) + '" data-fname="' + esc(f.name) + '">' +
          '<span class="fico">' + folderSVG + '</span>' +
          '<span class="fn">' + esc(f.name) + '</span>' +
          '<span class="ct">' + (f.count != null ? f.count : '') + '</span>' + chevSVG +
        '</button>').join('');
    } else if (atRoot) {
      html += '<div class="empty">没有文件夹</div>';
    }
    if (items.length) {
      html += '<div class="lbl">素材</div><div class="mas" id="folderMas">' + items.map(thumbItem).join('') + '</div>';
      if (hasMore) html += '<div class="sentinel" id="folderSentinel"></div>';
    }
    viewBody.innerHTML = html;

    viewBody.querySelectorAll('.fr').forEach(b => b.onclick = () => {
      S.folderStack.push({ id: b.dataset.fid, name: b.dataset.fname });
      renderFolders();
      scrollTop();
    });
    S.currentGallery = S.folderItems;
    bindThumbs(viewBody);
    hydrateThumbs(viewBody);
    if (hasMore) setupInfinite('folderSentinel', loadFolderMore);
  }

  async function loadFolderMore() {
    if (S.folderLoading || !S.folderHasMore) return;
    S.folderLoading = true;
    setListLoader(true);
    const fid = S.folderStack.length ? S.folderStack[S.folderStack.length - 1].id : null;
    let data;
    try { data = await API.folderItems(fid, S.folderOffset); }
    catch (e) { S.folderLoading = false; setListLoader(false); if (e.message === 'unauthorized') return; return; }
    S.folderItems = S.folderItems.concat(data.items || []);
    S.folderOffset = data.nextOffset || 0;
    S.folderHasMore = !!data.hasMore;
    const mas = document.getElementById('folderMas');
    if (mas) {
      mas.innerHTML = S.folderItems.map(thumbItem).join('');
      S.currentGallery = S.folderItems;
      bindThumbs(viewBody);
      hydrateThumbs(viewBody);
    }
    const old = document.getElementById('folderSentinel');
    if (S.folderHasMore) { if (!old) { const d = document.createElement('div'); d.className = 'sentinel'; d.id = 'folderSentinel'; mas.after(d); } setupInfinite('folderSentinel', loadFolderMore); }
    else if (old) old.remove();
    setListLoader(false);
    S.folderLoading = false;
  }

  // ---------- 搜索（SEARCH） ----------
  function renderSearch() {
    renderTop();
    disconnectIO();
    viewBody.innerHTML =
      '<div class="srch" style="margin-top:4px">' + searchSVG + '<input id="srchInput2" placeholder="搜索素材、标签、标注…" value="' + esc(S.searchQuery) + '" autofocus /></div>' +
      '<div class="sr-head" id="srHead"></div>' +
      '<div class="mas" id="searchMas"></div>' +
      '<div class="sentinel" id="searchSentinel" style="display:none"></div>';
    const input = document.getElementById('srchInput2');
    let t;
    input.addEventListener('input', () => {
      clearTimeout(t);
      t = setTimeout(() => { S.searchQuery = input.value.trim(); doSearch(true); }, 300);
    });
    if (S.searchQuery) doSearch(true);
    else document.getElementById('srHead').textContent = '输入关键词开始搜索';
  }

  async function doSearch(reset) {
    if (reset) { S.searchOffset = 0; S.searchItems = []; S.searchHasMore = false; }
    const q = S.searchQuery;
    const head = document.getElementById('srHead');
    const mas = document.getElementById('searchMas');
    if (!q) { if (head) head.textContent = '输入关键词开始搜索'; if (mas) mas.innerHTML = ''; return; }
    if (reset && mas) mas.innerHTML = '<div class="spinner"></div>';
    const t0 = performance.now();
    let data;
    try { data = await API.search(q, S.searchOffset); }
    catch (e) { if (e.message === 'unauthorized') return; if (head) head.textContent = '搜索失败：' + e.message; return; }
    if (reset) S.searchItems = [];
    S.searchItems = S.searchItems.concat(data.items || []);
    S.searchOffset = data.nextOffset || 0;
    S.searchHasMore = !!data.hasMore;
    S.searchTotal = data.total || 0;
    S.searchElapsed = performance.now() - t0;
    if (head) head.innerHTML = '<b>' + S.searchTotal + '</b> 个结果 · ' + (S.searchElapsed / 1000).toFixed(2) + 's';
    if (mas) mas.innerHTML = S.searchItems.map(thumbItem).join('');
    const sent = document.getElementById('searchSentinel');
    if (sent) sent.style.display = S.searchHasMore ? 'block' : 'none';
    S.currentGallery = S.searchItems;
    bindThumbs(viewBody);
    hydrateThumbs(viewBody);
    if (S.searchHasMore) setupInfinite('searchSentinel', loadSearchMore);
  }

  async function loadSearchMore() {
    if (S.searchLoading || !S.searchHasMore) return;
    S.searchLoading = true;
    setListLoader(true);
    await doSearch(false);
    setListLoader(false);
    S.searchLoading = false;
  }

  function setListLoader(on) {
    const mas = viewBody.querySelector('.mas');
    if (!mas) return;
    let row = document.getElementById('listLoader');
    if (on) {
      if (!row) { row = document.createElement('div'); row.id = 'listLoader'; row.className = 'loadrow'; row.innerHTML = '<div class="spinner"></div>'; mas.after(row); }
    } else if (row) row.remove();
  }

  function setupInfinite(sentinelId, cb) {
    const s = document.getElementById(sentinelId);
    if (!s) return;
    if (window.__io) { window.__io.disconnect(); window.__io = null; }
    window.__io = new IntersectionObserver(entries => { if (entries[0].isIntersecting) cb(); }, { root: view, rootMargin: '500px' });
    window.__io.observe(s);
  }

  // ---------- 状态页 ----------
  async function goStatus() {
    S.view = 'status';
    setTabActive('library');
    renderTop();
    disconnectIO();
    viewBody.innerHTML = '<div class="spinner"></div>';
    let st;
    try { st = await API.status(true); } catch (e) { if (e.message === 'unauthorized') return; viewBody.innerHTML = '<div class="errbox">加载失败：' + esc(e.message) + '</div>'; return; }
    S.status = st;
    const fmtTime = ms => ms ? new Date(ms).toLocaleString('zh-CN', { hour12: false }) : '—';
    const stats = st.stats || {};
    viewBody.innerHTML =
      '<div class="kv"><span class="k">连接状态</span><span class="v ' + (!st.ok ? 'bad' : (st.changed ? 'warn' : 'ok')) + '">' + (st.ok ? (st.changed ? '已连接 · 远程有变更' : '已连接') : '未连接') + '</span></div>' +
      '<div class="kv"><span class="k">已索引于</span><span class="v">' + fmtTime(st.loadedAt) + '</span></div>' +
      '<div class="kv"><span class="k">素材</span><span class="v">' + (stats.items || 0) + '</span></div>' +
      '<div class="kv"><span class="k">文件夹</span><span class="v">' + (stats.folders || 0) + '</span></div>' +
      '<div class="kv"><span class="k">标签</span><span class="v">' + (stats.tags || 0) + '</span></div>' +
      (st.changed ? '<div class="warnrow"><b>检测到远程变更</b><br>资源库自上次索引后有改动，重新加载以同步。</div>' : '') +
      '<button class="actbtn" id="reloadBtn">' + refreshSVG + ' 重新加载索引</button>';
    const btn = document.getElementById('reloadBtn');
    btn.onclick = async () => {
      btn.disabled = true; btn.textContent = '加载中…';
      try { await API.reload(); goStatus(); }
      catch (e) { if (e.message !== 'unauthorized') { btn.disabled = false; btn.textContent = '重新加载索引'; toast('重新加载失败'); } }
    };
  }

  // ---------- 缩略图点击 → 预览 ----------
  function bindThumbs(container) {
    container.querySelectorAll('.th').forEach(t => {
      t.onclick = () => openPreview(parseInt(t.dataset.idx, 10));
    });
  }

  // ---------- 预览浮层 + 手势 ----------
  const g = { mode: null, pointers: new Map(), startX: 0, startY: 0, dx: 0, dy: 0, moved: false, t0: 0, lastTap: 0, scale: 1, baseScale: 1, pinchStart: 0 };

  function openPreview(index) {
    S.preview.list = S.currentGallery;
    S.preview.index = index;
    S.preview.open = true;
    showPreviewItem();
    overlay.classList.add('show');
    overlay.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    if (!S.preview.pushed) { history.pushState({ pv: 1 }, ''); S.preview.pushed = true; }
  }
  function closePreviewVisual() {
    S.preview.open = false;
    S.preview.pushed = false;
    overlay.classList.remove('show', 'immersive');
    overlay.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    pvImg.style.transform = '';
    overlay.style.background = '#000';
    g.scale = 1;
  }
  function closePreview() {
    if (!S.preview.open) return;
    closePreviewVisual();
    history.back();
  }
  function showPreviewItem() {
    const list = S.preview.list, i = S.preview.index, it = list[i];
    if (!it) return;
    g.scale = 1;
    pvIndex.textContent = (i + 1) + ' / ' + list.length;
    pvImg.src = '/api/items/' + it.id + '/file';
    pvImg.style.transition = '';
    pvImg.style.transform = g.scale > 1 ? 'scale(' + g.scale + ')' : '';
    pvName.textContent = it.name || '';
    const dims = (it.width && it.height) ? it.width + '×' + it.height + ' · ' : '';
    const sz = fmtSize(it.size);
    pvMeta.textContent = dims + (it.ext || '').toUpperCase() + (sz ? ' · ' + sz : '');
    pvDownload.href = '/api/items/' + it.id + '/file?download=true';
    updatePeeks();
  }
  function showPreviewItemAnimated(dir) {
    pvImg.style.transition = 'transform .18s ease';
    pvImg.style.transform = 'translateX(' + (dir === 'next' ? '-100%' : '100%') + ')';
    setTimeout(showPreviewItem, 170);
  }
  function updatePeeks() {
    const list = S.preview.list, i = S.preview.index;
    const prev = list[i - 1], next = list[i + 1];
    let peeks = pvStage.querySelectorAll('.pv-peek');
    peeks.forEach(p => p.remove());
    if (prev) { const d = document.createElement('div'); d.className = 'pv-peek l'; d.style.backgroundImage = 'url(/api/items/' + prev.id + '/thumbnail)'; pvStage.insertBefore(d, pvImg); }
    if (next) { const d = document.createElement('div'); d.className = 'pv-peek r'; d.style.backgroundImage = 'url(/api/items/' + next.id + '/thumbnail)'; pvStage.insertBefore(d, pvImg); }
  }
  function applyTransform() { pvImg.style.transform = g.scale > 1 ? 'scale(' + g.scale + ')' : ''; }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function dist(a, b) { return Math.hypot(a.x - b.x, a.y - b.y); }

  pvStage.addEventListener('pointerdown', e => {
    pvStage.setPointerCapture(e.pointerId);
    g.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (g.pointers.size === 2) {
      const p = [...g.pointers.values()];
      g.pinchStart = dist(p[0], p[1]); g.baseScale = g.scale; g.mode = 'pinch';
    } else if (g.pointers.size === 1) {
      g.mode = null; g.startX = e.clientX; g.startY = e.clientY; g.dx = 0; g.dy = 0; g.moved = false; g.t0 = Date.now();
    }
  });
  pvStage.addEventListener('pointermove', e => {
    if (!g.pointers.has(e.pointerId)) return;
    g.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (g.mode === 'pinch' && g.pointers.size >= 2) {
      const p = [...g.pointers.values()];
      g.scale = clamp(g.baseScale * (dist(p[0], p[1]) / g.pinchStart), 1, 4);
      applyTransform();
      return;
    }
    if (g.pointers.size !== 1) return;
    const dx = e.clientX - g.startX, dy = e.clientY - g.startY;
    g.dx = dx; g.dy = dy;
    if (Math.abs(dx) > 6 || Math.abs(dy) > 6) g.moved = true;
    if (!g.mode) {
      if (Math.abs(dy) > Math.abs(dx) && Math.abs(dy) > 10) g.mode = 'dismiss';
      else if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 10) g.mode = 'switch';
    }
    if (g.mode === 'dismiss') {
      const t = clamp(1 - Math.abs(dy) / (window.innerHeight * 1.1), 0.4, 1);
      pvImg.style.transition = 'none';
      pvImg.style.transform = 'translateY(' + dy + 'px) scale(' + t + ')';
      overlay.style.background = 'rgba(0,0,0,' + (0.92 * t) + ')';
    } else if (g.mode === 'switch') {
      pvImg.style.transition = 'none';
      pvImg.style.transform = 'translateX(' + dx + 'px)';
    }
  });
  function endPointer(e) {
    if (!g.pointers.has(e.pointerId)) return;
    g.pointers.delete(e.pointerId);
    if (g.mode === 'pinch') {
      if (g.pointers.size === 1) { const p = [...g.pointers.values()][0]; g.startX = p.x; g.startY = p.y; g.mode = g.scale > 1 ? null : 'switch'; }
      else if (g.pointers.size === 0) g.mode = null;
      return;
    }
    pvImg.style.transition = '';
    const elapsed = Date.now() - g.t0;
    if (g.mode === 'dismiss') {
      if (Math.abs(g.dy) > window.innerHeight * 0.25 || (Math.abs(g.dy) > 60 && elapsed < 250)) closePreview();
      else { pvImg.style.transform = ''; overlay.style.background = '#000'; }
    } else if (g.mode === 'switch') {
      if (g.dx < -window.innerWidth * 0.22 && S.preview.index < S.preview.list.length - 1) { S.preview.index++; showPreviewItemAnimated('next'); }
      else if (g.dx > window.innerWidth * 0.22 && S.preview.index > 0) { S.preview.index--; showPreviewItemAnimated('prev'); }
      else pvImg.style.transform = '';
    } else if (!g.moved && elapsed < 300) {
      const now = Date.now();
      if (now - g.lastTap < 280) { g.scale = g.scale > 1 ? 1 : 2; applyTransform(); }
      else { g.lastTap = now; overlay.classList.toggle('immersive'); }
    }
    g.mode = null;
  }
  pvStage.addEventListener('pointerup', endPointer);
  pvStage.addEventListener('pointercancel', endPointer);

  pvClose.onclick = closePreview;
  pvDownload.onclick = () => { /* 浏览器原生下载，无需额外处理 */ };
  pvShare.onclick = async () => {
    const it = S.preview.list[S.preview.index];
    if (!it) return;
    const url = location.origin + '/api/items/' + it.id + '/file';
    if (navigator.share) { try { await navigator.share({ title: it.name, url }); } catch (e) {} }
    else { try { await navigator.clipboard.writeText(url); toast('链接已复制'); } catch (e) { toast('分享不可用'); } }
  };

  // ---------- toast ----------
  let toastTimer;
  function toast(msg) {
    let t = document.getElementById('toast');
    if (!t) { t = document.createElement('div'); t.id = 'toast'; t.style.cssText = 'position:fixed;left:50%;bottom:90px;transform:translateX(-50%);background:rgba(0,0,0,.8);color:#fff;padding:8px 14px;border-radius:10px;font-size:12px;z-index:200;pointer-events:none;opacity:0;transition:opacity .2s;'; document.body.appendChild(t); }
    t.textContent = msg; t.style.opacity = '1';
    clearTimeout(toastTimer); toastTimer = setTimeout(() => { t.style.opacity = '0'; }, 1600);
  }

  // ---------- 系统返回手势统一关闭预览 ----------
  window.addEventListener('popstate', () => { if (S.preview.open) closePreviewVisual(); });

  // ---------- Tab 切换 ----------
  tabs.addEventListener('click', e => { const b = e.target.closest('.tb'); if (b) switchTab(b.dataset.view); });

  // ---------- 启动 ----------
  switchTab('library');

  // PWA：注册 service worker（若存在）
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    });
  }
})();
