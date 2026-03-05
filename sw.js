/**
 * Tiny Seed Farm - Service Worker v9
 * Optimized PWA with advanced caching strategies
 * - Cache-first for static assets
 * - Network-first for API calls
 * - Background sync for offline task completion
 * - Push notification support
 * - Fixed: Response clone race condition in staleWhileRevalidate
 * - v8: Force cache refresh for Voice Profile modal fix
 * - v9: Added sync-market-sales for offline farmers market sales
 * - v10: Force cache refresh for CSP fix + auth token injection
 */

const CACHE_VERSION = 'v12';
const CACHE_NAME = `tiny-seed-mobile-${CACHE_VERSION}`;
const STATIC_CACHE_NAME = `tiny-seed-static-${CACHE_VERSION}`;
const DYNAMIC_CACHE_NAME = `tiny-seed-dynamic-${CACHE_VERSION}`;
const API_CACHE_NAME = `tiny-seed-api-${CACHE_VERSION}`;
const OFFLINE_URL = '/offline.html';

// Static assets to cache immediately on install (cache-first strategy)
const STATIC_ASSETS = [
  '/',
  '/employee.html',
  '/login.html',
  '/offline.html',
  '/manifest.json',
  '/install-prompt.js',
  // Offline task management
  '/web_app/offline-task-manager.js',
  '/web_app/api-config.js',
  // Icons (only cache icons that exist)
  '/icons/icon.svg'
];

// HTML pages to cache for offline navigation
const HTML_PAGES = [
  '/quick-seed.html',
  '/inventory_capture.html',
  '/web_app/driver.html',
  '/web_app/csa.html',
  '/web_app/customer.html',
  '/web_app/neighbor.html',
  '/web_app/market-sales.html',
  '/web_app/farmers-market.html',
  '/web_app/delivery-zone-checker.html'
];

// External resources (attempt to cache, but don't fail install)
const EXTERNAL_RESOURCES = [
  'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css'
];

// API patterns to use network-first strategy
const API_PATTERNS = [
  /script\.google\.com/,
  /\/macros\//,
  /\/api\//,
  /googleapis\.com/
];

// Cache duration settings (in milliseconds)
const CACHE_DURATION = {
  static: 7 * 24 * 60 * 60 * 1000,    // 7 days
  dynamic: 24 * 60 * 60 * 1000,        // 1 day
  api: 5 * 60 * 1000                   // 5 minutes
};

/**
 * Install Event - Pre-cache critical assets
 */
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker v4...');

  event.waitUntil(
    Promise.all([
      // Cache static assets (use Promise.allSettled so one failure doesn't break everything)
      caches.open(STATIC_CACHE_NAME)
        .then((cache) => {
          console.log('[SW] Pre-caching static assets');
          return Promise.allSettled(
            STATIC_ASSETS.map(url =>
              cache.add(url).catch(err => console.log('[SW] Could not cache:', url, err))
            )
          );
        }),
      // Try to cache HTML pages
      caches.open(CACHE_NAME)
        .then((cache) => {
          return Promise.allSettled(
            HTML_PAGES.map(url =>
              cache.add(url).catch(err => console.log('[SW] Could not cache:', url))
            )
          );
        }),
      // Try to cache external resources
      caches.open(DYNAMIC_CACHE_NAME)
        .then((cache) => {
          return Promise.allSettled(
            EXTERNAL_RESOURCES.map(url =>
              fetch(url, { mode: 'cors' })
                .then(response => {
                  if (response.ok) {
                    return cache.put(url, response);
                  }
                })
                .catch(err => console.log('[SW] Could not cache external:', url))
            )
          );
        })
    ])
    .then(() => self.skipWaiting())
  );
});

/**
 * Activate Event - Clean up old caches
 */
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker v4...');

  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            // Delete old version caches
            if (!cacheName.includes(CACHE_VERSION)) {
              console.log('[SW] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => self.clients.claim())
      .then(() => {
        // Notify clients of update
        return self.clients.matchAll().then(clients => {
          clients.forEach(client => {
            client.postMessage({
              type: 'SW_UPDATED',
              version: CACHE_VERSION
            });
          });
        });
      })
  );
});

