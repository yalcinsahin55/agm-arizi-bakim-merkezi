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
    }
    catch {
        return {};
    }
}
function saveSeen(m: Record<string, number>) {
    try {
        const entries = Object.entries(m).sort((a, b) => b[1] - a[1]).slice(0, 200);
        localStorage.setItem(KEY, JSON.stringify(Object.fromEntries(entries)));
    }
    catch {}
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
                if (!r.ok)
                    return;
                const data = await r.json();
                const list: Notif[] = Array.isArray(data) ? data : (data.items || []);
                const map = seen.current;
                if (first.current) {
                    for (const n of list)
                        map[String(n._id)] = Date.now();
                    saveSeen(map);
                    first.current = false;
                    return;
                }
                const fresh = list.filter(n => !n.read && !map[String(n._id)]);
                if (fresh.length) {
                    for (const n of fresh)
                        map[String(n._id)] = Date.now();
                    saveSeen(map);
                    const show = fresh.slice(0, 3);
                    setToasts(t => [...show, ...t].slice(0, 4));
                    for (const n of show)
                        setTimeout(() => setToasts(t => t.filter(x => String(x._id) !== String(n._id))), 8000);
                }
            }
            catch {}
        }
        poll();
        const id = setInterval(poll, 10000);
        return () => clearInterval(id);
    }, []);
    if (!toasts.length)
        return null;
    return <div style={{ position: 'fixed', right: 16, bottom: 16, display: 'flex', flexDirection: 'column', gap: 10, zIndex: 999, maxWidth: 340, width: 'calc(100vw - 32px)' }}>{toasts.map(n => <div key={String(n._id)} onClick={() => { setToasts(t => t.filter(x => String(x._id) !== String(n._id))); if (n.href) router.push(n.href); }} style={{ background: '#101826', border: '1px solid #2a3a55', borderLeft: '4px solid #f5b83d', borderRadius: 10, padding: '10px 14px', cursor: 'pointer', boxShadow: '0 8px 24px rgba(0,0,0,.45)' }}><div style={{ fontWeight: 700, fontSize: 13 }}>{n.title}</div>{n.body && <div style={{ fontSize: 12, opacity: .8, marginTop: 2 }}>{n.body}</div>}<div style={{ fontSize: 11, opacity: .55, marginTop: 4 }}>Gitmek için tıkla</div></div>)}</div>;
}
