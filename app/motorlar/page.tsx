import { getCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';
import Link from 'next/link';
import EquipmentForm from '@/components/equipment-form';
import type { Motor, EquipmentType } from '@/types';

const typeLabel: Record<EquipmentType, string> = {
  motor: 'Motor',
  booster: 'Booster',
  pompa: 'Pompa',
  kompresor: 'Kompresör',
  jenerator: 'Jeneratör',
  alternator: 'Alternatör',
  diger: 'Diğer',
};

export default async function EquipmentInventory() {
  const user = await getCurrentUser();
  if (!user) return null;

  const database = await db();
  const equipmentRaw = await database.collection<Motor>('motors')
    .find({ active: true })
    .toArray();

  // AGM 1, AGM 2, ... AGM 10, AGM 39 doğal sayı sırası
  const naturalName = (name: string) => {
    const m = String(name || '').match(/(\d+)/);
    const num = m ? Number(m[1]) : Number.POSITIVE_INFINITY;
    const prefix = String(name || '').replace(/\d+.*/, '').trim().toLowerCase();
    return { prefix, num, raw: String(name || '').toLowerCase() };
  };
  const equipment = equipmentRaw.sort((a, b) => {
    const typeA = a.equipmentType ?? 'motor';
    const typeB = b.equipmentType ?? 'motor';
    if (typeA !== typeB) return typeA.localeCompare(typeB, 'tr');
    const na = naturalName(a.name);
    const nb = naturalName(b.name);
    if (na.prefix !== nb.prefix) return na.prefix.localeCompare(nb.prefix, 'tr');
    if (na.num !== nb.num) return na.num - nb.num;
    return na.raw.localeCompare(nb.raw, 'tr');
  });

  const counts = await Promise.all(
    equipment.map(async (item) => ({
      id: String(item._id),
      count: await database.collection('breakdowns').countDocuments({
        motorId: String(item._id),
        status: { $ne: 'iptal' },
        archived: { $ne: true },
      }),
      active: await database.collection('breakdowns').countDocuments({
        motorId: String(item._id),
        status: { $in: ['acik', 'atandi', 'devam_ediyor', 'revizyon'] },
        archived: { $ne: true },
      }),
    })),
  );
  const map = new Map(counts.map((item) => [item.id, item]));

  return (
    <>
      <div className="dashboard-head">
        <div>
          <div className="eyebrow">AGM • VARLIK YÖNETİMİ</div>
          <h1 className="page-title">Ekipman Envanteri</h1>
          <p className="muted">
            Motor, booster, pompa, kompresör ve diğer saha ekipmanlarını tek bir envanterden yönetin.
          </p>
        </div>
      </div>

      {user.role === 'yonetici' && (
        <div className="row" style={{ marginBottom: 12, gap: 8 }}>
          <Link className="btn primary" href="/motorlar/saat-yukle">Excel ile Saat Yükle</Link>
        </div>
      )}
      {user.role === 'yonetici' && (
        <section className="card" style={{ marginTop: 16 }}>
          <h2>Yeni Ekipman Ekle</h2>
          <p className="muted">Yeni bir varlık tanımlayın. Daha sonra kaydını açıp bilgilerini değiştirebilirsiniz.</p>
          <EquipmentForm />
        </section>
      )}

      <div className="grid cards" style={{ marginTop: 16 }}>
        {equipment.map((item) => {
          const count = map.get(String(item._id))!;
          const type = item.equipmentType ?? 'motor';

          return (
            <Link href={`/motorlar/${item._id}`} className="card quick" key={String(item._id)}>
              <div className="row" style={{ justifyContent: 'space-between' }}>
                <div>
                  <span className="badge">{typeLabel[type]}</span>
                  <b style={{ display: 'block', fontSize: 18, marginTop: 7 }}>{item.name}</b>
                </div>
                <span className="badge">{count.active} aktif</span>
              </div>
              <p className="muted">
                {item.location || 'Konum belirtilmemiş'} · {Number(item.currentHours ?? item.hours ?? 0).toLocaleString('tr-TR')} saat
              </p>
              <div className="summary-list">
                <div><span>Toplam arıza</span><b>{count.count}</b></div>
                <div><span>Yük</span><b>{item.currentLoad ?? item.load ?? '—'} kW</b></div>
              </div>
            </Link>
          );
        })}
      </div>

      {!equipment.length && (
        <div className="card" style={{ marginTop: 16 }}>
          <h2>Envanter boş</h2>
          <p className="muted">Henüz aktif ekipman tanımlanmamış.</p>
        </div>
      )}
    </>
  );
}
