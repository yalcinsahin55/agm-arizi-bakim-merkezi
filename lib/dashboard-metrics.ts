import type { Breakdown } from '@/types';

export const activeStatuses = ['acik', 'atandi', 'devam_ediyor', 'revizyon'] as const;

const TURKEY_OFFSET_MS = 3 * 60 * 60 * 1000;

// Bu dosyadaki gün/saat gruplaması sunucunun çalıştığı saat dilimine değil
// (Vercel varsayılan olarak UTC), her zaman Türkiye yerel saatine göre
// yapılmalı — aksi halde gece vardiyasında (00:00-03:00 TR) açılan arızalar
// grafikte bir önceki güne düşüyor ya da "bugün" saatlik dağılımında hiç
// görünmüyordu. lib/tz.ts'teki sabit +3 saat ofset yaklaşımıyla aynı mantık.
function toTurkeyShifted(date: Date): Date {
  return new Date(date.getTime() + TURKEY_OFFSET_MS);
}

/** Türkiye yerel gününün başlangıcı (UTC Date olarak saklanır, "gün" Türkiye'ye göredir). */
function turkeyStartOfDay(d: Date): Date {
  const shifted = toTurkeyShifted(d);
  shifted.setUTCHours(0, 0, 0, 0);
  return new Date(shifted.getTime() - TURKEY_OFFSET_MS);
}

/** YYYY-MM-DD, Türkiye yerel tarihine göre. */
function turkeyDateKey(d: Date): string {
  return toTurkeyShifted(d).toISOString().slice(0, 10);
}

export function daysAgo(days: number): Date {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}

export function buildDayBuckets(days: number, all: Breakdown[]) {
  const now = new Date();
  const points: { label: string; count: number; closed: number; key: string }[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const day = turkeyStartOfDay(new Date(now.getTime() - i * 86400000));
    const key = turkeyDateKey(day);
    const label =
      days <= 1
        ? 'Bugün'
        : toTurkeyShifted(day).toLocaleDateString('tr-TR', { timeZone: 'UTC', weekday: 'short', day: 'numeric' });
    points.push({ label, count: 0, closed: 0, key });
  }
  const map = Object.fromEntries(points.map((p) => [p.key, p]));
  for (const row of all) {
    if (row.createdAt) {
      const k = turkeyDateKey(new Date(row.createdAt));
      if (map[k]) map[k].count += 1;
    }
    const closedAt = row.closedAt || (row.status === 'onaylandi' ? row.updatedAt : null);
    if (closedAt) {
      const k = turkeyDateKey(new Date(closedAt));
      if (map[k]) map[k].closed += 1;
    }
  }
  return points.map(({ label, count, closed }) => ({ label, count, closed }));
}

export function buildHourBuckets(all: Breakdown[]) {
  const todayKey = turkeyDateKey(new Date());
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
    if (!row.createdAt) continue;
    const created = new Date(row.createdAt);
    if (turkeyDateKey(created) !== todayKey) continue;
    const h = toTurkeyShifted(created).getUTCHours();
    const idx = slots.findIndex((s) => h >= s.from && h < s.to);
    if (idx >= 0) counts[idx].count += 1;
  }
  return counts;
}
