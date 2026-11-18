// Offline cache so the app opens at the pitch without signal.
const CACHE = 'royal-club-v3';
const FILES = [
  './',
  './index.html',
  './css/app.css',
  './js/app.js',
  './js/i18n.js',
  './js/library.js',
  './js/library-more.js',
  './js/diagram-helpers.js',
  './js/diagram.js',
  './js/store.js',
  './js/timer.js',
  './js/config.js',
  './js/cloud.js',
  './js/sync.js',
  './manifest.webmanifest',
  './icons/icon.svg',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()),
  );
});

// Network first, falling back to the cache, so updates arrive when online.
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    fetch(e.request)
      .then((res) => {
        if (res.ok && (new URL(e.request.url).origin === location.origin || e.request.url.includes('fonts.g') || e.request.url.includes('cdn.jsdelivr.net/npm/@supabase'))) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(e.request, copy));
        }
        return res;
      })
      .catch(() => caches.match(e.request, { ignoreSearch: true })),
  );
});