/**
 * Fetch Event - Advanced caching strategies
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
  if (isAPIRequest(url)) {
    // Network-first for API calls
    event.respondWith(networkFirstStrategy(request));
  } else if (isStaticAsset(url)) {
    // Cache-first for static assets
    event.respondWith(cacheFirstStrategy(request));
  } else if (request.mode === 'navigate') {
    // Network-first with offline fallback for navigation
    event.respondWith(navigationStrategy(request));
  } else {
    // Stale-while-revalidate for everything else
    event.respondWith(staleWhileRevalidate(request));
  }
});

/**
 * Check if request is an API call
 */
function isAPIRequest(url) {
  return API_PATTERNS.some(pattern => pattern.test(url.href));
}

/**
 * Check if request is for a static asset
 */
function isStaticAsset(url) {
  const staticExtensions = ['.js', '.css', '.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico', '.woff', '.woff2'];
  return staticExtensions.some(ext => url.pathname.endsWith(ext));
}

/**
 * Cache-first strategy for static assets
 */
async function cacheFirstStrategy(request) {
  const cachedResponse = await caches.match(request);

  if (cachedResponse) {
    // Return cached version immediately
    // Update cache in background
    updateCacheInBackground(request);
    return cachedResponse;
  }

  // Not in cache, fetch from network
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(STATIC_CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    console.log('[SW] Cache-first fetch failed:', request.url);
    return new Response('', { status: 408, statusText: 'Request Timeout' });
  }
}

/**
 * Network-first strategy for API calls
 */
async function networkFirstStrategy(request) {
  try {
    const response = await fetch(request, { timeout: 10000 });

    // Cache successful API responses briefly
    if (response.ok) {
      const cache = await caches.open(API_CACHE_NAME);
      cache.put(request, response.clone());
    }

    return response;
  } catch (error) {
    console.log('[SW] Network-first failed, checking cache:', request.url);

    // Try cache fallback
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      // Add header to indicate this is cached data
      const headers = new Headers(cachedResponse.headers);
      headers.set('X-From-Cache', 'true');
      return new Response(cachedResponse.body, {
        status: cachedResponse.status,
        statusText: cachedResponse.statusText,
        headers
      });
    }

    // Return offline-aware error response for API calls
    return new Response(JSON.stringify({
      error: 'offline',
      message: 'You are currently offline. Your request will be synced when connection is restored.',
      cached: false
    }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

/**
 * Navigation strategy with offline fallback
 */
async function navigationStrategy(request) {
  try {
    const response = await fetch(request);

    // Cache the navigation response
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }

    return response;
  } catch (error) {
    console.log('[SW] Navigation failed, trying cache:', request.url);

    // Try to serve cached version
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }

    // Fall back to offline page
    const offlinePage = await caches.match(OFFLINE_URL);
    if (offlinePage) {
      return offlinePage;
    }

    // Last resort: return basic offline message
    return new Response(
      '<html><body><h1>Offline</h1><p>Please check your connection.</p></body></html>',
      { headers: { 'Content-Type': 'text/html' } }
    );
  }
}

/**
 * Stale-while-revalidate strategy
 */
async function staleWhileRevalidate(request) {
  const cachedResponse = await caches.match(request);

  // Start network fetch in background
  const fetchPromise = fetch(request)
    .then(response => {
      if (response.ok) {
        // Clone response SYNCHRONOUSLY before any async operations
        const responseToCache = response.clone();
        caches.open(DYNAMIC_CACHE_NAME).then(c => c.put(request, responseToCache));
      }
      return response;
    })
    .catch(() => null);

  // Return cached response immediately, or wait for network
  return cachedResponse || fetchPromise || new Response('', { status: 408 });
}

/**
 * Update cache in background
 */
function updateCacheInBackground(request) {
  fetch(request)
    .then(response => {
      if (response.ok) {
        caches.open(STATIC_CACHE_NAME).then(cache => {
          cache.put(request, response);
        });
      }
    })
    .catch(() => {});
}

/**
 * Background Sync for offline task completion
 */
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync triggered:', event.tag);

  if (event.tag === 'sync-tasks') {
    event.waitUntil(syncOfflineTasks());
  } else if (event.tag === 'sync-timeclock') {
    event.waitUntil(syncTimeclockEntries());
  } else if (event.tag === 'sync-harvests') {
    event.waitUntil(syncHarvestData());
  } else if (event.tag === 'sync-market-sales') {
    event.waitUntil(syncMarketSales());
  } else if (event.tag === 'sync-all') {
    event.waitUntil(syncAllPendingData());
  }
});

