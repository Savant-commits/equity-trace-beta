// ═══ EQUITY TRACE SERVICE WORKER ═══
// Version 1.0.0

const CACHE_NAME = 'equity-trace-v2';
const urlsToCache = [
  '/',
  '/index.html',
  '/journal.html',
  '/offline.html',
  '/styles.css',
  '/app.js',
  '/account.js',
  '/calendar.js',
  '/images.js',
  '/import-trades.js',
  '/reports.js',
  '/settings.js',
  '/supabase.js',
  '/templates.js',
  '/logo.png'
];

// Install event - cache all files
self.addEventListener('install', event => {
  console.log('[ServiceWorker] Install');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[ServiceWorker] Caching app shell');
        return cache.addAll(urlsToCache);
      })
      .then(() => self.skipWaiting())
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
  console.log('[ServiceWorker] Activate');
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('[ServiceWorker] Removing old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch event - serve navigation requests from network first, cache others
self.addEventListener('fetch', event => {
  const request = event.request;

  // Use network-first for page navigation so updated HTML is loaded immediately
  if (request.mode === 'navigate' || request.destination === 'document') {
    event.respondWith(
      fetch(request).then(networkResponse => {
        if (networkResponse && networkResponse.status === 200) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(request, responseToCache));
        }
        return networkResponse;
      }).catch(() => {
        return caches.match(request).then(response => response || caches.match('/offline.html'));
      })
    );
    return;
  }

  event.respondWith(
    caches.match(request)
      .then(response => {
        if (response) {
          return response;
        }

        const fetchRequest = request.clone();

        return fetch(fetchRequest).then(networkResponse => {
          if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
            return networkResponse;
          }

          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME)
            .then(cache => {
              cache.put(request, responseToCache);
            });

          return networkResponse;
        }).catch(() => {
          if (request.destination === 'document') {
            return caches.match('/offline.html');
          }
          return new Response('Offline', {
            status: 503,
            statusText: 'Service Unavailable',
            headers: new Headers({
              'Content-Type': 'text/plain'
            })
          });
        });
      })
  );
});

// Background sync for data updates
self.addEventListener('sync', event => {
  console.log('[ServiceWorker] Background sync:', event.tag);
  if (event.tag === 'sync-trades') {
    event.waitUntil(syncTrades());
  }
});

async function syncTrades() {
  // Placeholder for future sync functionality
  console.log('[ServiceWorker] Syncing trades...');
}

// Push notifications support
self.addEventListener('push', event => {
  const options = {
    body: event.data ? event.data.text() : 'New update available',
    icon: '/logo.png',
    badge: '/logo.png',
    vibrate: [200, 100, 200],
    tag: 'equity-trace-notification',
    requireInteraction: false
  };

  event.waitUntil(
    self.registration.showNotification('Equity Trace', options)
  );
});

// Notification click handler
self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(
    clients.openWindow('/journal.html')
  );
});
