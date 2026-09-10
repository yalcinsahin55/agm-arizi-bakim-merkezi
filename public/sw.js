const CACHE = 'agm-arizi-shell-v47';
const SHELL = ['/', '/giris', '/icon-192.png', '/icon-512.png', '/manifest.webmanifest'];

const DB_NAME = 'agm-offline';
const STORE_NAME = 'pending-breakdowns';
const DB_VERSION = 1;

function openDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME))
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function getAll(db) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const req = tx.objectStore(STORE_NAME).getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function remove(db, id) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function flushQueue() {
  const db = await openDb();
  const items = await getAll(db);
  let sent = 0;
  for (const item of items) {
    try {
      const res = await fetch('/api/breakdowns', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(item.payload),
      });
      if (res.ok || (res.status >= 400 && res.status < 500)) {
        await remove(db, item.id);
        if (res.ok) sent += 1;
      }
    } catch {
      break;
    }
  }
  db.close();
  if (sent > 0) {
    const clientsList = await self.clients.matchAll({
      type: 'window',
      includeUncontrolled: true,
    });
    for (const client of clientsList)
      client.postMessage({ type: 'offline-queue-flushed', sent });
  }
}

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches
      .open(CACHE)
      .then((c) => c.addAll(SHELL).catch(() => undefined))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  // API: network only
  if (url.pathname.startsWith('/api/')) return;
  // Navigation: network first, fallback cache
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
          return res;
        })
        .catch(() => caches.match(req).then((r) => r || caches.match('/'))),
    );
    return;
  }
  // Static: cache first for icons/manifest
  if (
    url.pathname.startsWith('/icon-') ||
    url.pathname === '/favicon.ico' ||
    url.pathname === '/apple-touch-icon.png' ||
    url.pathname.endsWith('.webmanifest')
  ) {
    e.respondWith(
      caches.match(req).then(
        (cached) =>
          cached ||
          fetch(req).then((res) => {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copy));
            return res;
          }),
      ),
    );
  }
});

self.addEventListener('sync', (e) => {
  if (e.tag === 'sync-breakdowns') e.waitUntil(flushQueue());
});

self.addEventListener('push', (e) => {
  let d = {};
  try {
    d = e.data?.json() || {};
  } catch {
    try {
      d = { body: e.data?.text() };
    } catch {}
  }
  const title = d.title || 'AGM Arıza';
  const options = {
    body: d.body || '',
    icon: d.icon || '/icon-192.png',
    badge: d.badge || '/icon-96.png',
    tag: d.tag || 'agm-arizi',
    renotify: d.renotify !== false,
    data: d.data || { href: '/' },
    vibrate: [80, 40, 80],
    actions: [
      { action: 'open', title: 'Aç' },
      { action: 'dismiss', title: 'Kapat' },
    ],
  };
  e.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  if (e.action === 'dismiss') return;
  const href = e.notification.data?.href || '/';
  e.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((cs) => {
      for (const c of cs) {
        if ('focus' in c) {
          if (c.url && 'navigate' in c) {
            try {
              c.navigate(href);
            } catch {}
          }
          return c.focus();
        }
      }
      return self.clients.openWindow(href);
    }),
  );
});
