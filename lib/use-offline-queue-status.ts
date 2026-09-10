'use client';

import { useEffect, useState } from 'react';
import { flushQueue, listQueued, registerBackgroundSync } from '@/lib/offline-queue';

/**
 * Çevrimdışı kaydedilen arıza sayısını izler; bağlantı geri geldiğinde
 * kuyruğu otomatik boşaltır. Yeni arıza formunun kendi state/JSX'inden
 * ayrı tutulur ki sayfa dosyası küçük ve okunabilir kalsın.
 */
export function useOfflineQueueStatus() {
  const [queuedCount, setQueuedCount] = useState(0);

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => undefined);
    }
    const refresh = () => listQueued().then((items) => setQueuedCount(items.length));
    refresh();
    const onFlushed = (e: MessageEvent) => {
      if (e.data?.type === 'offline-queue-flushed') refresh();
    };
    const onOnline = () => flushQueue().then(refresh);
    navigator.serviceWorker?.addEventListener('message', onFlushed);
    window.addEventListener('online', onOnline);
    if (navigator.onLine) onOnline();
    return () => {
      navigator.serviceWorker?.removeEventListener('message', onFlushed);
      window.removeEventListener('online', onOnline);
    };
  }, []);

  return { queuedCount, bumpQueuedCount: () => setQueuedCount((n) => n + 1) };
}

export { registerBackgroundSync };
