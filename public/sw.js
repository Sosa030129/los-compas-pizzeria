// LOS COMPAS PIZZERÍA - Service Worker PWA v2
// Soporte offline robusto con estrategias diferenciadas por tipo de recurso

const CACHE_VERSION = 'los-compas-v2';
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const RUNTIME_CACHE = `${CACHE_VERSION}-runtime`;

// Recursos estáticos críticos para offline (NO incluye '/' para evitar stale - bug #37)
const STATIC_ASSETS = [
  '/manifest.json',
  '/icon.svg',
  '/icon-192.png',
  '/icon-512.png',
  '/logo.png',
  '/logo-small.png',
  '/apple-touch-icon.png',
  '/favicon.png',
];

// Recursos Next.js estáticos que se cachean en runtime
const NEXTJS_STATIC_PATTERN = /\/_next\/static\//;

self.addEventListener('install', (event) => {
  event.waitUntil(
    Promise.all([
      caches.open(STATIC_CACHE).then((cache) =>
        Promise.all(
          STATIC_ASSETS.map((url) =>
            cache.add(new Request(url, { cache: 'no-cache' })).catch(() => null)
          )
        )
      ),
      self.skipWaiting(),
    ])
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys
          .filter((k) => !k.startsWith(CACHE_VERSION))
          .map((k) => caches.delete(k))
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // Solo manejar mismo origen (evitar cached externos no deseados)
  if (url.origin !== self.location.origin) return;

  // Navegación: Network-first con fallback a cache offline
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Cacheamos la página exitosa
          const clone = response.clone();
          caches.open(RUNTIME_CACHE).then((cache) => cache.put(request, clone)).catch(() => {});
          return response;
        })
        .catch(() =>
          caches.match(request).then((cached) => cached || caches.match('/'))
        )
    );
    return;
  }

  // Recursos estáticos Next.js: cache-first (son versionados, inmutables)
  if (NEXTJS_STATIC_PATTERN.test(url.pathname)) {
    event.respondWith(
      caches.match(request).then((cached) =>
        cached ||
        fetch(request).then((response) => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(RUNTIME_CACHE).then((cache) => cache.put(request, clone)).catch(() => {});
          }
          return response;
        }).catch(() => cached)
      )
    );
    return;
  }

  // Otros recursos (imágenes, fuentes): stale-while-revalidate
  event.respondWith(
    caches.match(request).then((cached) => {
      const fetchPromise = fetch(request)
        .then((response) => {
          if (response && response.status === 200 && response.type === 'basic') {
            const clone = response.clone();
            caches.open(RUNTIME_CACHE).then((cache) => cache.put(request, clone)).catch(() => {});
          }
          return response;
        })
        .catch(() => cached || new Response('', { status: 504, statusText: 'Offline' }));
      return cached || fetchPromise;
    })
  );
});

// Mensajería: permite al cliente forzar update
self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
