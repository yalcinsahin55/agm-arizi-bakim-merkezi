export const priorityLabel: Record<string, string> = {
  kritik: 'Kritik',
  yuksek: 'Yüksek',
  orta: 'Orta',
  dusuk: 'Düşük',
};

export const statusLabel: Record<string, string> = {
  acik: 'Açık',
  atandi: 'Atandı',
  devam_ediyor: 'Devam ediyor',
  onay_bekliyor: 'Onay bekliyor',
  revizyon: 'Revizyon',
  onaylandi: 'Kapandı',
  iptal: 'İptal',
};

export function relativeTime(iso: string | Date | null | undefined): string {
  if (!iso) return '—';
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return '—';
  const mins = Math.max(0, Math.round((Date.now() - t) / 60000));
  if (mins < 1) return 'az önce';
  if (mins < 60) return `${mins} dk önce`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} sa ${mins % 60} dk önce`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} gün önce`;
  return new Date(iso).toLocaleDateString('tr-TR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}
