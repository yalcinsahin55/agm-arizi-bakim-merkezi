'use client';

import { useEffect, useRef } from 'react';

/**
 * Belirli aralıklarla bir fonksiyonu çalıştırır, ancak sekme arka plandayken
 * (document.hidden) sorgu göndermeyi durdurur ve sekme tekrar görünür
 * olduğunda hemen bir kez daha çalıştırır. Bu, bildirim/iş kuyruğu gibi
 * periyodik yoklama (polling) yapan bileşenlerin gereksiz yere sunucuya
 * ve pile yük bindirmesini önler.
 */
export function useVisibleInterval(callback: () => void, delayMs: number, enabled = true) {
  const savedCallback = useRef(callback);

  // En güncel callback'i her render sonrası ref'e yazıyoruz (render sırasında
  // değil — React ref'lerin render sırasında güncellenmesine izin vermiyor).
  useEffect(() => {
    savedCallback.current = callback;
  });

  useEffect(() => {
    if (!enabled) return;

    const tick = () => {
      if (document.visibilityState !== 'visible') return;
      savedCallback.current();
    };

    const id = setInterval(tick, delayMs);

    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') savedCallback.current();
    };
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [delayMs, enabled]);
}
