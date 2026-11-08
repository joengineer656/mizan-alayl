const CACHE = 'mizan-v1';
const SHELL = ['./', 'index.html', 'style.css', 'app.js', 'stats.js', 'content.js', 'firebase-config.js', 'manifest.json', 'icons/icon-192.png', 'icons/icon-512.png'];
const LIBRARY_HOSTS = ['www.gstatic.com', 'fonts.googleapis.com', 'fonts.gstatic.com'];

addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => skipWaiting()));
});
addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => clients.claim()));
});

const remember = async (req, res) => {
  if (res.ok || res.type === 'opaque') (await caches.open(CACHE)).put(req, res.clone());
  return res;
};

addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  if (url.origin === location.origin) {
    // Network first, so a new version reaches the phones as soon as it is published.
    e.respondWith(fetch(e.request).then((r) => remember(e.request, r)).catch(() => caches.match(e.request)));
  } else if (LIBRARY_HOSTS.includes(url.hostname)) {
    e.respondWith(caches.match(e.request).then((hit) => hit || fetch(e.request).then((r) => remember(e.request, r))));
  }
});
