# PWA & Offline-First Architecture

## What Is Offline-First?

A design philosophy that prioritizes resilience by assuming network connectivity is unreliable or absent. Rather than treating offline capability as an edge case, offline-first makes it the default behavior.

---

## Why It Matters for Tiny Seed OS

- **Rural locations** - Farms often have spotty internet
- **Field work** - Employees in fields without WiFi
- **Delivery routes** - Drivers in areas with no signal
- **Reliability** - System works regardless of connectivity

---

## Service Worker Caching Strategies

| Strategy | Use Case | How It Works |
|----------|----------|--------------|
| **Cache-First** | Static assets (CSS, JS, images) | Check cache, fallback to network |
| **Network-First** | Dynamic API data | Try network, fallback to cache |
| **Stale-While-Revalidate** | Semi-dynamic content | Serve cache, update in background |
| **Network-Only** | Sensitive operations | Never cache (payments, auth) |
| **Cache-Only** | Offline page | Always from cache |

---

## Implementation for Tiny Seed OS

### Service Worker Registration

```javascript
// In main HTML file
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then(reg => console.log('SW registered:', reg.scope))
      .catch(err => console.log('SW registration failed:', err));
  });
}
```

### Service Worker (sw.js)

```javascript
const CACHE_NAME = 'tinyseed-v1';
const STATIC_ASSETS = [
  '/',
  '/web_app/index.html',
  '/web_app/customer.html',
  '/web_app/driver.html',
  '/web_app/api-config.js',
  '/web_app/auth-guard.js',
  '/offline.html'
];

// Install - cache static assets
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting())
  );
});

// Activate - clean old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.filter(key => key !== CACHE_NAME)
            .map(key => caches.delete(key))
      );
    })
  );
});

// Fetch - serve from cache or network
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // API calls - network first, cache fallback
  if (url.pathname.includes('/exec')) {
    event.respondWith(networkFirst(event.request));
    return;
  }

  // Static assets - cache first
  event.respondWith(cacheFirst(event.request));
});

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    const cache = await caches.open(CACHE_NAME);
    cache.put(request, response.clone());
    return response;
  } catch (e) {
    return caches.match('/offline.html');
  }
}

async function networkFirst(request) {
  try {
    const response = await fetch(request);
    const cache = await caches.open(CACHE_NAME);
    cache.put(request, response.clone());
    return response;
  } catch (e) {
    const cached = await caches.match(request);
    return cached || new Response(JSON.stringify({ error: 'Offline' }), {
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
```

---

## IndexedDB for Offline Data

```javascript
const DB_NAME = 'TinySeedDB';
const DB_VERSION = 1;

function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;

      // Tasks store
      if (!db.objectStoreNames.contains('tasks')) {
        const store = db.createObjectStore('tasks', { keyPath: 'id' });
        store.createIndex('status', 'status');
        store.createIndex('syncStatus', 'syncStatus');
      }

      // Time entries store
      if (!db.objectStoreNames.contains('timeEntries')) {
        const store = db.createObjectStore('timeEntries', { keyPath: 'id' });
        store.createIndex('syncStatus', 'syncStatus');
      }

      // Deliveries store
      if (!db.objectStoreNames.contains('deliveries')) {
        db.createObjectStore('deliveries', { keyPath: 'id' });
      }
    };
  });
}

// Save data locally
async function saveLocally(storeName, data) {
  const db = await openDB();
  const tx = db.transaction(storeName, 'readwrite');
  const store = tx.objectStore(storeName);

  data.syncStatus = 'pending';
  data.localUpdatedAt = new Date().toISOString();

  store.put(data);
  return tx.complete;
}

// Get pending sync items
async function getPendingSync(storeName) {
  const db = await openDB();
  const tx = db.transaction(storeName, 'readonly');
  const store = tx.objectStore(storeName);
  const index = store.index('syncStatus');

  return index.getAll('pending');
}
```

---

## Background Sync

```javascript
// Register sync when saving offline
async function saveWithSync(storeName, data) {
  await saveLocally(storeName, data);

  if ('serviceWorker' in navigator && 'SyncManager' in window) {
    const reg = await navigator.serviceWorker.ready;
    await reg.sync.register('sync-' + storeName);
  }
}

// In service worker
self.addEventListener('sync', event => {
  if (event.tag === 'sync-tasks') {
    event.waitUntil(syncTasks());
  }
  if (event.tag === 'sync-timeEntries') {
    event.waitUntil(syncTimeEntries());
  }
});

async function syncTasks() {
  const pending = await getPendingSync('tasks');

  for (const task of pending) {
    try {
      await fetch(API_URL, {
        method: 'POST',
        body: JSON.stringify({ action: 'updateTask', ...task })
      });
      await markSynced('tasks', task.id);
    } catch (e) {
      console.log('Sync failed, will retry:', e);
    }
  }
}
```

---

## Offline UI Patterns

### 1. Offline Indicator
```html
<div id="offlineBar" class="offline-bar" style="display: none;">
  <i class="fas fa-wifi-slash"></i>
  You're offline. Changes will sync when connected.
</div>

<script>
window.addEventListener('online', () => {
  document.getElementById('offlineBar').style.display = 'none';
});
window.addEventListener('offline', () => {
  document.getElementById('offlineBar').style.display = 'flex';
});
</script>
```

### 2. Optimistic Updates
```javascript
async function completeTask(taskId) {
  // Update UI immediately
  document.querySelector(`[data-task="${taskId}"]`).classList.add('completed');
  showToast('Task completed!');

  // Save locally
  await saveWithSync('tasks', { id: taskId, status: 'completed' });

  // Sync in background (will retry if offline)
}
```

### 3. Offline Fallback Page
```html
<!-- offline.html -->
<!DOCTYPE html>
<html>
<head>
  <title>Tiny Seed Farm - Offline</title>
  <style>
    body {
      font-family: system-ui;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      background: #1a1a2e;
      color: white;
      text-align: center;
    }
  </style>
</head>
<body>
  <div>
    <h1>You're Offline</h1>
    <p>Some features are still available:</p>
    <ul>
      <li>View cached tasks</li>
      <li>Log time (will sync later)</li>
      <li>View delivery route</li>
    </ul>
    <button onclick="location.reload()">Try Again</button>
  </div>
</body>
</html>
```

---

## Web App Manifest

```json
{
  "name": "Tiny Seed Farm OS",
  "short_name": "Tiny Seed",
  "start_url": "/web_app/index.html",
  "display": "standalone",
  "background_color": "#1a1a2e",
  "theme_color": "#22c55e",
  "icons": [
    {
      "src": "/icons/icon-192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "/icons/icon-512.png",
      "sizes": "512x512",
      "type": "image/png"
    }
  ]
}
```

---

## Priority Features for Offline

| Feature | Priority | Reason |
|---------|----------|--------|
| Time tracking | Critical | Field workers need this |
| Delivery routes | Critical | Drivers without signal |
| Task lists | High | View assignments anywhere |
| Photo capture | High | Queue uploads for later |
| Customer lookup | Medium | Cached customer data |
| Reports | Low | Can wait for connection |

---

## Sources
- [MDN - Service Workers](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Offline_and_background_operation)
- [Google Workbox](https://developers.google.com/web/tools/workbox)
- [MagicBell - Offline PWA Strategies](https://www.magicbell.com/blog/offline-first-pwas-service-worker-caching-strategies)
