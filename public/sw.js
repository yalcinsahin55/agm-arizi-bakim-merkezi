const DB_NAME = 'agm-offline';
const STORE_NAME = 'pending-breakdowns';
const DB_VERSION = 1;

function openDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) db.createObjectStore(STORE_NAME, { keyPath: 'id' });
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
    const clientsList = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const client of clientsList) client.postMessage({ type: 'offline-queue-flushed', sent });
  }
}

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));

self.addEventListener('sync', (e) => {
  if (e.tag === 'sync-breakdowns') e.waitUntil(flushQueue());
});

self.addEventListener('push', (e) => {
  let d = {};
  try { d = e.data?.json() || {}; } catch {}
  e.waitUntil(self.registration.showNotification(d.title || 'AGM Arıza', { body: d.body || '', data: d.data || {} }));
});

self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  const href = e.notification.data?.href || '/';
  e.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((cs) => {
      const c = cs[0];
      return c ? (c.navigate(href), c.focus()) : self.clients.openWindow(href);
    }),
  );
});
