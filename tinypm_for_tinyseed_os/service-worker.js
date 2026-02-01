/**
 * TinyPM Service Worker
 * Provides offline support, caching, and background sync
 * Version: 1.0.0
 */

const CACHE_VERSION = 'v1.0.0';
const STATIC_CACHE = `tinypm-static-${CACHE_VERSION}`;
const DYNAMIC_CACHE = `tinypm-dynamic-${CACHE_VERSION}`;
const API_CACHE = `tinypm-api-${CACHE_VERSION}`;

// Static assets to cache on install
const STATIC_ASSETS = [
  '/',
  '/web_dashboard.html',
  '/auth.html',
  '/onboarding.html',
  '/offline.html',
  '/manifest.json',
  '/pwa-assets/icon-192.png',
  '/pwa-assets/icon-512.png',
  '/pwa-assets/icon-192-maskable.png',
  '/pwa-assets/icon-512-maskable.png',
  '/pwa-assets/favicon-32x32.png',
  '/pwa-assets/apple-touch-icon-180.png'
];

// API endpoints that should use network-first strategy
const API_PATTERNS = [
  /\/api\//,
  /\/exec$/,
  /supabase/,
  /googleapis/
];

// Cache duration for API responses (5 minutes)
const API_CACHE_DURATION = 5 * 60 * 1000;

/**
 * Install Event - Pre-cache static assets
 */
self.addEventListener('install', (event) => {
  console.log('[ServiceWorker] Installing version:', CACHE_VERSION);

  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        console.log('[ServiceWorker] Pre-caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        console.log('[ServiceWorker] Install complete');
        // Skip waiting to activate immediately
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('[ServiceWorker] Install failed:', error);
      })
  );
});

/**
 * Activate Event - Clean up old caches
 */
self.addEventListener('activate', (event) => {
  console.log('[ServiceWorker] Activating version:', CACHE_VERSION);

  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((name) => {
              // Delete old caches that don't match current version
              return name.startsWith('tinypm-') &&
                     !name.includes(CACHE_VERSION);
            })
            .map((name) => {
              console.log('[ServiceWorker] Deleting old cache:', name);
              return caches.delete(name);
            })
        );
      })
      .then(() => {
        console.log('[ServiceWorker] Claiming clients');
        // Take control of all pages immediately
        return self.clients.claim();
      })
  );
});

/**
 * Fetch Event - Handle requests with appropriate caching strategy
 */
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Skip chrome-extension and other non-http(s) requests
  if (!url.protocol.startsWith('http')) {
    return;
  }

  // Determine caching strategy based on request type
  if (isApiRequest(url)) {
    // Network-first for API calls
    event.respondWith(networkFirst(request, API_CACHE));
  } else if (isStaticAsset(url)) {
    // Cache-first for static assets
    event.respondWith(cacheFirst(request, STATIC_CACHE));
  } else {
    // Stale-while-revalidate for everything else
    event.respondWith(staleWhileRevalidate(request, DYNAMIC_CACHE));
  }
});

/**
 * Check if request is an API call
 */
function isApiRequest(url) {
  return API_PATTERNS.some(pattern => pattern.test(url.href));
}

/**
 * Check if request is a static asset
 */
function isStaticAsset(url) {
  const staticExtensions = ['.html', '.css', '.js', '.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico', '.woff', '.woff2'];
  return staticExtensions.some(ext => url.pathname.endsWith(ext));
}

/**
 * Cache-First Strategy
 * Best for static assets that don't change often
 */
async function cacheFirst(request, cacheName) {
  try {
    const cache = await caches.open(cacheName);
    const cachedResponse = await cache.match(request);

    if (cachedResponse) {
      console.log('[ServiceWorker] Cache hit:', request.url);
      return cachedResponse;
    }

    console.log('[ServiceWorker] Cache miss, fetching:', request.url);
    const networkResponse = await fetch(request);

    // Cache successful responses
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }

    return networkResponse;
  } catch (error) {
    console.error('[ServiceWorker] Cache-first failed:', error);
    return getOfflineFallback(request);
  }
}

