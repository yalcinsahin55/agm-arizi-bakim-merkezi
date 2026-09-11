'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { priorityLabel, relativeTime, statusLabel } from '@/lib/labels';

type Job = {
  _id: string;
  code: string;
  motorName: string;
  categoryName?: string;
  subcategoryName?: string;
  title: string;
  priority: string;
  status: string;
  seenAt?: string | null;
  createdAt: string;
};

export default function TechQueueClient({ initialRows }: { initialRows: Job[] }) {
  const router = useRouter();
  const [rows, setRows] = useState(initialRows);
  const [prevInitialRows, setPrevInitialRows] = useState(initialRows);
  const [live, setLive] = useState(true);

  if (initialRows !== prevInitialRows) {
    setPrevInitialRows(initialRows);
    setRows(initialRows);
  }

  useEffect(() => {
    if (!live) return;
    const tick = async () => {
      try {
        const r = await fetch('/api/breakdowns', { cache: 'no-store' });
        if (!r.ok) return;
        const all = await r.json();
        const active = (Array.isArray(all) ? all : []).filter((x: Job) =>
          ['atandi', 'devam_ediyor', 'revizyon'].includes(x.status),
        );
        setRows(active);
      } catch {
        /* ignore */
      }
    };
    const id = setInterval(tick, 20000);
    return () => clearInterval(id);
  }, [live]);

  const unseen = rows.filter((x) => !x.seenAt).length;
  const working = rows.filter((x) => x.status === 'devam_ediyor').length;

  return (
    <>
      <div className="dashboard-head">
        <div>
          <div className="eyebrow">TEKNİSYEN OPERASYON</div>
          <h1 className="page-title">Atanan Arızalar</h1>
          <p className="muted">Müdahale sırasına göre kişisel iş kuyruğunuz</p>
        </div>
        <div className="row">
          <button
            type="button"
            className={`tech-live ${live ? '' : 'paused'}`}
            onClick={() => setLive((v) => !v)}
            title={live ? 'Otomatik yenilemeyi durdur' : 'Otomatik yenilemeyi aç'}
          >
            <i /> {live ? 'Canlı · 20sn' : 'Duraklatıldı'}
          </button>
          <button type="button" className="btn" onClick={() => router.refresh()}>
            Yenile
          </button>
        </div>
      </div>

      <div className="grid cards dashboard-kpis">
        <div className="card kpi">
          <span>Bekleyen İş</span>
          <strong>{rows.length}</strong>
          <small>Size atanmış aktif kayıt</small>
        </div>
        <div className="card kpi">
          <span>Bildirim Görülmedi</span>
          <strong className={unseen ? 'priority-critical' : ''}>{unseen}</strong>
          <small>Önce bildirimi onaylayın</small>
        </div>
        <div className="card kpi">
          <span>Müdahalede</span>
          <strong>{working}</strong>
          <small>Şu anda devam eden işler</small>
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="card empty">
          <h2>Aktif iş yok 🎉</h2>
          <p className="muted">Size atanmış bekleyen arıza bulunmuyor.</p>
        </div>
      ) : (
        <div className="tech-queue">
          {rows.map((b, i) => (
            <Link
              className={`tech-job card ${!b.seenAt ? 'needs-seen' : ''}`}
              href={`/arizalar/${b._id}`}
              key={String(b._id)}
            >
              <div className="job-top">
                <span className="queue-no">#{i + 1}</span>
                <b>{b.code}</b>
                <span className={`badge priority-${b.priority}`}>
                  {priorityLabel[b.priority] || b.priority}
                </span>
              </div>
              <h2>{b.motorName}</h2>
              <div className="muted">
                {b.categoryName}
                {b.subcategoryName ? ` / ${b.subcategoryName}` : ''}
              </div>
              <p>{b.title}</p>
              <div className="job-meta">
                <span>{statusLabel[b.status] || b.status}</span>
                <span>{b.seenAt ? '✓ Bildirim görüldü' : '⚠ Bildirim görülmedi'}</span>
                <span>{relativeTime(b.createdAt)}</span>
              </div>
              <div className="job-cta">
                {!b.seenAt
                  ? 'Bildirimi aç ve onayla →'
                  : b.status === 'devam_ediyor'
                    ? 'Raporu tamamla →'
                    : 'İşi aç →'}
              </div>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
