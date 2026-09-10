import type { Breakdown, Notification } from '@/types';
export default function ResponseTracking({ breakdown, notifications }: {
    breakdown: Breakdown;
    notifications: Notification[];
}) {
  const steps: [keyof Breakdown, string][] = [
    ['seenAt', 'Bildirim görüldü'],
    ['acknowledgedAt', 'İşe kabul edildi'],
    ['startedAt', 'Müdahale başladı'],
    ['submittedAt', 'Rapor gönderildi'],
  ];
  return <div className="card" style={{ marginTop: 16 }}><div className="row" style={{ justifyContent: 'space-between' }}><div><h2>Bildirim ve Müdahale Takibi</h2><p className="muted">Teknisyenin bildirim zincirindeki son durum</p></div><span className="badge">{breakdown.seenAt ? 'Görüldü' : 'Görülmedi'}</span></div><div className="response-steps">{steps.map(([key, label], i) => <div className={breakdown[key] ? 'done' : ''} key={key}><b>{i + 1}</b><span>{label}</span><small>{breakdown[key] ? new Date(String(breakdown[key])).toLocaleString('tr-TR') : 'Bekleniyor'}</small></div>)}</div><div className="notification-log">{notifications.map((n) => <div key={String(n._id)}><span>{n.title}</span><small>{n.pushStatus || '—'} · {n.seenAt ? 'Görüldü' : 'Sistemde kayıtlı'}</small></div>)}</div></div>;
}

