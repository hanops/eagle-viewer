/* Eagle Vault Viewer — 纯手机端 PWA 逻辑
   自带轻量数据层（复用后端同一套 /api 接口），不依赖桌面端 api.js。
   --app-h 由 mobile.html <head> 内联脚本在首帧前设置。 */
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
  const pvSave = document.getElementById('pvSave');
  const pvClose = document.getElementById('pvClose');
  const pvPrev = document.getElementById('pvPrev');
  const pvNext = document.getElementById('pvNext');
  const pvShare = document.getElementById('pvShare');
  const pvStage = document.getElementById('pvStage');

  // ---------- 中英文 ----------
  const COPY = {
    zh: {
      library: '资源库', folders: '目录', search: '搜索', status: '连接状态',
      tabLibrary: '资料库', tabFolders: '文件夹', tabSearch: '搜索',
      close: '关闭', share: '分享', back: '返回', download: '下载', saveAlbum: '保存相册',
      loadFailed: '加载失败：{error}', connectedChanged: '已连接 · 远程有变更',
      connected: '已连接', disconnected: '未连接', statusUnknown: '连接状态未知', vault: 'Eagle 资源库',
      items: '素材', foldersLabel: '文件夹', tags: '标签',
      searchPlaceholder: '搜索名称、标签或备注…', recent: '最近添加',
      locked: '该文件夹被 Eagle 锁定，无法在远程查看',
      subfolders: '子文件夹', noFolders: '没有文件夹',
      searchStart: '输入关键词开始搜索', searchFailed: '搜索失败：{error}',
      popularTags: '热门标签',
      results: '{count} 个结果 · {seconds}s', indexedAt: '已索引于',
      remoteChangedTitle: '检测到远程变更',
      remoteChangedBody: '资源库自上次索引后有改动，重新加载以同步。',
      reload: '重新加载索引', loading: '加载中…', reloadFailed: '重新加载失败',
      downloaded: '已下载到「文件」，可在相册中查看', saveFailed: '保存失败', unsupportedPreview: '此格式不支持在线预览，请下载后打开', videoUnavailable: '当前视频无法在此设备上播放，请下载查看',
      previous: '上一个', next: '下一个',
      copied: '链接已复制', shareUnavailable: '分享不可用', language: 'English',
      lightTheme: '切换到浅色', darkTheme: '切换到深色'
    },
    en: {
      library: 'Library', folders: 'Folders', search: 'Search', status: 'Connection',
      tabLibrary: 'Library', tabFolders: 'Folders', tabSearch: 'Search',
      close: 'Close', share: 'Share', back: 'Back', download: 'Download', saveAlbum: 'Save to Photos',
      loadFailed: 'Could not load: {error}', connectedChanged: 'Connected · Remote changes',
      connected: 'Connected', disconnected: 'Disconnected', statusUnknown: 'Connection unknown', vault: 'Eagle Vault',
      items: 'Items', foldersLabel: 'Folders', tags: 'Tags',
      searchPlaceholder: 'Search name, tags, or notes…', recent: 'Recently added',
      locked: 'This folder is locked in Eagle and cannot be viewed remotely.',
      subfolders: 'Subfolders', noFolders: 'No folders',
      searchStart: 'Enter a keyword to search', searchFailed: 'Search failed: {error}',
      popularTags: 'Popular tags',
      results: '{count} results · {seconds}s', indexedAt: 'Indexed at',
      remoteChangedTitle: 'Remote changes detected',
      remoteChangedBody: 'The Vault changed after the last index. Reload to sync it.',
      reload: 'Reload index', loading: 'Loading…', reloadFailed: 'Reload failed',
      downloaded: 'Downloaded to Files. You can open it in Photos.', unsupportedPreview: 'This format cannot be previewed here. Download it to open.', videoUnavailable: 'This video cannot play on this device. Download it to view.',
      previous: 'Previous', next: 'Next',
      saveFailed: 'Could not save', copied: 'Link copied',
      shareUnavailable: 'Sharing is unavailable', language: '中文',
      lightTheme: 'Use light theme', darkTheme: 'Use dark theme'
    }
  };
  let lang = 'zh';
  try {
    const saved = localStorage.getItem('eagle-viewer-lang');
    lang = saved === 'en' || saved === 'zh' ? saved : (/^en\b/i.test(navigator.language || '') ? 'en' : 'zh');
  } catch (e) {}

  function tr(key, values) {
    let text = (COPY[lang] && COPY[lang][key]) || COPY.zh[key] || key;
    Object.keys(values || {}).forEach(k => { text = text.replace('{' + k + '}', values[k]); });
    return text;
  }

  function applyLanguage() {
    document.documentElement.lang = lang === 'en' ? 'en' : 'zh-CN';
    document.getElementById('tabLibrary').textContent = tr('tabLibrary');
    document.getElementById('tabFolders').textContent = tr('tabFolders');
    document.getElementById('tabSearch').textContent = tr('tabSearch');
    document.getElementById('pvDownloadLabel').textContent = tr('download');
    document.getElementById('pvSaveLabel').textContent = tr('saveAlbum');
    pvClose.setAttribute('aria-label', tr('close'));
    pvShare.setAttribute('aria-label', tr('share'));
    document.getElementById('pvPrev').setAttribute('aria-label', tr('previous'));
    document.getElementById('pvNext').setAttribute('aria-label', tr('next'));
  }

  // ---------- 跟随桌面端主题选择，并允许手机端独立切换明暗 ----------
  // 桌面端把 light/dark 存进 localStorage['eagle-viewer-theme']，
  // 这里复用同一把钥匙，让手机端配色与桌面端保持一致（无选择时沿用系统偏好）。
  function applyMobileTheme(name) {
    try {
      // Migrate legacy keys
      if (name === 'gallery') name = 'light';
      if (name === 'workbench' || name === 'carbon') name = 'dark';
      var map = {
        light: { theme: 'light', accent: 'blue' },
        dark:  { theme: 'dark',  accent: 'blue'  }
      };
      var t = map[name];
      if (!t) return;
      var root = document.documentElement;
      root.setAttribute('data-theme', t.theme);
      root.setAttribute('data-accent', t.accent);
      root.style.colorScheme = t.theme;
      var themeMeta = document.querySelector('meta[name="theme-color"]');
      if (themeMeta) themeMeta.content = t.theme === 'light' ? '#f2f2f7' : '#000000';
      localStorage.setItem('eagle-viewer-theme', name);
    } catch (e) {}
  }
  (function syncTheme() {
    try {
      var name = localStorage.getItem('eagle-viewer-theme');
      if (name) applyMobileTheme(name);
    } catch (e) {}
  })();

  function toggleMobileTheme() {
    var isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    applyMobileTheme(isDark ? 'light' : 'dark');
    renderTop();
  }

  // ---------- 缩略图 IndexedDB 缓存（弱网 / 离线复用已浏览缩略图）----------
  // 仅作应用层缓存，绕开 SW 的 /api 不缓存契约；原生支持 Blob，失效以全局
  // status.revision flush，配合有界 LRU 与 indexedDB 不可用时的网络回退。
  const Thumbs = (function () {
    const DB = 'eagle-viewer-thumbs';
    const STORE = 'blobs';
    const MAX = 500;
    let dbp = null;
    let evictTimer = null;
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
      }).then(() => {
        if (evictTimer) return;
        evictTimer = setTimeout(() => { evictTimer = null; evict(); }, 750);
      });
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
  const lockSVG = '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>';

  // ---------- 状态 ----------
  const S = {
    view: 'library',
    folderStack: [],
    folderItems: [], folderSubfolders: [], folderOffset: 0, folderHasMore: false, folderLoading: false,
    recents: [],
    searchQuery: '', searchItems: [], searchOffset: 0, searchHasMore: false, searchTotal: 0, searchElapsed: 0, searchLoading: false,
    viewGeneration: 0, folderRequest: 0, searchRequest: 0,
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
    const imageExt = /^(PNG|JPG|JPEG|GIF|WEBP|AVIF|BMP|SVG|HEIC|HEIF)$/.test(ext);
    const showPreview = !!it.hasThumbnail || imageExt;
    const media = showPreview
      ? '<img class="im" data-id="' + esc(it.id) + '" data-thumb="/api/items/' + it.id + '/thumbnail" style="' + ar + '" alt="' + esc(it.name) + '" onerror="this.classList.add(\'is-missing\')">'
      : '<div class="mobile-file-tile"><i></i><i></i><i></i></div>';
    const previewable = imageExt || isVideoExt(ext) || normExt(ext) === 'pdf';
    return '<button type="button" class="th' + (previewable ? '' : ' is-download-only') + '" data-idx="' + idx + '" data-previewable="' + previewable + '" data-kind="' + (imageExt ? 'image' : 'file') + '" data-ext="' + esc(ext.toLowerCase()) + '">' +
      media +
      '<span class="ext">' + esc(ext) + '</span>' +
      '<span class="nm">' + esc(it.name) + '</span>' +
      '</button>';
  }
  function scrollTop() { view.scrollTop = 0; topbar.classList.remove('top-collapsed'); }
  function disconnectIO() {
    if (window.__io) { window.__io.disconnect(); window.__io = null; }
    if (window.__hio) { window.__hio.disconnect(); window.__hio = null; }
  }
  function releaseThumbObjectUrls(container) {
    if (!container) return;
    container.querySelectorAll('img').forEach(img => {
      if (img.src && img.src.indexOf('blob:') === 0) URL.revokeObjectURL(img.src);
    });
  }
  function fmtSize(b) {
    if (!b) return '';
    return b >= 1048576 ? (b / 1048576).toFixed(1) + ' MB' : Math.round(b / 1024) + ' KB';
  }

  // ---------- 顶栏 ----------
  // 紧凑标题 .ctitle 默认隐藏，内容滚动后由 scroll 监听淡入（与大标题交叉过渡）。
  // 大标题 .lt 由各渲染函数放进内容区顶部，随滚动上移——这是 iOS 标志性交互。
  function renderTop() {
    let title = '';
    let showBack = false;
    if (S.view === 'folders') {
      if (S.folderStack.length) showBack = true;      // 子文件夹：面包屑，无标题
      else title = tr('folders');                      // 根：大标题
    } else if (S.view === 'status') {
      showBack = true; title = tr('status');
    } else if (S.view === 'search') {
      title = tr('search');                            // 搜索改为根 Tab，不再有返回键
    } else {
      title = tr('vault');
    }

    let html = '';
    if (showBack) html += '<button class="back" id="backBtn" aria-label="' + esc(tr('back')) + '" title="' + esc(tr('back')) + '">' + backSVG + '</button>';
    if (S.view === 'folders' && S.folderStack.length) {
      html += '<div class="crumb">' + S.folderStack.map((s, i) =>
        '<span class="seg ' + (i === S.folderStack.length - 1 ? 'cur' : '') + '">' + esc(s.name) + '</span>' +
        (i < S.folderStack.length - 1 ? '<span class="sep">/</span>' : '')).join('') + '</div>';
    } else if (title) {
      if (S.view === 'library') {
        const statusClass = !S.status ? 'unknown' : (!S.status.ok ? 'offline' : (S.status.changed ? 'changed' : 'online'));
        const statusLabel = !S.status ? tr('statusUnknown') : (!S.status.ok ? tr('disconnected') : (S.status.changed ? tr('connectedChanged') : tr('connected')));
        html += '<button type="button" class="mobile-brand ' + statusClass + '" id="mobileBrandBtn" aria-label="' + esc(statusLabel) + '">' +
          '<span class="mobile-brand-mark" aria-hidden="true"><svg viewBox="0 0 28 28" focusable="false"><rect class="ev-tile" x="1.5" y="1.5" width="25" height="25" rx="8"/><path d="M8 18.6 13.4 10 16.6 14.4 19 11.4 20.5 18.6Z" fill="#fff" fill-opacity="0.95"/></svg></span>' +
          '<span class="mobile-brand-copy"><strong>Eagle</strong><span>' + esc(tr('library')) + '</span></span>' +
          '<i class="mobile-brand-status" aria-hidden="true"></i>' +
        '</button>';
      } else {
        html += '<span class="ctitle">' + esc(title) + '</span>';
      }
    }

    var isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    var themeLabel = isDark ? tr('lightTheme') : tr('darkTheme');
    var themeIcon = isDark
      ? '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>'
      : '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20.4 14.1A8.5 8.5 0 0 1 9.9 3.6 8.5 8.5 0 1 0 20.4 14.1Z"/></svg>';
    html += '<span class="top-spacer"></span><button class="theme" id="themeBtn" aria-label="' + esc(themeLabel) + '" title="' + esc(themeLabel) + '">' + themeIcon + '</button><button class="lang" id="langBtn" aria-label="' + esc(tr('language')) + '">' + esc(tr('language')) + '</button>';
    topbar.innerHTML = html;
    const bb = topbar.querySelector('#backBtn');
    if (bb) bb.onclick = () => {
      if (S.view === 'status') { S.view = 'library'; setTabActive('library'); renderLibrary(); }
      else if (S.view === 'folders' && S.folderStack.length) { S.folderStack.pop(); renderFolders(); }
    };
    topbar.querySelector('#themeBtn').onclick = toggleMobileTheme;
    const brand = topbar.querySelector('#mobileBrandBtn');
    if (brand) brand.onclick = goStatus;
    topbar.querySelector('#langBtn').onclick = () => {
      lang = lang === 'zh' ? 'en' : 'zh';
      try { localStorage.setItem('eagle-viewer-lang', lang); } catch (e) {}
      applyLanguage();
      if (S.view === 'folders') renderFolders();
      else if (S.view === 'search') renderSearch();
      else if (S.view === 'status') goStatus();
      else renderLibrary();
    };
    // 新视图从顶部开始，收回紧凑标题
    topbar.classList.remove('top-collapsed');
  }

  function setTabActive(v) {
    tabs.querySelectorAll('.tb').forEach(t => t.classList.toggle('active', t.dataset.view === v));
  }

  tabs.addEventListener('pointerdown', (event) => {
    const button = event.target.closest('.tb');
    if (button) button.classList.add('pointer-focus');
  });
  tabs.addEventListener('keydown', (event) => {
    if (event.key === 'Tab') tabs.querySelectorAll('.tb').forEach(t => t.classList.remove('pointer-focus'));
  });

  function switchTab(v) {
    S.viewGeneration++;
    S.view = v;
    setTabActive(v);
    disconnectIO();
    if (v === 'library') renderLibrary(S.viewGeneration);
    else if (v === 'folders') renderFolders(S.viewGeneration);
    else if (v === 'search') renderSearch();
    scrollTop();
  }

  // ---------- 首页（LIBRARY） ----------
  async function renderLibrary(token = S.viewGeneration) {
    renderTop();
    releaseThumbObjectUrls(viewBody);
    viewBody.innerHTML = '<div class="spinner"></div>';
    const results = await Promise.allSettled([API.status(false), API.recent()]);
    if (token !== S.viewGeneration || S.view !== 'library') return;
    const status = results[0].status === 'fulfilled' ? results[0].value : null;
    const recent = results[1].status === 'fulfilled' ? results[1].value : null;
    if (!recent) {
      const error = results[1].reason;
      if (error && error.message === 'unauthorized') return;
      viewBody.innerHTML = '<div class="errbox">' + esc(tr('loadFailed', { error: error && error.message })) + '</div>';
      return;
    }
    S.recents = recent.items || [];
    S.status = status;
    if (status && status.revision) {
      const saved = localStorage.getItem('ev:thumbRev');
      if (saved && saved !== status.revision) Thumbs.clear();
      localStorage.setItem('ev:thumbRev', status.revision);
    }
    renderTop();
    viewBody.innerHTML =
      '<div class="srch library-search" id="srchEntry">' + searchSVG + '<input id="srchInput" placeholder="' + esc(tr('searchPlaceholder')) + '" /></div>' +
      '<div class="lbl">' + tr('recent') + '</div>' +
      '<div class="mas" id="recentMas">' + S.recents.map(thumbItem).join('') + '</div>';
    S.currentGallery = S.recents;
    bindThumbs(viewBody);
    hydrateThumbs(viewBody);
    const si = document.getElementById('srchInput');
    si.addEventListener('keydown', e => { if (e.key === 'Enter') { S.searchQuery = si.value.trim(); switchTab('search'); } });
  }

  // ---------- 目录（FOLDERS） ----------
  async function renderFolders(token = S.viewGeneration) {
    const requestId = ++S.folderRequest;
    const folderKey = S.folderStack.map(item => item.id).join('/');
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
    } catch (e) {
      if (token !== S.viewGeneration || S.view !== 'folders' || requestId !== S.folderRequest || folderKey !== S.folderStack.map(item => item.id).join('/')) return;
      if (e.message === 'unauthorized') return;
      const msg = e.message === 'HTTP 423' ? tr('locked') : tr('loadFailed', { error: e.message });
      viewBody.innerHTML = '<div class="errbox">' + msg + '</div>';
      return;
    }
    if (token !== S.viewGeneration || S.view !== 'folders' || requestId !== S.folderRequest || folderKey !== S.folderStack.map(item => item.id).join('/')) return;
    S.folderSubfolders = subfolders;
    S.folderItems = items;
    S.folderHasMore = hasMore; S.folderOffset = offset;

    let html = '';
    if (atRoot) {
      html += '<div class="lt">' + esc(tr('folders')) + '</div>';
    }
    if (subfolders.length) {
      const rows = subfolders.map(f =>
        '<button class="fr' + (f.locked ? ' locked' : '') + '" data-fid="' + esc(f.id) + '" data-fname="' + esc(f.name) + '"' + (f.locked ? ' data-locked="1"' : '') + '>' +
          '<span class="fico">' + folderSVG + '</span>' +
          '<span class="fn">' + esc(f.name) + '</span>' +
          '<span class="ct">' + (f.locked ? lockSVG : (f.count != null ? f.count : '')) + '</span>' + chevSVG +
        '</button>').join('');
      if (!atRoot) html += '<div class="lbl">' + tr('subfolders') + '</div>';
      html += '<div class="card">' + rows + '</div>';
    } else if (atRoot) {
      html += '<div class="empty">' + tr('noFolders') + '</div>';
    }
    if (items.length) {
      html += '<div class="lbl">' + tr('items') + '</div><div class="mas" id="folderMas">' + items.map(thumbItem).join('') + '</div>';
      if (hasMore) html += '<div class="sentinel" id="folderSentinel"></div>';
    }
    releaseThumbObjectUrls(viewBody);
    viewBody.innerHTML = html;

    viewBody.querySelectorAll('.fr').forEach(b => b.onclick = () => {
      if (b.dataset.locked) { toast(tr('locked')); return; }
      S.folderStack.push({ id: b.dataset.fid, name: b.dataset.fname });
      renderFolders(S.viewGeneration);
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
    const requestId = S.folderRequest;
    const folderKey = S.folderStack.map(item => item.id).join('/');
    let data;
    try { data = await API.folderItems(fid, S.folderOffset); }
    catch (e) {
      S.folderLoading = false;
      setListLoader(false);
      if (requestId !== S.folderRequest || folderKey !== S.folderStack.map(item => item.id).join('/') || S.view !== 'folders') return;
      if (e.message === 'unauthorized') return;
      return;
    }
    if (requestId !== S.folderRequest || folderKey !== S.folderStack.map(item => item.id).join('/') || S.view !== 'folders') {
      S.folderLoading = false;
      setListLoader(false);
      return;
    }
    const previousLength = S.folderItems.length;
    const newItems = data.items || [];
    S.folderItems = S.folderItems.concat(newItems);
    S.folderOffset = data.nextOffset || 0;
    S.folderHasMore = !!data.hasMore;
    const mas = document.getElementById('folderMas');
    if (mas) {
      mas.insertAdjacentHTML('beforeend', newItems.map((item, index) => thumbItem(item, previousLength + index)).join(''));
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
    releaseThumbObjectUrls(viewBody);
    viewBody.innerHTML =
      '<div class="search-page">' +
      '<div class="srch search-field">' + searchSVG + '<input id="srchInput2" placeholder="' + esc(tr('searchPlaceholder')) + '" value="' + esc(S.searchQuery) + '" autofocus /></div>' +
      '<div class="sr-head" id="srHead"></div>' +
      '<div class="search-results" id="searchMas"></div>' +
      '<div class="sentinel" id="searchSentinel" style="display:none"></div>' +
      '</div>';
    const input = document.getElementById('srchInput2');
    let t;
    input.addEventListener('input', () => {
      clearTimeout(t);
      t = setTimeout(() => { S.searchQuery = input.value.trim(); doSearch(true); }, 300);
    });
    document.getElementById('searchMas').addEventListener('click', e => {
      const chip = e.target.closest('[data-tag]');
      if (!chip) return;
      input.value = chip.dataset.tag;
      S.searchQuery = chip.dataset.tag;
      doSearch(true);
    });
    if (S.searchQuery) doSearch(true);
    else { document.getElementById('srHead').textContent = tr('searchStart'); renderPopularTags(); }
  }

  async function renderPopularTags() {
    const mas = document.getElementById('searchMas');
    if (!mas || S.view !== 'search' || S.searchQuery) return;
    let tags = [];
    try { tags = ((await API.json('/api/tags')).tags || []).slice(0, 8); }
    catch (e) { return; }
    if (!tags.length || S.view !== 'search' || S.searchQuery) return;
    mas.innerHTML =
      '<section class="popular-tags"><div class="pt-head">' + esc(tr('popularTags')) + '</div>' +
      '<div class="pt-row">' +
      tags.map(t => '<button class="pt-chip" data-tag="' + esc(t.name) + '">#' + esc(t.name) + '</button>').join('') +
      '</div></section>';
  }

  async function doSearch(reset) {
    const requestId = ++S.searchRequest;
    if (reset) { S.searchOffset = 0; S.searchItems = []; S.searchHasMore = false; S.searchLoading = false; }
    const q = S.searchQuery;
    const head = document.getElementById('srHead');
    const mas = document.getElementById('searchMas');
    if (!q) { if (head) head.textContent = tr('searchStart'); if (mas) { releaseThumbObjectUrls(mas); mas.classList.remove('mas'); mas.innerHTML = ''; } renderPopularTags(); return; }
    if (mas) mas.classList.add('mas');
    if (reset && mas) mas.innerHTML = '<div class="spinner"></div>';
    const t0 = performance.now();
    let data;
    const offset = S.searchOffset;
    try { data = await API.search(q, offset); }
    catch (e) {
      if (requestId !== S.searchRequest || q !== S.searchQuery || S.view !== 'search') return;
      if (e.message === 'unauthorized') return;
      if (head) head.textContent = tr('searchFailed', { error: e.message });
      return;
    }
    if (requestId !== S.searchRequest || q !== S.searchQuery || S.view !== 'search' || (!reset && offset !== S.searchOffset)) return;
    const previousLength = S.searchItems.length;
    if (reset) S.searchItems = [];
    const newItems = data.items || [];
    S.searchItems = S.searchItems.concat(newItems);
    S.searchOffset = data.nextOffset || 0;
    S.searchHasMore = !!data.hasMore;
    S.searchTotal = data.total || 0;
    S.searchElapsed = performance.now() - t0;
    if (head) head.innerHTML = tr('results', { count: '<b>' + S.searchTotal + '</b>', seconds: (S.searchElapsed / 1000).toFixed(2) });
    if (mas) {
      if (reset) mas.innerHTML = newItems.map((item, index) => thumbItem(item, index)).join('');
      else mas.insertAdjacentHTML('beforeend', newItems.map((item, index) => thumbItem(item, previousLength + index)).join(''));
    }
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
    const token = ++S.viewGeneration;
    S.view = 'status';
    setTabActive('library');
    renderTop();
    disconnectIO();
    viewBody.innerHTML = '<div class="spinner"></div>';
    let st;
    try { st = await API.status(true); } catch (e) { if (e.message === 'unauthorized') return; if (token === S.viewGeneration && S.view === 'status') viewBody.innerHTML = '<div class="errbox">' + esc(tr('loadFailed', { error: e.message })) + '</div>'; return; }
    if (token !== S.viewGeneration || S.view !== 'status') return;
    S.status = st;
    view.scrollTop = 0;
    const fmtTime = ms => ms ? new Date(ms).toLocaleString(lang === 'en' ? 'en-US' : 'zh-CN', { hour12: false }) : '—';
    const stats = st.stats || {};
    viewBody.innerHTML =
      '<div class="lt">' + esc(tr('status')) + '</div>' +
      '<div class="card">' +
      '<div class="kv"><span class="k">' + tr('status') + '</span><span class="v ' + (!st.ok ? 'bad' : (st.changed ? 'warn' : 'ok')) + '">' + (st.ok ? (st.changed ? tr('connectedChanged') : tr('connected')) : tr('disconnected')) + '</span></div>' +
      '<div class="kv"><span class="k">' + tr('indexedAt') + '</span><span class="v">' + fmtTime(st.loadedAt) + '</span></div>' +
      '<div class="kv"><span class="k">' + tr('items') + '</span><span class="v">' + (stats.items || 0) + '</span></div>' +
      '<div class="kv"><span class="k">' + tr('foldersLabel') + '</span><span class="v">' + (stats.folders || 0) + '</span></div>' +
      '<div class="kv"><span class="k">' + tr('tags') + '</span><span class="v">' + (stats.tags || 0) + '</span></div>' +
      '</div>' +
      (st.changed ? '<div class="warnrow"><b>' + tr('remoteChangedTitle') + '</b><br>' + tr('remoteChangedBody') + '</div>' : '') +
      '<button class="actbtn" id="reloadBtn">' + refreshSVG + ' ' + tr('reload') + '</button>';
    const btn = document.getElementById('reloadBtn');
    btn.onclick = async () => {
      btn.disabled = true; btn.textContent = tr('loading');
      try { await API.reload(); goStatus(); }
      catch (e) { if (e.message !== 'unauthorized') { btn.disabled = false; btn.textContent = tr('reload'); toast(tr('reloadFailed')); } }
    };
  }

  // ---------- 缩略图点击 → 预览 ----------
  function bindThumbs(container) {
    container.querySelectorAll('.th:not([data-bound])').forEach(t => {
      t.dataset.bound = '1';
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
    document.documentElement.classList.add('pv-open');
    document.body.style.overflow = 'hidden';
    if (!S.preview.pushed) { history.pushState({ pv: 1 }, ''); S.preview.pushed = true; }
  }
  function closePreviewVisual() {
    S.preview.open = false;
    S.preview.pushed = false;
    overlay.classList.remove('show', 'immersive');
    overlay.setAttribute('aria-hidden', 'true');
    document.documentElement.classList.remove('pv-open');
    document.body.style.overflow = '';
    clearPreviewMedia();
    pvImg.onerror = null;
    pvImg.src = '';
    pvImg.style.display = '';
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
    const ext = normExt(it.ext);
    const mediaUrl = '/api/items/' + it.id + '/file';
    const image = isImageExt(ext);
    const video = isVideoExt(ext);
    const pdf = ext === 'pdf';
    clearPreviewMedia();
    pvImg.style.display = image ? '' : 'none';
    if (!image && !video && !pdf) {
      showPreviewUnavailable(tr('unsupportedPreview'));
    } else if (image) {
      pvImg.src = mediaUrl;
      pvImg.onerror = () => showPreviewUnavailable(tr('unsupportedPreview'));
    } else if (video) {
      const player = document.createElement('video');
      player.className = 'pv-media pv-video';
      player.controls = true;
      player.playsInline = true;
      player.preload = 'metadata';
      player.addEventListener('error', () => showPreviewUnavailable(tr('videoUnavailable')), { once: true });
      player.src = mediaUrl;
      pvStage.appendChild(player);
    } else if (pdf) {
      const frame = document.createElement('iframe');
      frame.className = 'pv-media pv-pdf';
      frame.src = mediaUrl;
      frame.title = it.name || 'PDF Preview';
      pvStage.appendChild(frame);
    }
    pvImg.style.transition = '';
    pvImg.style.transform = g.scale > 1 ? 'scale(' + g.scale + ')' : '';
    pvName.textContent = it.name || '';
    const dims = (it.width && it.height) ? it.width + '×' + it.height + ' · ' : '';
    const sz = fmtSize(it.size);
    pvMeta.textContent = dims + (it.ext || '').toUpperCase() + (sz ? ' · ' + sz : '');
    pvDownload.href = '/api/items/' + it.id + '/file?download=true';
    // 图片/视频才显示「保存到相册」（iOS 只能通过分享面板「存储到照片」写入相册）。
    pvSave.style.display = (image || video) ? '' : 'none';
    pvPrev.disabled = i <= 0;
    pvNext.disabled = i >= list.length - 1;
    updatePeeks();
    preloadAdjacent();
  }
  function clearPreviewMedia() {
    pvStage.querySelectorAll('.pv-unavailable').forEach(el => el.remove());
    pvStage.querySelectorAll('.pv-video, .pv-pdf').forEach(el => {
      if (el.pause) el.pause();
      el.remove();
    });
  }
  function showPreviewUnavailable(message) {
    pvImg.style.display = 'none';
    pvStage.querySelectorAll('.pv-unavailable').forEach(el => el.remove());
    const box = document.createElement('div');
    box.className = 'pv-unavailable';
    box.textContent = message;
    pvStage.appendChild(box);
    pvSave.style.display = 'none';
  }
  function normExt(ext) { return (ext || '').toLowerCase().replace(/^\./, ''); }
  function isImageExt(ext) { return ['bmp', 'gif', 'heic', 'heif', 'ico', 'jpeg', 'jpg', 'png', 'svg', 'tif', 'tiff', 'webp', 'avif', 'jfif', 'jxl'].includes(normExt(ext)); }
  function isVideoExt(ext) { return ['mp4', 'mov', 'webm', 'm4v', '3gp'].includes(normExt(ext)); }
  // 取文件 Blob 并通过 Web Share API 以 File 形式分享——iOS 分享面板才会提供「存储到照片 / 存储视频」。
  async function shareFile(it) {
    if (it.size && it.size > 200 * 1024 * 1024) throw new Error('too-large-to-share');
    const url = location.origin + '/api/items/' + it.id + '/file';
    const resp = await fetch(url);
    if (!resp.ok) throw new Error('fetch-failed');
    const blob = await resp.blob();
    const ext = normExt(it.ext) || (blob.type.split('/')[1] || '').toLowerCase() || 'bin';
    const fname = (it.name || 'eagle') + '.' + ext;
    const file = new File([blob], fname, { type: blob.type || undefined });
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({ files: [file], title: it.name || fname });
    } else if (navigator.share) {
      await navigator.share({ title: it.name || fname, url });
    } else {
      throw new Error('no-share');
    }
  }
  function preloadAdjacent() {
    // 预载相邻图（前 1 + 后 2），让左右切换时目标图已在浏览器缓存中，消除滑完后的网络等待卡顿。
    const list = S.preview.list, i = S.preview.index;
    if (!list || !list.length) return;
    for (const j of [i - 1, i + 1, i + 2]) {
      const it = list[j];
      if (it && isImageExt(it.ext)) { const im = new Image(); im.decoding = 'async'; im.src = '/api/items/' + it.id + '/file'; }
    }
  }
  function showPreviewItemAnimated(dir) {
    pvImg.style.transition = 'transform .18s ease';
    pvImg.style.transform = 'translateX(' + (dir === 'next' ? '-100%' : '100%') + ')';
    setTimeout(showPreviewItem, 170);
  }
  function updatePeeks() {
    // 预览时保持纯净背景：移除相邻项的探出缩略图，避免透出其它结果干扰查看。
    pvStage.querySelectorAll('.pv-peek').forEach(p => p.remove());
  }
  function applyTransform() { pvImg.style.transform = g.scale > 1 ? 'scale(' + g.scale + ')' : ''; }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function dist(a, b) { return Math.hypot(a.x - b.x, a.y - b.y); }

  pvStage.addEventListener('pointerdown', e => {
    if (e.target.closest('video, iframe')) return;
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
  pvPrev.onclick = () => {
    if (S.preview.index <= 0) return;
    S.preview.index--;
    showPreviewItem();
  };
  pvNext.onclick = () => {
    if (S.preview.index >= S.preview.list.length - 1) return;
    S.preview.index++;
    showPreviewItem();
  };
  pvDownload.onclick = (e) => {
    // 用 Blob 方式触发下载：强制浏览器弹出「存储为…」保存窗口，避免 Safari 把文件内联预览（Finder/Quick Look）。
    e.preventDefault();
    const it = S.preview.list[S.preview.index];
    if (!it) return;
    const url = '/api/items/' + it.id + '/file?download=true';
    const fname = (it.name || 'eagle') + '.' + (normExt(it.ext) || 'bin');
    fetch(url).then((r) => r.blob()).then((blob) => {
      const bUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = bUrl; a.download = fname;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(bUrl), 5000);
    }).catch(() => { window.location.href = url; });
  };
  pvSave.onclick = async () => {
    const it = S.preview.list[S.preview.index];
    if (!it) return;
    try {
      // iOS 分享面板会提供「存储到照片 / 存储视频」；用户取消 share 视为正常退出。
      await shareFile(it);
    } catch (e) {
      if (e && e.name === 'AbortError') return;
      // 不支持以文件形式分享时，回退为下载到「文件」App（安卓下通常仍能被相册扫描到）。
      try {
        const a = document.createElement('a');
        a.href = '/api/items/' + it.id + '/file?download=true';
        a.download = (it.name || 'eagle') + '.' + (normExt(it.ext) || '');
        document.body.appendChild(a); a.click(); a.remove();
        toast(tr('downloaded'));
      } catch (e2) { toast(tr('saveFailed')); }
    }
  };
  pvShare.onclick = async () => {
    const it = S.preview.list[S.preview.index];
    if (!it) return;
    try {
      // 以文件形式分享，iOS 面板才会提供「存储到照片」；取消分享视为正常。
      await shareFile(it);
    } catch (e) {
      if (e && e.name === 'AbortError') return;
      const url = location.origin + '/api/items/' + it.id + '/file';
      try { await navigator.clipboard.writeText(url); toast(tr('copied')); }
      catch (e2) { toast(tr('shareUnavailable')); }
    }
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

  // ---------- 大标题折叠：内容滚动时淡入顶栏紧凑标题 ----------
  view.addEventListener('scroll', () => {
    topbar.classList.toggle('top-collapsed', view.scrollTop > 4);
  }, { passive: true });

  // ---------- 启动 ----------
  applyLanguage();
  switchTab('library');

  // PWA：注册 service worker（若存在）
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    });
  }
})();
