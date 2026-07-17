const CACHE_NAME = 'eagle-viewer-shell-v39';
const STATIC_URLS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/static/icon.svg',
  '/static/apple-touch-icon.png',
  '/static/icon-192.png',
  '/static/icon-512.png',
  '/static/styles.css?v=1.93',
  '/static/core.js?v=1.93',
  '/static/render.js?v=1.93',
  '/static/api.js?v=1.93',
  '/static/interactions.js?v=1.93',
  '/static/bootstrap.js?v=1.93',
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
  if (url.origin !== location.origin || url.pathname.startsWith('/api/')) return;

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(function() {
        return caches.match('/index.html');
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
