// Service Worker for CTO Website Performance Optimization
// Version 1.0 - Optimized for professional profile site

const CACHE_NAME = 'cto-website-v1';
const STATIC_CACHE = 'cto-static-v1';
const DYNAMIC_CACHE = 'cto-dynamic-v1';

// Cache static assets for optimal performance
const STATIC_ASSETS = [
  '/',
  '/css/theme.css',
  '/css/header.css',
  '/css/footer.css',
  '/css/custom.css',
  '/images/favicon.ico',
  '/images/profile.jpg',
  '/images/hero.jpg',
  '/js/contact.js',
  '/js/search.js',
  '/manifest.json'
];

// Cache external resources
const EXTERNAL_RESOURCES = [
  'https://fonts.googleapis.com/css2?family=Alata&family=Lora:ital,wght@0,400;0,500;0,600;0,700;1,400;1,500;1,600;1,700&family=Roboto:ital,wght@0,100;0,300;0,400;0,500;0,700;0,900;1,100;1,300;1,400;1,500;1,700;1,900&display=swap',
  'https://fonts.gstatic.com',
  'https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/css/bootstrap.min.css'
];

// Install event - cache essential resources
self.addEventListener('install', (event) => {
  console.log('Service Worker: Installing...');
  
  event.waitUntil(
    Promise.all([
      // Cache static assets
      caches.open(STATIC_CACHE).then((cache) => {
        console.log('Service Worker: Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      }),
      // Cache external resources
      caches.open(CACHE_NAME).then((cache) => {
        console.log('Service Worker: Caching external resources');
        return cache.addAll(EXTERNAL_RESOURCES.filter(url => {
          // Only cache if CORS allows
          try {
            return cache.add(url);
          } catch (e) {
            console.log('Could not cache:', url);
            return Promise.resolve();
          }
        }));
      })
    ]).then(() => {
      console.log('Service Worker: Installation complete');
      self.skipWaiting();
    })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('Service Worker: Activating...');
  
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== STATIC_CACHE && 
              cacheName !== DYNAMIC_CACHE && 
              cacheName !== CACHE_NAME) {
            console.log('Service Worker: Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('Service Worker: Activation complete');
      return self.clients.claim();
    })
  );
});

// Fetch event - implement caching strategies
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Skip Chrome extensions and non-http(s) URLs
  if (!url.protocol.startsWith('http')) {
    return;
  }

  // Different strategies for different resource types
  if (STATIC_ASSETS.some(asset => url.pathname.includes(asset))) {
    // Cache First strategy for static assets
    event.respondWith(cacheFirst(request));
  } else if (url.pathname.startsWith('/images/')) {
    // Cache First for images
    event.respondWith(cacheFirst(request));
  } else if (url.pathname.startsWith('/css/') || url.pathname.startsWith('/js/')) {
    // Stale While Revalidate for CSS/JS
    event.respondWith(staleWhileRevalidate(request));
  } else if (url.origin === location.origin) {
    // Network First for HTML pages (for updated content)
    event.respondWith(networkFirst(request));
  } else if (url.hostname === 'fonts.googleapis.com' || 
             url.hostname === 'fonts.gstatic.com' ||
             url.hostname === 'cdn.jsdelivr.net') {
    // Cache First for external fonts and CDN resources
    event.respondWith(cacheFirst(request));
  } else {
    // Network First for everything else
    event.respondWith(networkFirst(request));
  }
});

// Cache First Strategy - optimal for static assets
async function cacheFirst(request) {
  try {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(STATIC_CACHE);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    console.log('Cache First failed:', error);
    return new Response('Offline content not available', { 
      status: 503,
      headers: { 'Content-Type': 'text/plain' }
    });
  }
}

// Network First Strategy - optimal for HTML content
async function networkFirst(request) {
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    console.log('Network failed, checking cache:', error);
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Fallback for navigation requests
    if (request.destination === 'document') {
      return caches.match('/');
    }
    
    return new Response('Offline', { 
      status: 503,
      headers: { 'Content-Type': 'text/plain' }
    });
  }
}

// Stale While Revalidate - optimal for CSS/JS that changes occasionally
async function staleWhileRevalidate(request) {
  const cache = await caches.open(CACHE_NAME);
  const cachedResponse = await cache.match(request);
  
  const fetchPromise = fetch(request).then((networkResponse) => {
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  }).catch(() => {
    console.log('Network failed for:', request.url);
  });
  
  return cachedResponse || fetchPromise;
}

// Background sync for analytics and form submissions
self.addEventListener('sync', (event) => {
  if (event.tag === 'analytics-sync') {
    event.waitUntil(syncAnalytics());
  }
});

async function syncAnalytics() {
  // Sync offline analytics data when connection is restored
  console.log('Service Worker: Syncing analytics data');
}

// Push notifications for professional updates (if needed)
self.addEventListener('push', (event) => {
  if (event.data) {
    const data = event.data.json();
    const options = {
      body: data.body,
      icon: '/images/favicon-192x192.png',
      badge: '/images/favicon-72x72.png',
      data: data.url,
      actions: [
        {
          action: 'view',
          title: 'View',
          icon: '/images/view-icon.png'
        }
      ]
    };
    
    event.waitUntil(
      self.registration.showNotification(data.title, options)
    );
  }
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  if (event.action === 'view') {
    event.waitUntil(
      clients.openWindow(event.notification.data)
    );
  }
});

// Periodic background sync for cache updates
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'cache-update') {
    event.waitUntil(updateCaches());
  }
});

async function updateCaches() {
  console.log('Service Worker: Updating caches in background');
  const cache = await caches.open(STATIC_CACHE);
  return cache.addAll(STATIC_ASSETS);
}