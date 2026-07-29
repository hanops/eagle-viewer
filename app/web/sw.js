const CACHE_NAME = 'eagle-viewer-shell-v57';
const STATIC_URLS = [
  '/',
  '/index.html',
  '/mobile.html',
  '/manifest.json',
  '/static/icon.svg',
  '/static/apple-touch-icon.png',
  '/static/icon-192.png',
  '/static/icon-512.png',
  '/static/styles.css?v=1.111',
  '/static/styles-collection.css?v=1.111',
  '/static/styles-detail.css?v=1.111',
  '/static/styles-desktop.css?v=1.111',
  '/static/styles-mobile-shell.css?v=1.111',
  '/static/styles-mobile-search.css?v=1.111',
  '/static/styles-mobile-preview.css?v=1.111',
  '/static/styles-mobile-actions.css?v=1.111',
  '/static/styles-formats.css?v=1.111',
  '/static/styles-polish.css?v=1.111',
  '/static/core.js?v=1.111',
  '/static/render.js?v=1.111',
  '/static/render-selection.js?v=1.111',
  '/static/render-inspector.js?v=1.111',
  '/static/render-collection.js?v=1.111',
  '/static/render-content.js?v=1.111',
  '/static/render-preview.js?v=1.111',
  '/static/render-preview-media.js?v=1.111',
  '/static/render-preview-navigation.js?v=1.111',
  '/static/render-preview-documents.js?v=1.111',
  '/static/render-hover.js?v=1.111',
  '/static/api.js?v=1.111',
  '/static/interactions.js?v=1.111',
  '/static/interactions-filters.js?v=1.111',
  '/static/interactions-layout.js?v=1.111',
  '/static/interactions-mobile.js?v=1.111',
  '/static/interactions-remote.js?v=1.111',
  '/static/interactions-install.js?v=1.111',
  '/static/interactions-items.js?v=1.111',
  '/static/interactions-actions.js?v=1.111',
  '/static/interactions-bindings.js?v=1.111',
  '/static/bootstrap.js?v=1.111',
  '/static/mobile.css?v=1.111',
  '/static/mobile.js?v=1.111',
];

self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(function(cache) {
        return cache.addAll(STATIC_URLS.map(function(url) {
          return new Request(url, { cache: 'reload' });
        }));
      })
      .catch(function() {})
      .then(function() { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys()
      .then(function(keys) {
        return Promise.all(keys.map(function(key) {
          if (key !== CACHE_NAME && key.indexOf('eagle-viewer-') === 0) {
            return caches.delete(key);
          }
        }));
      })
      .then(function() { return self.clients.claim(); })
  );
});

self.addEventListener('message', function(event) {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', function(event) {
  var request = event.request;
  if (request.method !== 'GET') return;
  var url = new URL(request.url);
  if (url.origin !== location.origin) return;
  // API 响应不进 service worker 缓存（离线由应用自身快照机制负责）
  if (url.pathname.startsWith('/api/')) return;

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(function() {
        return caches.match(url.pathname + url.search)
          .then(function(c) { return c || caches.match('/mobile.html'); })
          .then(function(c) { return c || caches.match('/index.html'); });
      })
    );
    return;
  }

  event.respondWith(
    caches.match(request).then(function(cached) {
      if (cached) return cached;
      return fetch(request).then(function(response) {
        if (!response || !response.ok) return response;
        return caches.open(CACHE_NAME).then(function(cache) {
          cache.put(request, response.clone());
          return response;
        });
      });
    })
  );
});
