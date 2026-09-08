import { getCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';
import Link from 'next/link';
const labels: any = { kritik: 'Kritik', yuksek: 'Yüksek', orta: 'Orta', dusuk: 'Düşük' };
const status: any = { atandi: 'Atandı', devam_ediyor: 'Devam ediyor', revizyon: 'Revizyon' };
const elapsed = (d: any) => { const m = Math.max(0, Math.round((Date.now() - new Date(d).getTime()) / 60000)); return `${Math.floor(m / 60)}s ${m % 60}dk`; };
export default async function Tech() {
    const u = await getCurrentUser();
    if (!u)
        return null;
    const rows = await (await db()).collection('breakdowns').find({ assignedTechnicianId: u._id, status: { $in: ['atandi', 'devam_ediyor', 'revizyon'] } }).sort({ priority: 1, createdAt: 1 }).toArray();
    const unseen = rows.filter(x => !x.seenAt).length, working = rows.filter(x => x.status === 'devam_ediyor').length;
    return <><div className="dashboard-head"><div><div className="eyebrow">TEKNİSYEN OPERASYON</div><h1 className="page-title">Atanan Arızalar</h1><p className="muted">Müdahale sırasına göre kişisel iş kuyruğunuz</p></div><div className="tech-live"><i /> Canlı</div></div><div className="grid cards dashboard-kpis"><div className="card kpi"><span>Bekleyen İş</span><strong>{rows.length}</strong><small>Size atanmış aktif kayıt</small></div><div className="card kpi"><span>Bildirim Görülmedi</span><strong className={unseen ? 'priority-critical' : ''}>{unseen}</strong><small>Önce bildirimi onaylayın</small></div><div className="card kpi"><span>Müdahalede</span><strong>{working}</strong><small>Şu anda devam eden işler</small></div></div>{rows.length === 0 ? <div className="card empty"><h2>Aktif iş yok 🎉</h2><p className="muted">Size atanmış bekleyen arıza bulunmuyor.</p></div> : <div className="tech-queue">{rows.map((b: any, i: number) => <Link className={`tech-job card ${!b.seenAt ? 'needs-seen' : ''}`} href={`/arizalar/${b._id}`} key={String(b._id)}><div className="job-top"><span className="queue-no">#{i + 1}</span><b>{b.code}</b><span className={`badge priority-${b.priority}`}>{labels[b.priority] || b.priority}</span></div><h2>{b.motorName}</h2><div className="muted">{b.categoryName}{b.subcategoryName ? ` / ${b.subcategoryName}` : ''}</div><p>{b.title}</p><div className="job-meta"><span>{status[b.status] || b.status}</span><span>{b.seenAt ? '✓ Bildirim görüldü' : '⚠ Bildirim görülmedi'}</span><span>{elapsed(b.createdAt)} önce</span></div><div className="job-cta">{!b.seenAt ? 'Bildirimi aç ve onayla →' : b.status === 'devam_ediyor' ? 'Raporu tamamla →' : 'İşi aç →'}</div></Link>)}</div>}</>;
}

