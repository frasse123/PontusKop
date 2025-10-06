// service-worker.js  (failsafe för GitHub Pages under /SavedIT/)
const SCOPE_PATH = new URL(self.registration.scope).pathname; // t.ex. '/SavedIT/'
const CACHE_NAME = 'savedit-failsafe-v1';

// Saker vi förladdar (RELATIVA till scope)
const PRECACHE = [
  'index.html',
  'manifest.webmanifest',
  'icons/icon-192.png',
  'icons/icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((c) => c.addAll(PRECACHE.map(p => SCOPE_PATH + p)))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(names =>
      Promise.all(names.filter(n => n !== CACHE_NAME).map(n => caches.delete(n)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Bara GET, samma origin, och under vårt scope
  if (req.method !== 'GET') return;
  if (url.origin !== location.origin) return;
  if (!url.pathname.startsWith(SCOPE_PATH)) return;

  // Navigering: nät först, fallback till cache:ad index.html
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req).catch(() => caches.match(SCOPE_PATH + 'index.html'))
    );
    return;
  }

  // Övrigt: cache först, annars nät -> cache (om OK)
  event.respondWith(
    caches.match(req).then(hit => {
      if (hit) return hit;
      return fetch(req).then(res => {
        if (res && res.status === 200 && res.type === 'basic') {
          const copy = res.clone();
          caches.open(CACHE_NAME).then(c => c.put(req, copy));
        }
        return res;
      });
    })
  );
});