/**
 * Sync offline tasks - Process pending actions from IndexedDB
 */
async function syncOfflineTasks() {
  const clients = await self.clients.matchAll();

  // Notify clients that sync is starting
  clients.forEach(client => {
    client.postMessage({
      type: 'SYNC_STARTED',
      category: 'tasks',
      timestamp: Date.now()
    });
  });

  try {
    // Try to process pending actions directly from IndexedDB
    const pendingActions = await getPendingActionsFromIDB();

    if (pendingActions.length === 0) {
      console.log('[SW] No pending task actions to sync');
      clients.forEach(client => {
        client.postMessage({
          type: 'SYNC_COMPLETE',
          category: 'tasks',
          synced: 0,
          timestamp: Date.now()
        });
      });
      return;
    }

    console.log(`[SW] Processing ${pendingActions.length} pending task actions`);

    let synced = 0;
    let failed = 0;
    let conflicts = 0;

    for (const action of pendingActions) {
      try {
        const result = await processTaskAction(action);

        if (result.success) {
          await markActionSynced(action.id);
          synced++;
        } else if (result.conflict) {
          // Server wins - notify client to update local cache
          await markActionSynced(action.id);
          conflicts++;
          clients.forEach(client => {
            client.postMessage({
              type: 'TASK_CONFLICT_RESOLVED',
              taskId: action.taskId,
              serverData: result.serverData,
              timestamp: Date.now()
            });
          });
        } else {
          failed++;
          await incrementRetryCount(action.id);
        }
      } catch (error) {
        console.error('[SW] Action sync error:', error);
        failed++;
        await incrementRetryCount(action.id);
      }
    }

    // Notify clients of sync results
    clients.forEach(client => {
      client.postMessage({
        type: 'SYNC_COMPLETE',
        category: 'tasks',
        synced,
        failed,
        conflicts,
        timestamp: Date.now()
      });
    });

    // Also send SYNC_AVAILABLE for OfflineTaskManager to trigger UI update
    clients.forEach(client => {
      client.postMessage({
        type: 'SYNC_AVAILABLE',
        timestamp: Date.now()
      });
    });

  } catch (error) {
    console.error('[SW] Task sync failed:', error);
    clients.forEach(client => {
      client.postMessage({
        type: 'SYNC_FAILED',
        category: 'tasks',
        error: error.message,
        timestamp: Date.now()
      });
    });
  }
}

/**
 * Get pending actions from IndexedDB (OfflineTaskManager database)
 */
async function getPendingActionsFromIDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('TinySeedOfflineTasks', 1);

    request.onerror = () => {
      console.log('[SW] IndexedDB not available for task sync');
      resolve([]);
    };

    request.onsuccess = (event) => {
      const db = event.target.result;

      if (!db.objectStoreNames.contains('pendingActions')) {
        db.close();
        resolve([]);
        return;
      }

      const tx = db.transaction('pendingActions', 'readonly');
      const store = tx.objectStore('pendingActions');
      const index = store.index('status');
      const getRequest = index.getAll('pending');

      getRequest.onsuccess = () => {
        db.close();
        const actions = getRequest.result || [];
        // Sort by creation time (oldest first)
        actions.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
        resolve(actions);
      };

      getRequest.onerror = () => {
        db.close();
        resolve([]);
      };
    };
  });
}

/**
 * Process a single task action via API
 */
