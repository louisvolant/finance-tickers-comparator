// Ticker-Tracker Service Worker for offline PWA support
// Bump when the caching policy below changes so existing installs drop stale
// entries (v2: stopped persisting /ticker/ navigations; v3: push notifications).
const CACHE_NAME = 'ticker-tracker-v3';
const STATIC_ASSETS = [
  '/',
  '/manifest.json',
  '/icons/icon.svg',
  '/favicon.ico'
];

/**
 * Routes that carry per-user data (reference target, personal notes).
 *
 * These must be network-only: never served from Cache Storage and never
 * written to it. A cached shell would survive a logout and could hand one
 * user's watchlist context to the next user on a shared device, and it would
 * also be replayed from disk while offline.
 */
const isPersonalizedRoute = (pathname) =>
  pathname.startsWith('/api/') || pathname.startsWith('/ticker/');

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn('PWA Pre-cache skipped some items:', err);
      });
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests, market data APIs, and every personalized route, so
  // they always hit the network and are never persisted to Cache Storage.
  if (request.method !== 'GET' || isPersonalizedRoute(url.pathname)) {
    return;
  }

  // Navigation requests: Network-first, fallback to cache
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        })
        .catch(async () => {
          const cached = await caches.match(request);
          if (cached) return cached;
          const fallback = await caches.match('/');
          if (fallback) return fallback;
          return new Response('Offline - Ticker-Tracker', {
            status: 200,
            headers: { 'Content-Type': 'text/html' },
          });
        })
    );
    return;
  }

  // Static assets: Cache-first with network background update
  if (
    url.pathname.startsWith('/_next/static/') ||
    url.pathname.startsWith('/icons/') ||
    url.pathname === '/favicon.ico'
  ) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        if (cachedResponse) {
          fetch(request).then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              caches.open(CACHE_NAME).then((cache) => cache.put(request, networkResponse));
            }
          }).catch(() => {});
          return cachedResponse;
        }
        return fetch(request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const clone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return networkResponse;
        });
      })
    );
  }
});

/**
 * Price-alert push notifications.
 *
 * The payload is built server-side (`buildAlertNotification`) and contains a
 * title, a body, the route to open and a replacement tag. `userVisibleOnly`
 * subscriptions require showing a notification for every push, so this handler
 * always calls showNotification.
 */
self.addEventListener('push', (event) => {
  let payload = {};

  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    // A malformed payload must still surface something rather than being dropped.
    payload = { title: 'Ticker-Tracker', body: event.data ? event.data.text() : '' };
  }

  const title = payload.title || 'Ticker-Tracker';
  const options = {
    body: payload.body || '',
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    // Same tag = the newer alert replaces the older one on the lock screen.
    tag: payload.tag || 'price-alerts',
    data: { url: payload.url || '/' },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || '/';

  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });

      // Focus an existing tab and navigate it, instead of stacking new windows.
      for (const client of windows) {
        if ('focus' in client) {
          await client.focus();
          if ('navigate' in client) {
            await client.navigate(targetUrl);
          }
          return;
        }
      }

      if (self.clients.openWindow) {
        await self.clients.openWindow(targetUrl);
      }
    })()
  );
});
