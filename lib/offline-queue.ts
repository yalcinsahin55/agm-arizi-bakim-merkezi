'use client';
// Basit bir IndexedDB kuyruğu: internet olmadığında oluşturulan arıza kayıtlarını
// tarayıcıda saklar; bağlantı gelince (Background Sync veya manuel) sunucuya gönderir.
// Not: Service worker (public/sw.js) da aynı veritabanına erişir, bu yüzden
// DB_NAME / STORE_NAME değerleri iki dosyada birebir aynı tutulmalıdır.
const DB_NAME = 'agm-offline';
const STORE_NAME = 'pending-breakdowns';
const DB_VERSION = 1;

export type QueuedBreakdown = {
    id: string;
    payload: Record<string, unknown>;
    createdAt: string;
};

function openDb(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
        if (typeof indexedDB === 'undefined') {
            reject(new Error('IndexedDB desteklenmiyor'));
            return;
        }
        const req = indexedDB.open(DB_NAME, DB_VERSION);
        req.onupgradeneeded = () => {
            const db = req.result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME, { keyPath: 'id' });
            }
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
    });
}

export async function queueBreakdown(payload: Record<string, unknown>): Promise<QueuedBreakdown> {
    const db = await openDb();
    const item: QueuedBreakdown = { id: crypto.randomUUID(), payload, createdAt: new Date().toISOString() };
    await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        tx.objectStore(STORE_NAME).put(item);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
    });
    db.close();
    return item;
}

export async function listQueued(): Promise<QueuedBreakdown[]> {
    const db = await openDb();
    const items = await new Promise<QueuedBreakdown[]>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const req = tx.objectStore(STORE_NAME).getAll();
        req.onsuccess = () => resolve(req.result as QueuedBreakdown[]);
        req.onerror = () => reject(req.error);
    });
    db.close();
    return items;
}

export async function removeQueued(id: string): Promise<void> {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        tx.objectStore(STORE_NAME).delete(id);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
    });
    db.close();
}

// Kuyruktaki kayıtları sırayla göndermeyi dener. Başarılı olanlar kuyruktan silinir.
// Background Sync desteklemeyen tarayıcılarda (ör. iOS Safari) bu fonksiyon
// sayfa açıldığında ve 'online' olayında manuel olarak çağrılır.
export async function flushQueue(): Promise<{ sent: number; remaining: number }> {
    const items = await listQueued();
    let sent = 0;
    for (const item of items) {
        try {
            const res = await fetch('/api/breakdowns', {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify(item.payload),
            });
            if (res.ok) {
                await removeQueued(item.id);
                sent += 1;
            }
            else if (res.status >= 400 && res.status < 500) {
                // Sunucu isteği kalıcı olarak reddetti (ör. geçersiz veri) — tekrar denemenin
                // faydası yok, kuyruktan kaldır ki sonsuza kadar birikmesin.
                await removeQueued(item.id);
            }
        }
        catch {
            // Hâlâ bağlantı yok — kuyrukta kalsın, sonraki denemede tekrar gönderilir.
            break;
        }
    }
    const remaining = await listQueued();
    return { sent, remaining: remaining.length };
}

export async function registerBackgroundSync() {
    try {
        const reg = await navigator.serviceWorker.ready;
        if ('sync' in reg) {
            await (reg as ServiceWorkerRegistration & { sync: { register(tag: string): Promise<void> } }).sync.register('sync-breakdowns');
        }
    }
    catch {
        // Background Sync desteklenmiyor; flushQueue() 'online' olayıyla devreye girer.
    }
}