async function processTaskAction(action) {
  const API_URL = 'https://script.google.com/macros/s/AKfycbyT60fyrNfmZkgK3z1-ojgISeZBAbBr9Zz50UtSjqSysE5JpB_cAIjp2KFucwREG4qm/exec';

  let apiAction, apiData;

  switch (action.action) {
    case 'complete':
      apiAction = 'updateUnifiedTask';
      apiData = {
        taskId: action.taskId,
        status: 'DONE',
        completedAt: action.data.completedAt || new Date().toISOString(),
        ...action.data
      };
      break;

    case 'update':
      apiAction = 'updateUnifiedTask';
      apiData = {
        taskId: action.taskId,
        ...action.data
      };
      break;

    case 'start':
      apiAction = 'updateUnifiedTask';
      apiData = {
        taskId: action.taskId,
        status: 'IN_PROGRESS',
        startedAt: action.data.startedAt || new Date().toISOString(),
        ...action.data
      };
      break;

    default:
      return { success: false, error: `Unknown action type: ${action.action}` };
  }

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: apiAction, ...apiData })
    });

    const result = await response.json();

    if (result.conflict || result.error === 'CONFLICT') {
      return { success: false, conflict: true, serverData: result.currentData || result.task };
    }

    if (result.success || result.status === 'success') {
      return { success: true, serverData: result.task || result.data };
    }

    return { success: false, error: result.error || result.message || 'Unknown error' };

  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Mark action as synced in IndexedDB
 */
async function markActionSynced(actionId) {
  return new Promise((resolve) => {
    const request = indexedDB.open('TinySeedOfflineTasks', 1);

    request.onerror = () => resolve();

    request.onsuccess = (event) => {
      const db = event.target.result;

      if (!db.objectStoreNames.contains('pendingActions')) {
        db.close();
        resolve();
        return;
      }

      const tx = db.transaction('pendingActions', 'readwrite');
      const store = tx.objectStore('pendingActions');
      const getRequest = store.get(actionId);

      getRequest.onsuccess = () => {
        const action = getRequest.result;
        if (action) {
          action.status = 'completed';
          action.completedAt = new Date().toISOString();
          store.put(action);
        }
      };

      tx.oncomplete = () => {
        db.close();
        resolve();
      };

      tx.onerror = () => {
        db.close();
        resolve();
      };
    };
  });
}

/**
 * Increment retry count for failed action
 */
async function incrementRetryCount(actionId) {
  return new Promise((resolve) => {
    const request = indexedDB.open('TinySeedOfflineTasks', 1);

    request.onerror = () => resolve();

    request.onsuccess = (event) => {
      const db = event.target.result;

      if (!db.objectStoreNames.contains('pendingActions')) {
        db.close();
        resolve();
        return;
      }

      const tx = db.transaction('pendingActions', 'readwrite');
      const store = tx.objectStore('pendingActions');
      const getRequest = store.get(actionId);

      getRequest.onsuccess = () => {
        const action = getRequest.result;
        if (action) {
          action.retryCount = (action.retryCount || 0) + 1;
          action.lastAttempt = new Date().toISOString();

          // Mark as failed after 3 retries
          if (action.retryCount >= 3) {
            action.status = 'failed';
          }

          store.put(action);
        }
      };

      tx.oncomplete = () => {
        db.close();
        resolve();
      };

      tx.onerror = () => {
        db.close();
        resolve();
      };
    };
  });
}

/**
 * Sync market sales - Process pending sales from IndexedDB
 */
async function syncMarketSales() {
  const clients = await self.clients.matchAll();

  clients.forEach(client => {
    client.postMessage({
      type: 'SYNC_STARTED',
      category: 'market-sales',
      timestamp: Date.now()
    });
  });

  try {
    const pendingSales = await getPendingMarketSalesFromIDB();

    if (pendingSales.length === 0) {
      console.log('[SW] No pending market sales to sync');
      clients.forEach(client => {
        client.postMessage({
          type: 'SYNC_COMPLETE',
          category: 'market-sales',
          synced: 0,
          timestamp: Date.now()
        });
      });
      return;
    }

    console.log(`[SW] Processing ${pendingSales.length} pending market sales`);

    let synced = 0;
    let failed = 0;
    const API_URL = 'https://script.google.com/macros/s/AKfycbyT60fyrNfmZkgK3z1-ojgISeZBAbBr9Zz50UtSjqSysE5JpB_cAIjp2KFucwREG4qm/exec';

    for (const sale of pendingSales) {
      try {
        const response = await fetch(API_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'recordMarketSale',
            sessionId: sale.sessionId,
            items: JSON.stringify(sale.items),
            paymentMethod: sale.paymentMethod,
            offlineCreatedAt: sale.createdAt
          })
        });

        const result = await response.json();

        if (result.success) {
          await markMarketSaleSynced(sale.id);
          synced++;
        } else {
          failed++;
          await incrementMarketSaleRetry(sale.id);
        }
      } catch (error) {
        console.error('[SW] Market sale sync error:', error);
        failed++;
        await incrementMarketSaleRetry(sale.id);
      }
    }

    // Notify clients
    clients.forEach(client => {
      client.postMessage({
        type: 'SYNC_COMPLETE',
        category: 'market-sales',
        synced,
        failed,
        timestamp: Date.now()
      });
    });

  } catch (error) {
    console.error('[SW] Market sales sync failed:', error);
    clients.forEach(client => {
      client.postMessage({
        type: 'SYNC_FAILED',
        category: 'market-sales',
        error: error.message,
        timestamp: Date.now()
      });
    });
  }
}

