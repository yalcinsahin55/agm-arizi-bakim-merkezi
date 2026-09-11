'use client';

import { useEffect, useState } from 'react';

function formatTime(d: Date) {
  const h = String(d.getHours()).padStart(2, '0');
  const m = String(d.getMinutes()).padStart(2, '0');
  return `${h}:${m}`;
}

export default function LiveClock({ className }: { className?: string }) {
  const [time, setTime] = useState(() => formatTime(new Date()));

  useEffect(() => {
    const tick = () => setTime(formatTime(new Date()));
    tick();
    // her saniye değil; dakika değişiminde güncelle (daha sakin)
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <time className={className} dateTime={time} aria-label={`Saat ${time}`}>
      {time}
    </time>
  );
}
