import { getCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';
import Link from 'next/link';
export default async function Motors() {
    const u = await getCurrentUser();
    if (!u)
        return null;
    const d = await db();
    const motors = await d.collection('motors').find({ active: true }).sort({ name: 1 }).toArray();
    const counts = await Promise.all(motors.map(async (m) => ({ id: String(m._id), count: await d.collection('breakdowns').countDocuments({ motorId: String(m._id), status: { $ne: 'iptal' }, archived: { $ne: true } }), active: await d.collection('breakdowns').countDocuments({ motorId: String(m._id), status: { $in: ['acik', 'atandi', 'devam_ediyor', 'revizyon'] }, archived: { $ne: true } }) })));
    const map = new Map(counts.map(x => [x.id, x]));
    return <><div className="dashboard-head"><div><div className="eyebrow">AGM • MOTORLAR</div><h1 className="page-title">Motor Envanteri</h1><p className="muted">Mevcut AGM motor verileri ve arıza geçmişi.</p></div></div><div className="grid cards">{motors.map((m: any) => { const c = map.get(String(m._id))!; return <Link href={`/motorlar/${m._id}`} className="card quick" key={String(m._id)}><div className="row" style={{ justifyContent: 'space-between' }}><b style={{ fontSize: 18 }}>{m.name}</b><span className="badge">{c.active} aktif</span></div><p className="muted">{Number(m.currentHours || 0).toLocaleString('tr-TR')} saat · Yük {m.currentLoad ?? '—'}</p><div className="summary-list"><div><span>Toplam arıza</span><b>{c.count}</b></div><div><span>Yağ</span><b>{m.oil?.brand || '—'}</b></div></div></Link>; })}</div></>;
}

