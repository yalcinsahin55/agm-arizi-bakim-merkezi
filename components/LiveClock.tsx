'use client';

import { useEffect, useState } from 'react';

/**
 * Canlı saat (SS:DD göstermez, dakika hassasiyeti yeterli). Sunucu render'ında
 * gösterilemeyeceği için (server component'te "an" sabitlenir) istemci
 * tarafında mount olduktan sonra dolar — bu yüzden ilk anlık boş/placeholder
 * görünüp hemen ardından gerçek saat gelir; hydration uyuşmazlığı oluşmaz.
 */
export default function LiveClock() {
  const [time, setTime] = useState<string | null>(null);

  useEffect(() => {
    const update = () =>
      setTime(new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }));
    // İlk değeri de (mount anında) senkron değil, ertelenmiş olarak set ediyoruz.
    const initial = setTimeout(update, 0);
    const id = setInterval(update, 15000);
    return () => {
      clearTimeout(initial);
      clearInterval(id);
    };
  }, []);

  return (
    <span className="live-clock" suppressHydrationWarning>
      {time ?? '--:--'}
    </span>
  );
}
