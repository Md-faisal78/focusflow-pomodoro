/* FocusFlow service worker.
 * - Precaches the app shell (+ its build assets) and manifest/icons on install.
 * - Network-first for navigation (offline fallback to cached shell).
 * - Cache-first for static assets.
 * All user data lives in localStorage / IndexedDB, so it stays available offline.
 */
const CACHE_NAME = 'focusflow-v1';
const PRECACHE_URLS = [
  '/',
  '/manifest.webmanifest',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/maskable-192.png',
  '/icons/maskable-512.png',
];

// Vite's dev/preview servers send `Vary: Origin`, which breaks Cache API
// matching for requests that carry no Origin header (e.g. script loads). Strip
// Vary when caching so cached responses always match by URL.
function toCacheable(response) {
  const headers = new Headers(response.headers);
  headers.delete('Vary');
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

async function cachePut(cache, request, response) {
  if (!response || !response.ok) return;
  try {
    await cache.put(request, toCacheable(response.clone()));
  } catch {
    // Non-fatal: the app still works, just without that cached copy.
  }
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      // Precache the shell, manifest and icons.
      await Promise.all(
        PRECACHE_URLS.map(async (url) => {
          try {
            const res = await fetch(url);
            await cachePut(cache, url, res);
          } catch {
            // ignore
          }
        })
      );
      // Also precache the app shell's hashed build assets (JS/CSS). Without
      // this, a user who installs on their very first visit and then opens the
      // app offline would get the HTML shell but no JavaScript.
      try {
        const shell = await fetch('/');
        if (shell.ok) {
          const html = await shell.text();
          const urls = [...html.matchAll(/(?:src|href)="(\/assets\/[^"]+)"/g)].map((m) => m[1]);
          await Promise.all(
            urls.map(async (url) => {
              try {
                const res = await fetch(url);
                await cachePut(cache, url, res);
              } catch {
                // ignore
              }
            })
          );
        }
      } catch {
        // Non-fatal: runtime caching still covers subsequent loads.
      }
      await self.skipWaiting();
    })()
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Navigations: network first, fall back to the cached app shell when offline.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          caches.open(CACHE_NAME).then((cache) => cachePut(cache, request, response.clone()));
          return response;
        })
        .catch(() => caches.match(request).then((hit) => hit || caches.match('/')))
    );
    return;
  }

  // Static assets: cache first, then network (and cache the response).
  event.respondWith(
    caches.match(request).then(
      (cached) =>
        cached ||
        fetch(request).then((response) => {
          caches.open(CACHE_NAME).then((cache) => cachePut(cache, request, response));
          return response;
        })
    )
  );
});
