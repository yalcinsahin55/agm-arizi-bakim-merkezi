'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
type EventRow = {
    _id: string;
    eventId: string;
    type: string;
    actorName: string;
    createdAt: string;
    note?: string;
    breakdownCode?: string;
    motorName?: string;
    breakdownId: string;
    fieldChanges?: Record<string, {
        from: unknown;
        to: unknown;
    }>;
};
const labels: Record<string, string> = { created: 'Arıza oluşturuldu', seen: 'Bildirim görüldü', accept: 'İş kabul edildi', start: 'İşe başlandı', submit: 'Rapor gönderildi', approve: 'Yönetici onayladı', revision: 'Revizyon istendi', cancelled: 'Arıza iptal edildi', attachment_added: 'Ek dosya eklendi', attachment_deleted: 'Ek dosya silindi', edited: 'Arıza düzenlendi', assigned: 'Teknisyen atandı', archived: 'Arıza arşivlendi', unarchived: 'Arıza arşivden çıkarıldı', purged: 'Arıza kalıcı silindi', renotify: 'Bildirim tekrar gönderildi', escalation: 'Yanıt gecikmesi' };
export default function AuditPage() {
    const [events, setEvents] = useState<EventRow[]>([]);
    const [types, setTypes] = useState<string[]>([]);
    const [actors, setActors] = useState<{
        id: string;
        name: string;
    }[]>([]);
    const [loading, setLoading] = useState(true);
    const [from, setFrom] = useState('');
    const [to, setTo] = useState('');
    const [type, setType] = useState('');
    const [actorId, setActorId] = useState('');
    async function load() {
        setLoading(true);
        const q = new URLSearchParams();
        if (from)
            q.set('from', from);
        if (to)
            q.set('to', to);
        if (type)
            q.set('type', type);
        if (actorId)
            q.set('actorId', actorId);
        const r = await fetch(`/api/audit?${q}`);
        const j = await r.json();
        setEvents(j.events || []);
        setTypes(j.types || []);
        setActors(j.actors || []);
        setLoading(false);
    }
    useEffect(() => { queueMicrotask(load); }, []);
    return <section><div className="page-head"><div><h1>Denetim Günlüğü</h1><p>Arızi bakım üzerinde yapılan kritik işlemlerin değiştirilemez olay kaydı.</p></div><div style={{ display: 'flex', gap: 8 }}><button className="btn" onClick={load}>Yenile</button><a className="btn" href={`/api/audit?format=csv${from ? `&from=${from}` : ''}${to ? `&to=${to}` : ''}${type ? `&type=${encodeURIComponent(type)}` : ''}${actorId ? `&actorId=${encodeURIComponent(actorId)}` : ''}`}>CSV Dışa Aktar</a></div></div>
 <div className="card filters"><input type="date" value={from} onChange={e => setFrom(e.target.value)}/><input type="date" value={to} onChange={e => setTo(e.target.value)}/><select value={type} onChange={e => setType(e.target.value)}><option value="">Tüm işlemler</option>{types.map(x => <option key={x} value={x}>{labels[x] || x}</option>)}</select><select value={actorId} onChange={e => setActorId(e.target.value)}><option value="">Tüm kullanıcılar</option>{actors.map(x => <option key={x.id} value={x.id}>{x.name}</option>)}</select><button className="btn primary" onClick={load}>Filtrele</button></div>
 <div className="card table-wrap"><table><thead><tr><th>Tarih</th><th>İşlem</th><th>Arıza</th><th>Motor</th><th>Kullanıcı</th><th>Değişiklik</th><th>Not</th></tr></thead><tbody>{loading ? <tr><td colSpan={7}>Yükleniyor…</td></tr> : events.length === 0 ? <tr><td colSpan={7}>Kayıt bulunamadı.</td></tr> : events.map(e => <tr key={e._id}><td>{new Date(e.createdAt).toLocaleString('tr-TR')}</td><td><b>{labels[e.type] || e.type}</b></td><td><Link href={`/arizalar/${e.breakdownId}`}>{e.breakdownCode || e.breakdownId.slice(-8)}</Link></td><td>{e.motorName || '—'}</td><td>{e.actorName}</td><td>{e.fieldChanges && Object.keys(e.fieldChanges).length ? Object.entries(e.fieldChanges).map(([k, v]) => <div key={k}><b>{k}</b>: {String(v.from ?? '—')} → {String(v.to ?? '—')}</div>) : '—'}</td><td>{e.note || '—'}</td></tr>)}</tbody></table></div></section>;
}

