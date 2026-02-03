const CACHE_VERSION = 'v2';
const CACHE_NAME = `production-manager-${CACHE_VERSION}`;
const RUNTIME_CACHE = `production-manager-runtime-${CACHE_VERSION}`;

// Critical assets to precache on install
const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/assets/generated/app-icon-transparent.dim_192x192.png',
  '/assets/generated/app-icon-transparent.dim_512x512.png',
  '/assets/generated/splash-background.dim_1080x1920.png'
];

// Install event - cache critical assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Opened cache:', CACHE_NAME);
        return cache.addAll(PRECACHE_URLS);
      })
      .then(() => self.skipWaiting())
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  const currentCaches = [CACHE_NAME, RUNTIME_CACHE];
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return cacheNames.filter((cacheName) => !currentCaches.includes(cacheName));
    }).then((cachesToDelete) => {
      console.log('[SW] Deleting old caches:', cachesToDelete);
      return Promise.all(cachesToDelete.map((cacheToDelete) => {
        return caches.delete(cacheToDelete);
      }));
    }).then(() => self.clients.claim())
  );
});

// Fetch event - cache-first for static assets, network-first for API calls
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip cross-origin requests
  if (url.origin !== self.location.origin) {
    return;
  }

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Determine strategy based on request type
  const isStaticAsset = url.pathname.startsWith('/assets/') || 
                        url.pathname.match(/\.(js|css|woff2?|ttf|eot|svg|png|jpg|jpeg|gif|webp|ico)$/);
  
  const isNavigationRequest = request.mode === 'navigate';

  if (isStaticAsset) {
    // Cache-first strategy for static assets (JS, CSS, images, fonts)
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        if (cachedResponse) {
          // Return cached version immediately
          return cachedResponse;
        }

        // Fetch from network and cache for next time
        return fetch(request).then((response) => {
          if (response && response.status === 200) {
            const responseToCache = response.clone();
            caches.open(RUNTIME_CACHE).then((cache) => {
              cache.put(request, responseToCache);
            });
          }
          return response;
        }).catch(() => {
          // Network failed, no cache available
          console.log('[SW] Failed to fetch static asset:', url.pathname);
        });
      })
    );
  } else if (isNavigationRequest) {
    // Network-first for navigation, fallback to cached index.html for offline
    event.respondWith(
      fetch(request).catch(() => {
        return caches.match('/index.html');
      })
    );
  } else {
    // Stale-while-revalidate for other requests (API calls, etc.)
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        const fetchPromise = fetch(request).then((response) => {
          if (response && response.status === 200) {
            const responseToCache = response.clone();
            caches.open(RUNTIME_CACHE).then((cache) => {
              cache.put(request, responseToCache);
            });
          }
          return response;
        });

        // Return cached response immediately if available, but update cache in background
        return cachedResponse || fetchPromise;
      })
    );
  }
});

// Handle messages from clients
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
