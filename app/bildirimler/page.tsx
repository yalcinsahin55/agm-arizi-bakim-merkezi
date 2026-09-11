import { getCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';
import Link from 'next/link';
import PushSetup from '@/components/PushSetup';
import type { Notification } from '@/types';

export default async function Notifications() {
  const u = await getCurrentUser();
  if (!u) return null;

  const rows = await (await db())
    .collection<Notification>('notifications')
    .find({ recipientId: u._id })
    .sort({ createdAt: -1 })
    .limit(100)
    .toArray();

  return (
    <>
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <div>
          <div className="eyebrow">BİLDİRİM</div>
          <h1 className="page-title">Bildirim Merkezi</h1>
          <p className="muted">Kalıcı geçmiş · Web Push · PWA</p>
        </div>
      </div>

      <PushSetup />

      <div className="grid" style={{ marginTop: 16 }}>
        {rows.length === 0 ? (
          <div className="card empty">
            <h2>Henüz bildirim yok</h2>
            <p className="muted">Arıza olayları burada ve push olarak görünecek.</p>
          </div>
        ) : (
          rows.map((n) => (
            <Link className="card" href={n.href || '/'} key={String(n._id)}>
              <div className="row" style={{ justifyContent: 'space-between' }}>
                <b>{n.title}</b>
                <span className="muted">
                  {new Date(n.createdAt).toLocaleString('tr-TR')}
                </span>
              </div>
              <p>{n.body}</p>
              <small className="muted">
                Push: {n.pushStatus || '—'} · {n.seenAt || n.status === 'seen' ? 'Görüldü' : 'Okunmadı'}
              </small>
            </Link>
          ))
        )}
      </div>
    </>
  );
}
