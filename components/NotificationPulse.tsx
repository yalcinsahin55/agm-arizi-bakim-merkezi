'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

type Notif = {
  _id: string;
  title: string;
  body?: string;
  href?: string;
  read?: boolean;
  createdAt?: string;
};

const KEY = 'agm_seen_notifs';

function loadSeen(): Record<string, number> {
  try {
    return JSON.parse(localStorage.getItem(KEY) || '{}');
  } catch {
    return {};
  }
}

function saveSeen(m: Record<string, number>) {
  try {
    const entries = Object.entries(m)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 200);
    localStorage.setItem(KEY, JSON.stringify(Object.fromEntries(entries)));
  } catch {
    /* ignore */
  }
}

export default function NotificationPulse() {
  const [toasts, setToasts] = useState<Notif[]>([]);
  const seen = useRef<Record<string, number>>(loadSeen());
  const first = useRef(true);
  const router = useRouter();

  useEffect(() => {
    async function poll() {
      try {
        const r = await fetch('/api/notifications', { cache: 'no-store' });
        if (!r.ok) return;
        const data = await r.json();
        const list: Notif[] = Array.isArray(data) ? data : data.items || [];
        const map = seen.current;
        if (first.current) {
          for (const n of list) map[String(n._id)] = Date.now();
          saveSeen(map);
          first.current = false;
          return;
        }
        const fresh = list.filter((n) => !n.read && !map[String(n._id)]);
        if (fresh.length) {
          for (const n of fresh) map[String(n._id)] = Date.now();
          saveSeen(map);
          const show = fresh.slice(0, 3);
          setToasts((t) => [...show, ...t].slice(0, 4));
          for (const n of show) {
            setTimeout(
              () => setToasts((t) => t.filter((x) => String(x._id) !== String(n._id))),
              9000,
            );
          }
        }
      } catch {
        /* ignore */
      }
    }
    poll();
    const id = setInterval(poll, 10000);
    return () => clearInterval(id);
  }, []);

  if (!toasts.length) return null;

  return (
    <div className="notif-pulse" aria-live="polite">
      {toasts.map((n) => (
        <div
          key={String(n._id)}
          className="notif-pulse-card"
          role="button"
          tabIndex={0}
          onClick={() => {
            setToasts((t) => t.filter((x) => String(x._id) !== String(n._id)));
            if (n.href) router.push(n.href);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              setToasts((t) => t.filter((x) => String(x._id) !== String(n._id)));
              if (n.href) router.push(n.href);
            }
          }}
        >
          <div className="notif-pulse-icon" aria-hidden>
            ●
          </div>
          <div>
            <div className="toast-title">{n.title}</div>
            {n.body ? <div className="toast-desc">{n.body}</div> : null}
            <div className="notif-pulse-hint">Açmak için tıkla</div>
          </div>
        </div>
      ))}
    </div>
  );
}