/**
 * Get pending market sales from IndexedDB
 */
async function getPendingMarketSalesFromIDB() {
  return new Promise((resolve) => {
    const request = indexedDB.open('TinySeedMarketSales', 1);

    request.onerror = () => resolve([]);

    request.onsuccess = (event) => {
      const db = event.target.result;

      if (!db.objectStoreNames.contains('pendingSales')) {
        db.close();
        resolve([]);
        return;
      }

      const tx = db.transaction('pendingSales', 'readonly');
      const store = tx.objectStore('pendingSales');
      const index = store.index('status');
      const getRequest = index.getAll('pending');

      getRequest.onsuccess = () => {
        db.close();
        const sales = getRequest.result || [];
        sales.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
        resolve(sales);
      };

      getRequest.onerror = () => {
        db.close();
        resolve([]);
      };
    };
  });
}

/**
 * Mark market sale as synced
 */
async function markMarketSaleSynced(saleId) {
  return new Promise((resolve) => {
    const request = indexedDB.open('TinySeedMarketSales', 1);

    request.onerror = () => resolve();

    request.onsuccess = (event) => {
      const db = event.target.result;

      if (!db.objectStoreNames.contains('pendingSales')) {
        db.close();
        resolve();
        return;
      }

      const tx = db.transaction('pendingSales', 'readwrite');
      const store = tx.objectStore('pendingSales');
      const getRequest = store.get(saleId);

      getRequest.onsuccess = () => {
        const sale = getRequest.result;
        if (sale) {
          sale.status = 'synced';
          sale.syncedAt = new Date().toISOString();
          store.put(sale);
        }
      };

      tx.oncomplete = () => {
        db.close();
        resolve();
      };
    };
  });
}

/**
 * Increment retry count for failed market sale
 */
async function incrementMarketSaleRetry(saleId) {
  return new Promise((resolve) => {
    const request = indexedDB.open('TinySeedMarketSales', 1);

    request.onerror = () => resolve();

    request.onsuccess = (event) => {
      const db = event.target.result;

      if (!db.objectStoreNames.contains('pendingSales')) {
        db.close();
        resolve();
        return;
      }

      const tx = db.transaction('pendingSales', 'readwrite');
      const store = tx.objectStore('pendingSales');
      const getRequest = store.get(saleId);

      getRequest.onsuccess = () => {
        const sale = getRequest.result;
        if (sale) {
          sale.retryCount = (sale.retryCount || 0) + 1;
          if (sale.retryCount >= 5) {
            sale.status = 'failed';
          }
          store.put(sale);
        }
      };

      tx.oncomplete = () => {
        db.close();
        resolve();
      };
    };
  });
}

/**
 * Sync timeclock entries
 */
async function syncTimeclockEntries() {
  const clients = await self.clients.matchAll();

  clients.forEach(client => {
    client.postMessage({
      type: 'SYNC_TIMECLOCK_REQUEST',
      timestamp: Date.now()
    });
  });
}

/**
 * Sync harvest data
 */
async function syncHarvestData() {
  const clients = await self.clients.matchAll();

  clients.forEach(client => {
    client.postMessage({
      type: 'SYNC_HARVESTS_REQUEST',
      timestamp: Date.now()
    });
  });
}

/**
 * Sync all pending data
 */
async function syncAllPendingData() {
  await Promise.all([
    syncOfflineTasks(),
    syncTimeclockEntries(),
    syncHarvestData(),
    syncMarketSales()
  ]);
}

/**
 * Push Notification Handler
 */
