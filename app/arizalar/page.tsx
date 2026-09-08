import { getCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';
import Link from 'next/link';
export default async function Arizalar() {
    const u = await getCurrentUser();
    if (!u)
        return null;
    const q = { archived: { $ne: true }, ...(u.role === 'yonetici' || u.role === 'goruntuleyici' ? {} : u.role === 'teknisyen' ? { assignedTechnicianId: u._id } : { createdBy: u._id }) };
    const rows = await (await db()).collection('breakdowns').find(q).sort({ createdAt: -1 }).limit(200).toArray();
    return <><div className="row" style={{ justifyContent: 'space-between' }}><div><h1 className="page-title">Arıza Kayıtları</h1><p className="muted">{rows.length} kayıt</p></div>{(u.role === 'yonetici' || u.role === 'operator') && <Link className="btn primary" href="/arizalar/yeni">+ Yeni Arıza</Link>}</div><div className="card" style={{ marginTop: 16, overflowX: 'auto' }}><table className="table"><thead><tr><th>Kod</th><th>Motor</th><th>Kategori</th><th>Öncelik</th><th>Durum</th><th>Teknisyen</th></tr></thead><tbody>{rows.map((x: any) => <tr key={String(x._id)}><td><Link href={`/arizalar/${x._id}`}>{x.code}</Link></td><td><Link href={`/motorlar/${x.motorId}`}><b>{x.motorName}</b></Link></td><td>{x.categoryName}{x.subcategoryName ? ` / ${x.subcategoryName}` : ''}</td><td className={`priority-${x.priority}`}>{x.priority}</td><td>{x.status}</td><td>{x.assignedTechnicianName || 'Atanmadı'}</td></tr>)}</tbody></table></div></>;
}

