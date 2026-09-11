import { getCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import ArchiveList from '@/components/ArchiveList';

export default async function ArsivPage() {
  const u = await getCurrentUser();
  if (!u) return null;
  if (u.role !== 'yonetici') redirect('/');

  const rows = await (await db())
    .collection('breakdowns')
    .find({ archived: true })
    .sort({ archivedAt: -1 })
    .limit(300)
    .toArray();

  const serialized = JSON.parse(JSON.stringify(rows));

  return (
    <>
      <div className="row" style={{ justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div className="eyebrow">ARŞİV</div>
          <h1 className="page-title">Arşivlenmiş Arızalar</h1>
          <p className="muted">
            {rows.length} kayıt · silinen kayıtlar burada saklanır, geri çıkarılabilir
          </p>
        </div>
        <Link className="btn" href="/arizalar">
          ← Aktif kayıtlar
        </Link>
      </div>
      <ArchiveList initialRows={serialized} />
    </>
  );
}