/**
 * Network-First Strategy
 * Best for API calls where fresh data is important
 */
async function networkFirst(request, cacheName) {
  try {
    const networkResponse = await fetch(request);

    // Cache successful responses
    if (networkResponse.ok) {
      const cache = await caches.open(cacheName);
      // Add timestamp to cached response
      const responseToCache = networkResponse.clone();
      cache.put(request, responseToCache);
    }

    return networkResponse;
  } catch (error) {
    console.log('[ServiceWorker] Network failed, trying cache:', request.url);

    const cache = await caches.open(cacheName);
    const cachedResponse = await cache.match(request);

    if (cachedResponse) {
      console.log('[ServiceWorker] Returning cached API response');
      return cachedResponse;
    }

    // Return offline JSON response for API calls
    return new Response(
      JSON.stringify({
        error: 'offline',
        message: 'You are currently offline. Your changes will sync when connected.',
        offline: true
      }),
      {
        status: 503,
        statusText: 'Service Unavailable',
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}

/**
 * Stale-While-Revalidate Strategy
 * Returns cached version immediately, updates in background
 */
async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cachedResponse = await cache.match(request);

  // Start network fetch in background
  const fetchPromise = fetch(request)
    .then((networkResponse) => {
      if (networkResponse.ok) {
        cache.put(request, networkResponse.clone());
      }
      return networkResponse;
    })
    .catch((error) => {
      console.log('[ServiceWorker] Background fetch failed:', error);
      return null;
    });

  // Return cached response immediately, or wait for network
  if (cachedResponse) {
    console.log('[ServiceWorker] Returning stale:', request.url);
    return cachedResponse;
  }

  try {
    const networkResponse = await fetchPromise;
    if (networkResponse) {
      return networkResponse;
    }
  } catch (error) {
    // Fall through to offline fallback
  }

  return getOfflineFallback(request);
}

/**
 * Get offline fallback response
 */
async function getOfflineFallback(request) {
  const url = new URL(request.url);

  // For HTML pages, show offline page
  if (request.headers.get('accept')?.includes('text/html')) {
    const cache = await caches.open(STATIC_CACHE);
    const offlinePage = await cache.match('/offline.html');
    if (offlinePage) {
      return offlinePage;
    }
  }

  // For images, return placeholder
  if (url.pathname.match(/\.(png|jpg|jpeg|gif|svg)$/)) {
    return new Response(
      `<svg width="200" height="200" xmlns="http://www.w3.org/2000/svg">
        <rect fill="#1a1d27" width="200" height="200"/>
        <text x="50%" y="50%" fill="#6b6f82" text-anchor="middle" dy=".3em" font-family="system-ui">Offline</text>
      </svg>`,
      { headers: { 'Content-Type': 'image/svg+xml' } }
    );
  }

  // Generic offline response
  return new Response('Offline', { status: 503, statusText: 'Service Unavailable' });
}

/**
 * Background Sync - Handle offline actions
 */
self.addEventListener('sync', (event) => {
  console.log('[ServiceWorker] Sync event:', event.tag);

  if (event.tag === 'sync-tasks') {
    event.waitUntil(syncTasks());
  } else if (event.tag === 'sync-projects') {
    event.waitUntil(syncProjects());
  } else if (event.tag === 'sync-all') {
    event.waitUntil(syncAll());
  }
});

/**
 * Sync pending tasks
 */
async function syncTasks() {
  try {
    const pendingActions = await getPendingActions('tasks');

    for (const action of pendingActions) {
      await processAction(action);
    }

    // Notify clients of successful sync
    notifyClients({ type: 'SYNC_COMPLETE', scope: 'tasks' });
  } catch (error) {
    console.error('[ServiceWorker] Task sync failed:', error);
  }
}

/**
 * Sync pending projects
 */
async function syncProjects() {
  try {
    const pendingActions = await getPendingActions('projects');

    for (const action of pendingActions) {
      await processAction(action);
    }

    notifyClients({ type: 'SYNC_COMPLETE', scope: 'projects' });
  } catch (error) {
    console.error('[ServiceWorker] Project sync failed:', error);
  }
}

/**
 * Sync all pending data
 */
async function syncAll() {
  await syncTasks();
  await syncProjects();
}

/**
 * Get pending actions from IndexedDB
 */
async function getPendingActions(scope) {
  // This would connect to IndexedDB in the client
  // Simplified for now - the client handles offline queue
  return [];
}

/**
 * Process a single queued action
 */
async function processAction(action) {
  const response = await fetch(action.url, {
    method: action.method,
    headers: action.headers,
    body: JSON.stringify(action.body)
  });

  if (!response.ok) {
    throw new Error(`Failed to sync: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Notify all clients of an event
 */
async function notifyClients(message) {
  const clients = await self.clients.matchAll({ type: 'window' });

  clients.forEach(client => {
    client.postMessage(message);
  });
}

/**
 * Push Notification Handler
 */
self.addEventListener('push', (event) => {
  console.log('[ServiceWorker] Push received');

  let data = {
    title: 'TinyPM',
    body: 'You have a new notification',
    icon: '/pwa-assets/icon-192.png',
    badge: '/pwa-assets/badge-72.png',
    tag: 'tinypm-notification'
  };

  if (event.data) {
    try {
      data = { ...data, ...event.data.json() };
    } catch (e) {
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body,
    icon: data.icon,
    badge: data.badge,
    tag: data.tag,
    vibrate: [100, 50, 100],
    data: {
      url: data.url || '/web_dashboard.html'
    },
    actions: data.actions || [
      { action: 'view', title: 'View' },
      { action: 'dismiss', title: 'Dismiss' }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

/**
 * Notification Click Handler
 */
self.addEventListener('notificationclick', (event) => {
  console.log('[ServiceWorker] Notification clicked:', event.action);

  event.notification.close();

  if (event.action === 'dismiss') {
    return;
  }

  const urlToOpen = event.notification.data?.url || '/web_dashboard.html';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((windowClients) => {
        // Check if there's already a window open
        for (const client of windowClients) {
          if (client.url.includes('web_dashboard') && 'focus' in client) {
            return client.focus();
          }
        }
        // Open new window if none exists
        if (self.clients.openWindow) {
          return self.clients.openWindow(urlToOpen);
        }
      })
  );
});

/**
 * Message Handler - Receive messages from clients
 */
self.addEventListener('message', (event) => {
  console.log('[ServiceWorker] Message received:', event.data);

  const { type, payload } = event.data || {};

  switch (type) {
    case 'SKIP_WAITING':
      self.skipWaiting();
      break;

    case 'CACHE_URLS':
      if (payload?.urls) {
        cacheUrls(payload.urls);
      }
      break;

    case 'CLEAR_CACHE':
      clearCache(payload?.cacheName);
      break;

    case 'GET_CACHE_STATUS':
      getCacheStatus().then(status => {
        event.source.postMessage({ type: 'CACHE_STATUS', payload: status });
      });
      break;
  }
});

/**
 * Cache specific URLs
 */
async function cacheUrls(urls) {
  const cache = await caches.open(DYNAMIC_CACHE);
  await cache.addAll(urls);
}

/**
 * Clear a specific cache or all caches
 */
async function clearCache(cacheName) {
  if (cacheName) {
    await caches.delete(cacheName);
  } else {
    const cacheNames = await caches.keys();
    await Promise.all(cacheNames.map(name => caches.delete(name)));
  }
}

/**
 * Get cache status information
 */
async function getCacheStatus() {
  const cacheNames = await caches.keys();
  const status = {};

  for (const name of cacheNames) {
    const cache = await caches.open(name);
    const keys = await cache.keys();
    status[name] = keys.length;
  }

  return status;
}

console.log('[ServiceWorker] Script loaded, version:', CACHE_VERSION);
