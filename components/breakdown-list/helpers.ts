import type { Breakdown, User } from '@/types';

export type BreakdownRow = Breakdown & { createdAt: string };

export const STATUS_FILTERS: { key: string; label: string }[] = [
  { key: 'all', label: 'Tümü' },
  { key: 'acik', label: 'Açık' },
  { key: 'atandi', label: 'Atandı' },
  { key: 'devam_ediyor', label: 'Devam' },
  { key: 'onay_bekliyor', label: 'Onay' },
  { key: 'revizyon', label: 'Revizyon' },
  { key: 'onaylandi', label: 'Kapandı' },
];

export const PRIORITY_ORDER: Record<string, number> = {
  kritik: 0,
  yuksek: 1,
  orta: 2,
  dusuk: 3,
};

type ListUser = Pick<User, '_id' | 'role' | 'name'>;

export function canEditRow(r: BreakdownRow, user: ListUser) {
  if (r.archived) return false;
  if (r.status !== 'acik') return false;
  if (user.role === 'yonetici') return true;
  if (user.role === 'operator' && String(r.createdBy) === user._id) return true;
  return false;
}

export function canRemoveRow(r: BreakdownRow, user: ListUser) {
  if (r.archived) return false;
  if (user.role === 'yonetici') return true;
  if (user.role === 'operator' && String(r.createdBy) === user._id && r.status === 'acik') return true;
  return false;
}

export function matchesSearch(r: BreakdownRow, term: string) {
  if (!term) return true;
  const hay = [
    r.code,
    r.motorName,
    r.categoryName,
    r.subcategoryName,
    r.title,
    r.assignedTechnicianName,
    r.createdByName,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  return hay.includes(term);
}
