// sw.js — Service Worker untuk Warung Indonesia PWA
// Naikkan versi ini setiap kali index.html/aset diupdate, agar cache lama dibuang.
const CACHE_NAME = 'Warung Mbak Wiwin';

// File inti yang perlu tersedia offline / dipakai saat install.
// Sesuaikan daftar ini dengan nama file aslimu di server (mis. "index.html").
const CORE_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

// INSTALL: simpan aset inti ke cache
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(CORE_ASSETS))
      .catch(() => {}) // jangan gagalkan install kalau salah satu aset tidak ada
  );
  self.skipWaiting();
});

// ACTIVATE: bersihkan cache versi lama
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// FETCH: strategi "network-first, fallback ke cache" untuk halaman HTML
// (biar konten menu selalu update kalau online, tapi tetap bisa dibuka offline),
// dan "cache-first" untuk aset statis (CSS/JS/font/gambar).
self.addEventListener('fetch', (event) => {
  const req = event.request;

  // Hanya tangani GET request
  if (req.method !== 'GET') return;

  const isHTML = req.mode === 'navigate' ||
    (req.headers.get('accept') || '').includes('text/html');

  if (isHTML) {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const resClone = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, resClone));
          return res;
        })
        .catch(() => caches.match(req).then((res) => res || caches.match('./index.html')))
    );
    return;
  }

  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req)
        .then((res) => {
          // Jangan cache respons non-ok atau lintas origin (mis. CDN pihak ketiga)
          if (!res || res.status !== 200 || res.type !== 'basic') return res;
          const resClone = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, resClone));
          return res;
        })
        .catch(() => cached);
    })
  );
});
