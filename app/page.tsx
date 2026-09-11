import { getCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';
import Link from 'next/link';
import PushSetup from '@/components/PushSetup';
import DashboardKpis from '@/components/dashboard/DashboardKpis';
import RecentBreakdowns from '@/components/dashboard/RecentBreakdowns';
import TechnicianWorkload from '@/components/dashboard/TechnicianWorkload';
import TrendBars from '@/components/dashboard/TrendBars';
import type { Breakdown, User } from '@/types';
import { minutesBetween } from '@/lib/report-utils';
import Logo from '@/components/Logo';

const activeStatuses = ['acik', 'atandi', 'devam_ediyor', 'revizyon'] as const;
function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function buildDayBuckets(days: number, all: Breakdown[]) {
  const now = new Date();
  const points: { label: string; count: number; closed: number; key: string }[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const day = startOfDay(new Date(now.getTime() - i * 86400000));
    const key = day.toISOString().slice(0, 10);
    const label =
      days <= 1
        ? 'Bugün'
        : day.toLocaleDateString('tr-TR', { weekday: 'short', day: 'numeric' });
    points.push({ label, count: 0, closed: 0, key });
  }
  const map = Object.fromEntries(points.map((p) => [p.key, p]));
  for (const row of all) {
    if (row.createdAt) {
      const k = startOfDay(new Date(row.createdAt)).toISOString().slice(0, 10);
      if (map[k]) map[k].count += 1;
    }
    const closedAt = row.closedAt || (row.status === 'onaylandi' ? row.updatedAt : null);
    if (closedAt) {
      const k = startOfDay(new Date(closedAt)).toISOString().slice(0, 10);
      if (map[k]) map[k].closed += 1;
    }
  }
  return points.map(({ label, count, closed }) => ({ label, count, closed }));
}

function buildHourBuckets(all: Breakdown[]) {
  const todayStart = startOfDay(new Date()).getTime();
  const slots = [
    { label: '00-04', from: 0, to: 4 },
    { label: '04-08', from: 4, to: 8 },
    { label: '08-12', from: 8, to: 12 },
    { label: '12-16', from: 12, to: 16 },
    { label: '16-20', from: 16, to: 20 },
    { label: '20-24', from: 20, to: 24 },
  ];
  const counts = slots.map((s) => ({ label: s.label, count: 0 }));
  for (const row of all) {
    const t = new Date(row.createdAt).getTime();
    if (t < todayStart) continue;
    const h = new Date(row.createdAt).getHours();
    const idx = slots.findIndex((s) => h >= s.from && h < s.to);
    if (idx >= 0) counts[idx].count += 1;
  }
  return counts;
}

export default async function Home() {
  const u = await getCurrentUser();
  if (!u) {
    return (
      <div className="login">
        <div className="card">
          <h1 className="page-title">AGM Arızi Bakım Merkezi</h1>
          <p className="muted">Arıza yönetimi ve teknisyen müdahale merkezi</p>
          <Link className="btn primary" href="/giris">
            Giriş yap
          </Link>
        </div>
      </div>
    );
  }

  const d = await db();
  const b = d.collection<Breakdown>('breakdowns');
  const q = {
    archived: { $ne: true },
    ...(u.role === 'yonetici' || u.role === 'goruntuleyici'
      ? {}
      : u.role === 'teknisyen'
        ? { assignedTechnicianId: u._id }
        : { createdBy: u._id }),
  };
  const active = { ...q, status: { $in: activeStatuses } };

  const [all, open, critical, approval, closed, recent, technicians, notSeen, motorCount] =
    await Promise.all([
      b.find(q).sort({ createdAt: -1 }).limit(1000).toArray(),
      b.countDocuments(active),
      b.countDocuments({ ...active, priority: 'kritik' }),
      b.countDocuments({ ...q, status: 'onay_bekliyor' }),
      b.countDocuments({ ...q, status: 'onaylandi' }),
      b.find(q).sort({ createdAt: -1 }).limit(8).toArray(),
      u.role === 'yonetici'
        ? d.collection<User>('users').find({ role: 'teknisyen', active: true }).toArray()
        : Promise.resolve([]),
      u.role === 'yonetici'
        ? b.countDocuments({ ...q, status: 'atandi', seenAt: { $exists: false } })
        : Promise.resolve(0),
      d.collection('motors').countDocuments({ active: true }),
    ]);

  const techWork =
    u.role === 'yonetici'
      ? await Promise.all(
          technicians.map(async (t: Pick<User, '_id' | 'name'>) => ({
            name: t.name,
            count: await b.countDocuments({
              assignedTechnicianId: String(t._id),
              status: { $in: ['atandi', 'devam_ediyor', 'revizyon'] },
            }),
            started: await b.countDocuments({
              assignedTechnicianId: String(t._id),
              status: 'devam_ediyor',
            }),
          })),
        )
      : [];

  const completed = all
    .map((x) => minutesBetween(x.startedAt, x.closedAt))
    .filter((x): x is number => x !== null);
  const avgMttr = completed.length
    ? Math.round(completed.reduce((a, c) => a + c, 0) / completed.length)
    : null;

  const title =
    u.role === 'teknisyen'
      ? 'Teknisyen Operasyon Merkezi'
      : u.role === 'operator'
        ? 'Arıza Bildirim Merkezi'
        : u.role === 'goruntuleyici'
          ? 'Üst Düzey Yönetim Özeti'
          : 'Arızi Bakım Kontrol Merkezi';

  const now = new Date();
  const hour = now.getHours();
  const greet =
    hour < 6 ? 'İyi geceler' : hour < 12 ? 'Günaydın' : hour < 18 ? 'İyi günler' : 'İyi akşamlar';
  const roleMsg =
    u.role === 'yonetici'
      ? 'Operasyonun özeti masanızda: atamalar ve onaylar sizi bekliyor.'
      : u.role === 'operator'
        ? 'Yeni bir arıza mı var? "+ Yeni Arıza" ile tek tıkla bildirin.'
        : u.role === 'teknisyen'
          ? 'Atanan görevleriniz için kolay gelsin.'
          : 'Salt-okunur yönetim özetiniz hazır.';
  const todayLabel = now.toLocaleDateString('tr-TR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    weekday: 'long',
  });

  const weekTrend = buildDayBuckets(7, all);
  const todayTrend = buildHourBuckets(all);

  return (
    <>
      <section className="hero-banner">
        <div className="hero-left">
          <Logo size={40} className="hero-logo" />
          <div style={{ minWidth: 0 }}>
            <div className="eyebrow">AVCIKORU SANTRALİ</div>
            <h2>
              {greet}, {String(u.name).split(' ')[0]}
            </h2>
            <div className="muted" style={{ fontSize: 13 }}>
              {roleMsg}
            </div>
            <div className="muted" style={{ marginTop: 6, fontSize: 12 }}>
              {motorCount} motor · {todayLabel}
            </div>
          </div>
        </div>
        <div className="hero-status">
          <span className="muted">DURUM</span>
          <b>● Aktif</b>
        </div>
      </section>

      <div className="dashboard-head">
        <div>
          <div className="eyebrow">AGM • ARİZİ BAKIM</div>
          <h1 className="page-title">{title}</h1>
          <p className="muted">
            {u.role === 'goruntuleyici'
              ? 'Salt-okunur yönetim görünümü · operasyon KPI özeti'
              : 'Arıza, müdahale ve onay süreçlerinin merkezi takibi'}
          </p>
        </div>
        <div className="row">
          <span className="badge">{u.name}</span>
          {(u.role === 'yonetici' || u.role === 'operator') && (
            <Link className="btn primary" href="/arizalar/yeni">
              + Yeni Arıza
            </Link>
          )}
        </div>
      </div>

      <DashboardKpis
        open={open}
        critical={critical}
        approval={approval}
        closed={closed}
        notSeen={notSeen}
        avgMttr={avgMttr}
        isManager={u.role === 'yonetici'}
      />

      {u.role === 'yonetici' && (
        <section className="ops-alert card">
          <div>
            <b>Operasyon uyarısı</b>
            <span>
              {notSeen
                ? `${notSeen} atanmış arıza teknisyen tarafından henüz görülmedi.`
                : 'Bekleyen teknisyen bildirimi yok.'}
            </span>
          </div>
          {notSeen > 0 && (
            <Link className="btn danger" href="/arizalar">
              Kontrol Et
            </Link>
          )}
        </section>
      )}

      <div className="trend-grid" style={{ marginTop: 18 }}>
        <TrendBars
          title="Bugün (saat dilimi)"
          subtitle="Bugün oluşturulan arıza dağılımı"
          points={todayTrend}
        />
        <TrendBars
          title="Son 7 gün"
          subtitle="Açılan / kapanan arıza"
          points={weekTrend}
          showClosed
        />
      </div>

      <div className="dashboard-grid" style={{ marginTop: 18 }}>
        <RecentBreakdowns recent={recent} />
        <section className="card">
          <h2>Operasyon Özeti</h2>
          <div className="summary-list">
            <div>
              <span>Aktif / Toplam</span>
              <b>
                {open} / {all.length}
              </b>
            </div>
            <div>
              <span>Kritik payı</span>
              <b>{all.length ? Math.round((critical / all.length) * 100) : 0}%</b>
            </div>
            <div>
              <span>Onay bekleyen</span>
              <b>{approval}</b>
            </div>
            <div>
              <span>MTTR</span>
              <b>
                {avgMttr === null
                  ? '—'
                  : `${Math.floor(avgMttr / 60)}s ${avgMttr % 60}dk`}
              </b>
            </div>
          </div>
          <div className="quick-grid" style={{ marginTop: 14 }}>
            {u.role !== 'goruntuleyici' && (
              <Link className="quick" href="/arizalar/yeni">
                <b>Arıza Kaydı Aç</b>
                <span>Yeni duruş veya arıza bildir</span>
              </Link>
            )}
            <Link className="quick" href="/arizalar">
              <b>Arıza Kayıtları</b>
              <span>Filtrele ve süreci takip et</span>
            </Link>
            {(u.role === 'yonetici' || u.role === 'goruntuleyici') && (
              <Link className="quick" href="/raporlar">
                <b>Raporlama Merkezi</b>
                <span>KPI, trend ve yönetim raporları</span>
              </Link>
            )}
          </div>
        </section>
      </div>

      {u.role === 'yonetici' && <TechnicianWorkload items={techWork} />}
      {u.role === 'goruntuleyici' && (
        <section className="viewer-note card">
          <b>Salt-okunur mod</b>
          <span>
            Bu hesap arıza kayıtlarını ve raporları görüntüleyebilir; işlem, atama, kullanıcı ve
            kategori yönetimi yapamaz.
          </span>
        </section>
      )}
      {u.role !== 'goruntuleyici' && <PushSetup />}
    </>
  );
}
