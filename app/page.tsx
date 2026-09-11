import { getCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';
import Link from 'next/link';
import PushSetup from '@/components/PushSetup';
import DashboardKpis from '@/components/dashboard/DashboardKpis';
import RecentBreakdowns from '@/components/dashboard/RecentBreakdowns';
import TechnicianWorkload from '@/components/dashboard/TechnicianWorkload';
import TrendBars from '@/components/dashboard/TrendBars';
import type { Breakdown, User } from '@/types';
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
  const q: Record<string, unknown> = {
    archived: { $ne: true },
    ...(u.role === 'yonetici' || u.role === 'goruntuleyici'
      ? {}
      : u.role === 'teknisyen'
        ? { assignedTechnicianId: u._id }
        : { createdBy: u._id }),
  };

  const since14 = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
  const isManager = u.role === 'yonetici';

  // Tek turda KPI + trend + recent (1000 doküman + N+1 teknisyen sorgusu yok)
  const [facetRows, recent, trendRows, technicians, motorCount] = await Promise.all([
    b
      .aggregate<{
        open: { n: number }[];
        critical: { n: number }[];
        approval: { n: number }[];
        closed: { n: number }[];
        notSeen: { n: number }[];
        mttr: { avg: number }[];
      }>([
        { $match: q as any },
        {
          $facet: {
            open: [
              { $match: { status: { $in: [...activeStatuses] } } },
              { $count: 'n' },
            ],
            critical: [
              {
                $match: {
                  status: { $in: [...activeStatuses] },
                  priority: 'kritik',
                },
              },
              { $count: 'n' },
            ],
            approval: [{ $match: { status: 'onay_bekliyor' } }, { $count: 'n' }],
            closed: [{ $match: { status: 'onaylandi' } }, { $count: 'n' }],
            notSeen: isManager
              ? [
                  {
                    $match: {
                      status: 'atandi',
                      $or: [{ seenAt: { $exists: false } }, { seenAt: null }],
                    },
                  },
                  { $count: 'n' },
                ]
              : [{ $limit: 0 }],
            mttr: [
              {
                $match: {
                  startedAt: { $type: 'date' },
                  closedAt: { $type: 'date' },
                },
              },
              { $sort: { closedAt: -1 } },
              { $limit: 150 },
              {
                $project: {
                  mins: {
                    $divide: [{ $subtract: ['$closedAt', '$startedAt'] }, 60000],
                  },
                },
              },
              { $match: { mins: { $gte: 0 } } },
              { $group: { _id: null, avg: { $avg: '$mins' } } },
            ],
          },
        },
      ])
      .toArray(),
    b
      .find(q as any)
      .sort({ createdAt: -1 })
      .limit(8)
      .project({
        code: 1,
        title: 1,
        status: 1,
        priority: 1,
        motorName: 1,
        categoryName: 1,
        assignedTechnicianName: 1,
        createdAt: 1,
        createdByName: 1,
      })
      .toArray() as Promise<Breakdown[]>,
    b
      .find({
        ...q,
        $or: [
          { createdAt: { $gte: since14 } },
          { closedAt: { $gte: since14 } },
        ],
      } as any)
      .project({ createdAt: 1, closedAt: 1, status: 1, updatedAt: 1, startedAt: 1 })
      .limit(400)
      .toArray() as Promise<Breakdown[]>,
    isManager
      ? d
          .collection<User>('users')
          .find({ role: 'teknisyen', active: true })
          .project({ name: 1 })
          .toArray()
      : Promise.resolve([] as User[]),
    d.collection('motors').countDocuments({ active: true }),
  ]);

  const facet = facetRows[0] || {
    open: [],
    critical: [],
    approval: [],
    closed: [],
    notSeen: [],
    mttr: [],
  };
  const open = facet.open[0]?.n ?? 0;
  const critical = facet.critical[0]?.n ?? 0;
  const approval = facet.approval[0]?.n ?? 0;
  const closed = facet.closed[0]?.n ?? 0;
  const notSeen = facet.notSeen[0]?.n ?? 0;
  const avgMttr =
    facet.mttr[0]?.avg != null ? Math.round(facet.mttr[0].avg) : null;

  const all = trendRows as Breakdown[];

  let techWork: { name: string; count: number; started: number }[] = [];
  if (isManager && technicians.length) {
    const techIds = technicians.map((t) => String(t._id));
    const workload = await b
      .aggregate<{ _id: string; count: number; started: number }>([
        {
          $match: {
            assignedTechnicianId: { $in: techIds },
            status: { $in: ['atandi', 'devam_ediyor', 'revizyon'] },
            archived: { $ne: true },
          },
        },
        {
          $group: {
            _id: '$assignedTechnicianId',
            count: { $sum: 1 },
            started: {
              $sum: { $cond: [{ $eq: ['$status', 'devam_ediyor'] }, 1, 0] },
            },
          },
        },
      ])
      .toArray();
    const wmap = new Map(workload.map((w) => [String(w._id), w]));
    techWork = technicians.map((t) => {
      const w = wmap.get(String(t._id));
      return {
        name: t.name,
        count: w?.count ?? 0,
        started: w?.started ?? 0,
      };
    });
  }

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
              <span>Aktif arıza</span>
              <b>{open}</b>
            </div>
            <div>
              <span>Kritik (aktif)</span>
              <b>{critical}</b>
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
