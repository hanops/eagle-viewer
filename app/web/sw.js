const CACHE_NAME = 'eagle-viewer-shell-v32';
const THUMBNAIL_CACHE = 'eagle-viewer-thumbs-v1';
const API_CACHE = 'eagle-viewer-api-v1';
const STATIC_URLS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/static/icon.svg',
  '/static/apple-touch-icon.png',
  '/static/icon-192.png',
  '/static/icon-512.png',
  '/static/styles.css?v=1.86',
  '/static/core.js?v=1.86',
  '/static/render.js?v=1.86',
  '/static/api.js?v=1.86',
  '/static/interactions.js?v=1.86',
  '/static/bootstrap.js?v=1.86',
];

self.addEventListener('install', function(e) {
  e.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      return cache.addAll(STATIC_URLS.map(function(u) { return new Request(u, { cache: 'reload' }); })).catch(function() {});
    }).then(function() { return self.skipWaiting(); })
  );
});

self.addEventListener('message', function(e) {
  if (!e.data) return;
  if (e.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
    return;
  }
  if (e.data.type === 'CLEAR_OFFLINE_SNAPSHOT') {
    e.waitUntil(
      Promise.all([caches.delete(THUMBNAIL_CACHE), caches.delete(API_CACHE)]).then(function(results) {
        if (e.ports && e.ports[0]) {
          e.ports[0].postMessage({ ok: true, deleted: results.filter(Boolean).length });
        }
      }).catch(function() {
        if (e.ports && e.ports[0]) e.ports[0].postMessage({ ok: false });
      })
    );
  }
});

self.addEventListener('activate', function(e) {
  e.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(keys.map(function(k) {
        if (k !== CACHE_NAME && k !== THUMBNAIL_CACHE && k !== API_CACHE) return caches.delete(k);
      }));
    }).then(function() { return self.clients.claim(); })
  );
});

function isCacheableApiRequest(request, url) {
  if (request.method !== 'GET' || !url.pathname.startsWith('/api/')) return false;
  if (url.pathname === '/api/state') return false;
  if (url.pathname.endsWith('/file') || url.pathname.endsWith('/thumbnail')) return false;
  return (
    url.pathname === '/api/tree' ||
    url.pathname === '/api/tags' ||
    url.pathname === '/api/smart-folders' ||
    url.pathname === '/api/items' ||
    url.pathname === '/api/recent' ||
    url.pathname === '/api/search' ||
    url.pathname === '/api/library/stats' ||
    url.pathname === '/api/duplicates' ||
    url.pathname === '/api/palettes' ||
    url.pathname === '/api/random' ||
    /^\/api\/folders\/[^/]+\/items$/.test(url.pathname) ||
    /^\/api\/smart-folders\/[^/]+\/items$/.test(url.pathname) ||
    /^\/api\/tags\/[^/]+\/items$/.test(url.pathname) ||
    /^\/api\/items\/[^/]+$/.test(url.pathname) ||
    /^\/api\/items\/[^/]+\/snippet$/.test(url.pathname)
  );
}

function cloneAsOfflineSnapshot(response) {
  var headers = new Headers(response.headers);
  headers.set('X-Eagle-Offline-Cache', '1');
  headers.set('X-Eagle-Offline-Cached-At', headers.get('date') || '');
  return response.clone().text().then(function(body) {
    return new Response(body, {
      status: response.status,
      statusText: response.statusText,
      headers: headers
    });
  });
}

self.addEventListener('fetch', function(e) {
  var url = new URL(e.request.url);
  if (url.origin !== location.origin) return;
  if (e.request.method === 'GET' && /^\/api\/items\/[^/]+\/thumbnail$/.test(url.pathname)) {
    e.respondWith(
      caches.open(THUMBNAIL_CACHE).then(function(cache) {
        return fetch(e.request).then(function(response) {
          if (response && response.ok) cache.put(e.request, response.clone());
          return response;
        }).catch(function() {
          return cache.match(e.request).then(function(cached) {
            return cached || new Response('', { status: 503 });
          });
        });
      }).catch(function() {
        return fetch(e.request);
      })
    );
    return;
  }
  if (isCacheableApiRequest(e.request, url)) {
    e.respondWith(
      caches.open(API_CACHE).then(function(cache) {
        return fetch(e.request).then(function(response) {
          var contentType = response.headers.get('content-type') || '';
          if (response && response.ok && contentType.indexOf('application/json') >= 0) {
            cache.put(e.request, response.clone()).catch(function() {});
          }
          return response;
        }).catch(function() {
          return cache.match(e.request).then(function(cached) {
            if (cached) return cloneAsOfflineSnapshot(cached);
            return new Response(JSON.stringify({ error: 'offline' }), { status: 503, headers: { 'Content-Type': 'application/json' } });
          });
        });
      }).catch(function() {
        return fetch(e.request).catch(function() {
          return new Response(JSON.stringify({ error: 'offline' }), { status: 503, headers: { 'Content-Type': 'application/json' } });
        });
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
  if (
    url.pathname === '/' ||
    url.pathname === '/index.html' ||
    url.pathname === '/manifest.json' ||
    url.pathname === '/sw.js' ||
    url.pathname.startsWith('/static/')
  ) {
    e.respondWith(
      fetch(e.request).then(function(r) { return r; }).catch(function() {
        return caches.match(e.request).then(function(cached) { return cached || caches.match('/'); });
      })
    );
    return;
  }
});