self.addEventListener('push', (event) => {
  console.log('[SW] Push notification received');

  if (!event.data) {
    console.log('[SW] No push data');
    return;
  }

  let data;
  try {
    data = event.data.json();
  } catch (e) {
    data = {
      title: 'Tiny Seed Farm',
      body: event.data.text(),
      icon: '/icons/icon-192.png'
    };
  }

  const options = {
    body: data.body || 'New notification from Tiny Seed Farm',
    icon: data.icon || '/icons/icon-192.png',
    badge: data.badge || '/icons/icon-72.png',
    vibrate: data.vibrate || [100, 50, 100, 50, 100],
    tag: data.tag || 'tiny-seed-notification',
    renotify: data.renotify || false,
    requireInteraction: data.requireInteraction || false,
    silent: data.silent || false,
    data: {
      url: data.url || '/employee.html',
      category: data.category || 'general',
      ...data.data
    },
    actions: data.actions || [
      {
        action: 'open',
        title: 'Open App'
      },
      {
        action: 'dismiss',
        title: 'Dismiss'
      }
    ]
  };

  // Add timestamp if not present
  if (!options.timestamp) {
    options.timestamp = Date.now();
  }

  event.waitUntil(
    self.registration.showNotification(data.title || 'Tiny Seed Farm', options)
  );
});

/**
 * Notification Click Handler
 */
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked:', event.action);

  event.notification.close();

  if (event.action === 'dismiss') {
    return;
  }

  const url = event.notification.data?.url || '/employee.html';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((windowClients) => {
        // Check if app is already open
        for (const client of windowClients) {
          if (client.url.includes('employee.html') && 'focus' in client) {
            // Navigate to specific URL if different
            if (url !== '/employee.html' && 'navigate' in client) {
              client.navigate(url);
            }
            return client.focus();
          }
        }
        // Open new window if not
        if (clients.openWindow) {
          return clients.openWindow(url);
        }
      })
  );
});

/**
 * Notification Close Handler
 */
self.addEventListener('notificationclose', (event) => {
  console.log('[SW] Notification closed:', event.notification.tag);

  // Track notification dismissal if needed
  const data = event.notification.data;
  if (data?.trackDismissal) {
    // Send dismissal tracking to clients
    self.clients.matchAll().then(clients => {
      clients.forEach(client => {
        client.postMessage({
          type: 'NOTIFICATION_DISMISSED',
          tag: event.notification.tag,
          category: data.category,
          timestamp: Date.now()
        });
      });
    });
  }
});

/**
 * Message Handler - Communication with main app
 */
self.addEventListener('message', (event) => {
  const { type, data } = event.data || {};

  switch (type) {
    case 'SKIP_WAITING':
      self.skipWaiting();
      break;

    case 'CACHE_URLS':
      event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
          return cache.addAll(data.urls || []);
        })
      );
      break;

    case 'CLEAR_CACHE':
      event.waitUntil(
        caches.keys().then(cacheNames => {
          return Promise.all(
            cacheNames.map(cacheName => caches.delete(cacheName))
          );
        })
      );
      break;

    case 'GET_CACHE_SIZE':
      getCacheSize().then(size => {
        event.source.postMessage({
          type: 'CACHE_SIZE',
          size
        });
      });
      break;

    case 'SYNC_COMPLETE':
      // Handle sync complete notification from client
      console.log('[SW] Sync complete:', data);
      break;

    case 'REGISTER_PERIODIC_SYNC':
      if ('periodicSync' in self.registration) {
        self.registration.periodicSync.register(data.tag, {
          minInterval: data.minInterval || 24 * 60 * 60 * 1000 // Default 24 hours
        });
      }
      break;

    case 'REGISTER_SCHEDULE':
      // Store employee schedule for background clock-in reminders
      if (data) {
        _registeredSchedules[data.employeeId] = {
          employeeName: data.employeeName,
          startTime: data.startTime,
          language: data.language || 'en',
          registeredAt: Date.now()
        };
        console.log('[SW] Schedule registered for', data.employeeName, '- start:', data.startTime);
        // Start background check if not already running
        startBackgroundClockCheck();
      }
      break;

    case 'CLOCK_STATUS_UPDATE':
      // Client informs SW that employee clocked in (stop reminders)
      if (data && data.employeeId) {
        if (_registeredSchedules[data.employeeId]) {
          _registeredSchedules[data.employeeId].clockedIn = data.isClockedIn;
        }
      }
      break;

    default:
      console.log('[SW] Unknown message type:', type);
  }
});

