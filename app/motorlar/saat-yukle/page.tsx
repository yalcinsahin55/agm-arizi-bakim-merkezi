import { getCurrentUser } from '@/lib/auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import HoursUploadForm from '@/components/hours-upload/HoursUploadForm';
import { db } from '@/lib/db';
import type { Motor } from '@/types';

export default async function SaatYuklePage() {
  const user = await getCurrentUser();
  if (!user) return null;
  if (user.role !== 'yonetici') {
    redirect('/motorlar');
  }

  const database = await db();
  const recent = await database
    .collection('motor_hour_history')
    .find({})
    .sort({ createdAt: -1 })
    .limit(20)
    .toArray();

  const motorsRaw = await database
    .collection<Motor>('motors')
    .find({ active: true })
    .project({ name: 1, currentHours: 1, hours: 1, currentLoad: 1, load: 1, sourceUpdateDate: 1 })
    .toArray();
  const motors = motorsRaw.sort((a, b) => {
    const ma = String(a.name || '').match(/(\d+)/);
    const mb = String(b.name || '').match(/(\d+)/);
    const na = ma ? Number(ma[1]) : Number.POSITIVE_INFINITY;
    const nb = mb ? Number(mb[1]) : Number.POSITIVE_INFINITY;
    if (na !== nb) return na - nb;
    return String(a.name || '').localeCompare(String(b.name || ''), 'tr');
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
          <h1 className="page-title">Motor Saatlerini Excel ile Yükle</h1>
          <p className="muted">
            Güncel çalışma saatlerini Excel veya CSV dosyası ile toplu güncelleyin. Her güncelleme geçmişe
            kaydedilir.
          </p>
        </div>
      </div>

      <section className="card" style={{ marginTop: 16 }}>
        <h2>Dosya Yükle</h2>
        <HoursUploadForm />
      </section>

      <section className="card" style={{ marginTop: 16 }}>
        <h2>Mevcut Saatler</h2>
        <p className="muted">Sistemdeki güncel değerler</p>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Motor</th>
                <th>Saat</th>
                <th>Yük (kW)</th>
                <th>Son güncelleme</th>
              </tr>
            </thead>
            <tbody>
              {motors.map((m) => (
                <tr key={String(m._id)}>
                  <td>
                    <b>{m.name}</b>
                  </td>
                  <td>{Number(m.currentHours ?? m.hours ?? 0).toLocaleString('tr-TR')} h</td>
                  <td>{m.currentLoad ?? m.load ?? '—'}</td>
                  <td>{m.sourceUpdateDate ? new Date(m.sourceUpdateDate).toLocaleString('tr-TR') : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {recent.length > 0 && (
        <section className="card" style={{ marginTop: 16 }}>
          <h2>Son Saat Güncellemeleri</h2>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Tarih</th>
                  <th>Motor</th>
                  <th>Eski → Yeni Saat</th>
                  <th>Kaynak</th>
                  <th>Kullanıcı</th>
                </tr>
              </thead>
              <tbody>
                {recent.map((h) => (
                  <tr key={String(h._id)}>
                    <td>{h.createdAt ? new Date(h.createdAt).toLocaleString('tr-TR') : '—'}</td>
                    <td>{String(h.motorName || '')}</td>
                    <td>
                      {h.previousHours != null ? Number(h.previousHours).toLocaleString('tr-TR') : '—'} →{' '}
                      {h.newHours != null ? Number(h.newHours).toLocaleString('tr-TR') : '—'}
                    </td>
                    <td>{String(h.source || '')}</td>
                    <td>{String(h.updatedByName || '')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </>
  );
}
