export type RecurrenceLevel = 'yuksek' | 'orta' | null;

/**
 * Aynı motor + aynı kategoride, verilen pencere içinde (varsayılan 90 gün)
 * mevcut kayıt HARİÇ kaç arıza daha açıldığına göre bir tekrarlama
 * seviyesi üretir. Eşikler:
 *  - 4 veya daha fazla ek kayıt: "yuksek" (yüksek tekrarlama)
 *  - 2-3 ek kayıt: "orta"
 *  - 0-1 ek kayıt: tekrarlama uyarısı yok (null)
 */
export function classifyRecurrence(priorCount: number): RecurrenceLevel {
  if (priorCount < 0) return null;
  if (priorCount >= 4) return 'yuksek';
  if (priorCount >= 2) return 'orta';
  return null;
}

export const RECURRENCE_WINDOW_DAYS = 90;

/** Şimdiki zamandan N gün öncesini döner. Sunucu bileşenlerinde render sırasında `Date.now()` çağırmamak için ayrı bir yardımcı fonksiyon olarak tutulur. */
export function daysAgo(days: number): Date {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}

export const recurrenceLabel: Record<Exclude<RecurrenceLevel, null>, string> = {
  yuksek: 'Yüksek tekrarlama',
  orta: 'Tekrarlayan arıza',
};