/**
 * Periodic Background Sync (if supported)
 */
self.addEventListener('periodicsync', (event) => {
  console.log('[SW] Periodic sync:', event.tag);

  if (event.tag === 'daily-sync') {
    event.waitUntil(syncAllPendingData());
  } else if (event.tag === 'weather-update') {
    event.waitUntil(prefetchWeatherData());
  }
});

/**
 * Prefetch weather data for offline use
 */
async function prefetchWeatherData() {
  // Notify clients to update weather cache
  const clients = await self.clients.matchAll();
  clients.forEach(client => {
    client.postMessage({
      type: 'PREFETCH_WEATHER',
      timestamp: Date.now()
    });
  });
}

/**
 * Get total cache size
 */
async function getCacheSize() {
  if (!('storage' in navigator) || !('estimate' in navigator.storage)) {
    return null;
  }

  const estimate = await navigator.storage.estimate();
  return {
    usage: estimate.usage,
    quota: estimate.quota,
    percent: Math.round((estimate.usage / estimate.quota) * 100)
  };
}

/**
 * Clean expired cache entries
 */
async function cleanExpiredCache() {
  // This would be called periodically to clean old cache entries
  // For now, we rely on versioned cache names for cleanup
  console.log('[SW] Cache cleanup triggered');
}

// ============================================
// BACKGROUND CLOCK-IN REMINDER SYSTEM
// ============================================

// In-memory schedule storage (persists as long as SW is alive)
var _registeredSchedules = {};
var _clockCheckInterval = null;

function startBackgroundClockCheck() {
  if (_clockCheckInterval) return;
  // Check every 5 minutes
  _clockCheckInterval = setInterval(backgroundClockCheck, 300000);
  // First check after 30 seconds
  setTimeout(backgroundClockCheck, 30000);
  console.log('[SW] Background clock check started');
}

function backgroundClockCheck() {
  var now = new Date();
  var today = now.toISOString().split('T')[0];

  Object.keys(_registeredSchedules).forEach(function(empId) {
    var sched = _registeredSchedules[empId];
    if (!sched || sched.clockedIn) return;

    // Only remind once per day
    var reminderKey = 'sw_reminded_' + empId + '_' + today;
    if (sched._reminded === today) return;

    var scheduled = parseScheduleTimeSW(sched.startTime);
    if (!scheduled) return;

    var diffMin = (now - scheduled) / 60000;
    // Remind if within 15 min before to 30 min after scheduled start
    if (diffMin >= -15 && diffMin <= 30) {
      sched._reminded = today;

      var isEs = sched.language === 'es';
      var body = isEs
        ? 'Hola ' + (sched.employeeName || '') + '! Es hora de registrar entrada.'
        : 'Hey ' + (sched.employeeName || '') + '! Time to clock in.';

      self.registration.showNotification('Tiny Seed Farm', {
        body: body,
        icon: '/web_app/favicon-192x192.png',
        badge: '/web_app/favicon-64x64.png',
        tag: 'clock-reminder-' + empId,
        requireInteraction: true,
        vibrate: [200, 100, 200],
        data: {
          url: '/employee.html',
          category: 'clock-reminder'
        },
        actions: [
          { action: 'open', title: isEs ? 'Abrir App' : 'Open App' },
          { action: 'dismiss', title: isEs ? 'Cerrar' : 'Dismiss' }
        ]
      });
      console.log('[SW] Clock reminder sent to', sched.employeeName);
    }
  });
}

function parseScheduleTimeSW(timeStr) {
  if (!timeStr) return null;
  var today = new Date();
  var match = timeStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
  if (!match) return null;
  var h = parseInt(match[1], 10);
  var m = parseInt(match[2], 10);
  if (match[3]) {
    var ampm = match[3].toUpperCase();
    if (ampm === 'PM' && h !== 12) h += 12;
    if (ampm === 'AM' && h === 12) h = 0;
  }
  return new Date(today.getFullYear(), today.getMonth(), today.getDate(), h, m, 0);
}

console.log('[SW] Service worker v12 loaded');
