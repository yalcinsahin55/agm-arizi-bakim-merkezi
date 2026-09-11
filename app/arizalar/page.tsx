import { getCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';
import Link from 'next/link';
import BreakdownList from '@/components/BreakdownList';

export default async function Arizalar() {
  const u = await getCurrentUser();
  if (!u) return null;

  const q = {
    archived: { $ne: true },
    ...(u.role === 'yonetici' || u.role === 'goruntuleyici'
      ? {}
      : u.role === 'teknisyen'
        ? { assignedTechnicianId: u._id }
        : { createdBy: u._id }),
  };

  const rows = await (await db())
    .collection('breakdowns')
    .find(q)
    .sort({ createdAt: -1 })
    .limit(150)
    .project({
      code: 1,
      title: 1,
      status: 1,
      priority: 1,
      motorName: 1,
      categoryName: 1,
      subcategoryName: 1,
      assignedTechnicianName: 1,
      assignedTechnicianId: 1,
      createdBy: 1,
      createdByName: 1,
      createdAt: 1,
      updatedAt: 1,
      startedAt: 1,
      closedAt: 1,
      seenAt: 1,
      submittedAt: 1,
    })
    .toArray();

  const serialized = JSON.parse(JSON.stringify(rows));

  return (
    <>
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <div>
          <div className="eyebrow">OPERASYON</div>
          <h1 className="page-title">Arıza Kayıtları</h1>
          <p className="muted">
            {rows.length} kayıt · arama, durum filtresi ve satır içi işlemler
          </p>
        </div>
        <div className="row" style={{ gap: 8 }}>
          {u.role === 'yonetici' && (
            <Link className="btn" href="/arizalar/arsiv">
              Arşiv
            </Link>
          )}
          {(u.role === 'yonetici' || u.role === 'operator') && (
            <Link className="btn primary" href="/arizalar/yeni">
              + Yeni Arıza
            </Link>
          )}
        </div>
      </div>
      <BreakdownList
        initialRows={serialized}
        user={{ _id: u._id, role: u.role, name: u.name }}
      />
    </>
  );
}
