import type { BreakdownEvent } from '@/types';
export default function EventTimeline({ events }: { events: BreakdownEvent[] }) {
  return <div className="card" style={{ marginTop: 16 }}><h2>Olay Geçmişi</h2><div className="timeline">{events.map(e => <div className="event" key={String(e._id ?? e.eventId)}><b>{e.type}</b><div>{e.actorName} · {new Date(e.createdAt).toLocaleString('tr-TR')}</div>{e.note && <div className="muted">{e.note}</div>}{e.fieldChanges && Object.keys(e.fieldChanges).length > 0 && <div className="muted">{Object.entries(e.fieldChanges).map(([field, change]) => <div key={field}><strong>{field}:</strong> {String(change.from ?? '—')} → {String(change.to ?? '—')}</div>)}</div>}</div>)}</div></div>;
}
