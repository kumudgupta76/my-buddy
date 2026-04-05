const CACHE_NAME = 'my-pwa-cache-v2';
const urlsToCache = [
  '/my-buddy/',
  '/my-buddy/index.html',
  '/my-buddy/offline.html',
];

self.addEventListener("install", event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
      .catch(error => console.error('Failed to open cache:', error))
  );
});

self.addEventListener("fetch", event => {
  const { request } = event;

  // Skip non-GET requests
  if (request.method !== 'GET') return;

  // For navigation requests and app assets (JS/CSS): network-first
  // Only fall back to cache when network fails (offline)
  event.respondWith(
    fetch(request)
      .then(networkResponse => {
        // Cache the fresh response for offline use
        if (networkResponse && networkResponse.status === 200) {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(request, responseClone);
          });
        }
        return networkResponse;
      })
      .catch(() => {
        // Network failed — try cache
        return caches.match(request).then(cachedResponse => {
          return cachedResponse || caches.match('/my-buddy/offline.html');
        });
      })
  );
});

self.addEventListener("activate", event => {
  // Delete all caches that don't match the current version
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('[SW] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener("push", event => {
  console.log("[Service Worker] Push Received.", event.data.json());
  const notificationTitle = 'Notification !!!';
  const notificationOptions = {
    body: 'This is just a test notification sent from local server',
    data: 'you can provide additional data here',
    icon: 'battery.png'
  };

  event.waitUntil(
    self.registration.showNotification(notificationTitle, notificationOptions)
  );
});