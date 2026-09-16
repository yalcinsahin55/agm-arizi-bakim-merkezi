import { db } from './db';
import { turkeyWeekStart } from './tz';
import type { Breakdown, User } from '@/types';
import { activeStatuses, buildDayBuckets, buildHourBuckets, daysAgo } from './dashboard-metrics';

export type DashboardData = {
  open: number;
  critical: number;
  approval: number;
  closed: number;
  notSeen: number;
  avgMttr: number | null;
  motorCount: number;
  recent: Breakdown[];
  techWork: { name: string; count: number; started: number }[];
  weekTrend: { label: string; count: number; closed: number }[];
  todayTrend: { label: string; count: number }[];
  dutyIncomplete: boolean;
  dutyElektromekanikName: string | null;
  dutyNormalName: string | null;
  title: string;
  greet: string;
  roleMsg: string;
  todayLabel: string;
};

/**
 * Ana sayfa (dashboard) için tüm veri toplama ve hesaplama mantığı.
 * app/page.tsx sadece bu fonksiyonun döndürdüğü veriyi render eder.
 */
export async function getDashboardData(u: User): Promise<DashboardData> {
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

  const since14 = daysAgo(14);
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

  const currentWeekStart = turkeyWeekStart();
  const thisWeekDuty = await d.collection('duty_roster').findOne({ weekStart: currentWeekStart });
  const dutyIncomplete = !thisWeekDuty?.elektromekanikTechnicianId || !thisWeekDuty?.normalTechnicianId;

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

  return {
    open,
    critical,
    approval,
    closed,
    notSeen,
    avgMttr,
    motorCount,
    recent,
    techWork,
    weekTrend: buildDayBuckets(7, all),
    todayTrend: buildHourBuckets(all),
    dutyIncomplete,
    dutyElektromekanikName: thisWeekDuty?.elektromekanikTechnicianName ?? null,
    dutyNormalName: thisWeekDuty?.normalTechnicianName ?? null,
    title,
    greet,
    roleMsg,
    todayLabel,
  };
}
