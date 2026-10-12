// apps/web/public/sw.js
// RiceTrace Service Worker — vanilla (no build dependency)
// DEVELOPER ACTION REQUIRED: Generate PNG icons from public/icons/icon.svg
// Use: npx sharp-cli --input public/icons/icon.svg --output public/icons/icon-192x192.png --resize 192 192
// Or upload to https://realfavicongenerator.net and download the package
// Place all icon-{size}x{size}.png files in apps/web/public/icons/

const CACHE_VERSION = 'v1';
const STATIC_CACHE = `ricetrace-static-${CACHE_VERSION}`;
const API_CACHE = `ricetrace-api-${CACHE_VERSION}`;
const FARMERS_CACHE = `ricetrace-farmers-${CACHE_VERSION}`;

const STATIC_ASSETS = [
  '/',
  '/lots/new',
  '/offline.html',
];

// ─── INSTALL ──────────────────────────────────────────────────────────────────
self.addEventListener('install', (event) => {
  console.log('[SW] Installing...');
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn('[SW] Failed to cache some static assets:', err);
      });
    })
  );
  self.skipWaiting();
});

// ─── ACTIVATE ─────────────────────────────────────────────────────────────────
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => {
            return (
              name.startsWith('ricetrace-') &&
              name !== STATIC_CACHE &&
              name !== API_CACHE &&
              name !== FARMERS_CACHE
            );
          })
          .map((name) => {
            console.log('[SW] Deleting old cache:', name);
            return caches.delete(name);
          })
      );
    })
  );
  self.clients.claim();
});

// ─── FETCH ────────────────────────────────────────────────────────────────────
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests — offline mutations go through IndexedDB sync queue
  if (request.method !== 'GET') return;

  // Skip non-http requests (chrome-extension, etc.)
  if (!url.protocol.startsWith('http')) return;

  // Farmers and farms list — NetworkFirst with 24h cache
  if (url.pathname.includes('/api/v1/farmers')) {
    event.respondWith(networkFirst(request, FARMERS_CACHE, 5000));
    return;
  }

  // Other API calls — NetworkFirst with short cache
  if (url.pathname.includes('/api/v1/')) {
    event.respondWith(networkFirst(request, API_CACHE, 8000));
    return;
  }

  // Static assets — CacheFirst
  if (url.pathname.startsWith('/_next/static/')) {
    event.respondWith(cacheFirst(request, STATIC_CACHE));
    return;
  }

  // Pages — NetworkFirst with offline fallback
  if (request.mode === 'navigate') {
    event.respondWith(
      networkFirst(request, STATIC_CACHE, 8000).catch(() => {
        return caches.match('/offline.html').then((cached) => {
          return cached || new Response('You are offline. Please check your connection.', {
            status: 503,
            headers: { 'Content-Type': 'text/plain' }
          });
        });
      })
    );
    return;
  }
});

// ─── STRATEGIES ───────────────────────────────────────────────────────────────

async function networkFirst(request, cacheName, timeoutMs) {
  const cache = await caches.open(cacheName);
  try {
    const networkResponse = await Promise.race([
      fetch(request.clone()),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Network timeout')), timeoutMs)
      )
    ]);
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (err) {
    const cached = await cache.match(request);
    if (cached) {
      console.log('[SW] Serving from cache:', request.url);
      return cached;
    }
    throw err;
  }
}

async function cacheFirst(request, cacheName) {
  const cached = await caches.match(request);
  if (cached) return cached;
  const cache = await caches.open(cacheName);
  const networkResponse = await fetch(request);
  if (networkResponse.ok) {
    cache.put(request, networkResponse.clone());
  }
  return networkResponse;
}

// ─── MESSAGES ─────────────────────────────────────────────────────────────────
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

console.log('[SW] Service worker loaded — RiceTrace v1');
