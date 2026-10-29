/* ============================================================
   Sms Tamu 💖 - sw.js  (Service Worker for offline PWA support)
============================================================ */
const CACHE_NAME = 'sms-tamu-v2';
const CORE_ASSETS = [
  './',
  './index.html',
  './chat.html',
  './premium.html',
  './style.css',
  './app.js',
  './chat.js',
  './premium.js',
  './supabase.js',
  './manifest.json'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(CORE_ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(response => {
        // cache successful same-origin responses for offline use
        if (response && response.status === 200 && event.request.url.startsWith(self.location.origin)) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy));
        }
        return response;
      }).catch(() => {
        // offline fallback: return the main app shell for navigation requests
        if (event.request.mode === 'navigate') return caches.match('./index.html');
        return new Response('', { status: 404, statusText: 'Offline' });
      });
    })
  );
});