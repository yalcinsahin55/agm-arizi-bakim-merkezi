import type { Breakdown } from '@/types';

export const activeStatuses = ['acik', 'atandi', 'devam_ediyor', 'revizyon'] as const;

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export function daysAgo(days: number): Date {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}

export function buildDayBuckets(days: number, all: Breakdown[]) {
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

export function buildHourBuckets(all: Breakdown[]) {
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
