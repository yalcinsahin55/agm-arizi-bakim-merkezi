import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';
import HoursHistoryTable from '@/components/hours-history/HoursHistoryTable';
import type { Motor } from '@/types';

export default async function MotorSaatGecmisiPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/giris');

  const database = await db();
  const motorsRaw = await database
    .collection<Motor>('motors')
    .find({ active: true })
    .project({ name: 1 })
    .toArray();
  const motors = motorsRaw
    .map((m) => ({ _id: String(m._id), name: m.name }))
    .sort((a, b) => {
      const ma = a.name.match(/(\d+)/);
      const mb = b.name.match(/(\d+)/);
      const na = ma ? Number(ma[1]) : Number.POSITIVE_INFINITY;
      const nb = mb ? Number(mb[1]) : Number.POSITIVE_INFINITY;
      if (na !== nb) return na - nb;
      return a.name.localeCompare(b.name, 'tr');
    });

  return (
    <>
      <div className="row">
        <Link className="btn" href="/motorlar">
          ← Ekipman Envanteri
        </Link>
      </div>
      <div className="dashboard-head" style={{ marginTop: 14 }}>
        <div>
          <div className="eyebrow">AGM • SAAT YÖNETİMİ</div>
          <h1 className="page-title">Motor Saati / Yükü Geçmişi</h1>
          <p className="muted">
            Excel yüklemeleriyle kaydedilen günlük saat ve yük değerlerini tarihe ve/veya motora göre
            görüntüleyin — örn. 19.09.2026'da AGM 1'in saati ve yükü neydi.
          </p>
        </div>
      </div>

      <section className="card" style={{ marginTop: 16 }}>
        <HoursHistoryTable motors={motors} />
      </section>
    </>
  );
}
