const CACHE_NAME = 'eagle-viewer-v1.4';
const THUMBNAIL_CACHE = 'eagle-viewer-thumbs-v1';
const STATIC_URLS = ['/', '/index.html', '/manifest.json'];

self.addEventListener('install', function(e) {
  e.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      return cache.addAll(STATIC_URLS.map(function(u) { return new Request(u, { cache: 'reload' }); })).catch(function() {});
    }).then(function() { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function(e) {
  e.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(keys.map(function(k) {
        if (k !== CACHE_NAME && k !== THUMBNAIL_CACHE) return caches.delete(k);
      }));
    }).then(function() { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function(e) {
  var url = new URL(e.request.url);
  if (url.origin !== location.origin) return;
  if (e.request.method === 'GET' && /^\/api\/items\/[^/]+\/thumbnail$/.test(url.pathname)) {
    e.respondWith(
      caches.open(THUMBNAIL_CACHE).then(function(cache) {
        return cache.match(e.request).then(function(cached) {
          var networkFetch = fetch(e.request).then(function(response) {
            if (response && response.ok) cache.put(e.request, response.clone());
            return response;
          });
          return cached || networkFetch;
        });
      }).catch(function() {
        return fetch(e.request);
      })
    );
    return;
  }
  if (url.pathname.startsWith('/api/')) {
    e.respondWith(
      fetch(e.request).catch(function() {
        return caches.match(e.request.url).then(function(cached) { return cached || new Response(JSON.stringify({ error: 'offline' }), { status: 503, headers: { 'Content-Type': 'application/json' } }); });
      })
    );
    return;
  }
  if (url.pathname === '/' || url.pathname === '/index.html' || url.pathname === '/manifest.json' || url.pathname === '/sw.js') {
    e.respondWith(
      fetch(e.request).then(function(r) { return r; }).catch(function() {
        return caches.match(e.request).then(function(cached) { return cached || caches.match('/'); });
      })
    );
    return;
  }
});
