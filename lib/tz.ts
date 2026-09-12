/**
 * Türkiye 2016'dan beri yaz saati uygulamıyor, yıl boyu sabit UTC+3.
 * Bu yüzden Intl/DST karmaşasına girmeden basit bir sabit ofsetle
 * "Türkiye yerel saati" hesaplanabilir. Sunucu hangi saat diliminde
 * çalışırsa çalışsın (Vercel varsayılan olarak UTC kullanır) bu
 * fonksiyonlar her zaman doğru Türkiye saatini verir.
 */
const TURKEY_OFFSET_MS = 3 * 60 * 60 * 1000;

function toTurkeyShifted(date: Date): Date {
  return new Date(date.getTime() + TURKEY_OFFSET_MS);
}

/** YYYY-MM-DD, Türkiye yerel tarihine göre. */
export function turkeyDateKey(date: Date = new Date()): string {
  return toTurkeyShifted(date).toISOString().slice(0, 10);
}

/** 0-23 arası, Türkiye yerel saati. */
export function turkeyHour(date: Date = new Date()): number {
  return toTurkeyShifted(date).getUTCHours();
}

/** Gece nöbeti penceresi: 20:00 (dahil) - 06:00 (hariç) arası. */
export function isNightShift(date: Date = new Date()): boolean {
  const h = turkeyHour(date);
  return h >= 20 || h < 6;
}

/** Haftanın günü, Türkiye yereline göre: 0 = Pazartesi ... 6 = Pazar. */
export function turkeyWeekday(date: Date = new Date()): number {
  const shiftedDay = toTurkeyShifted(date).getUTCDay(); // 0=Paz(Sun) .. 6=Cmt(Sat)
  return (shiftedDay + 6) % 7;
}

export function isMondayInTurkey(date: Date = new Date()): boolean {
  return turkeyWeekday(date) === 0;
}

/** Cumartesi veya Pazar mı (Türkiye yereline göre)? 5 = Cumartesi, 6 = Pazar. */
export function turkeyIsWeekend(date: Date = new Date()): boolean {
  const dow = turkeyWeekday(date);
  return dow === 5 || dow === 6;
}

/**
 * "Mesai dışı" penceresi: hafta içi 20:00-06:00 gece vardiyası VEYA
 * Cumartesi/Pazar'ın tamamı. Nöbetçi sistemi ve kritik/üretim kaybı
 * seçeneği bu pencerede devreye girer.
 */
export function isOffHours(date: Date = new Date()): boolean {
  return isNightShift(date) || turkeyIsWeekend(date);
}

/** İçinde bulunulan haftanın Pazartesi'sinin tarihi (YYYY-MM-DD), Türkiye yereline göre. */
export function turkeyWeekStart(date: Date = new Date()): string {
  const shifted = toTurkeyShifted(date);
  const dow = turkeyWeekday(date);
  const monday = new Date(shifted.getTime() - dow * 24 * 60 * 60 * 1000);
  return monday.toISOString().slice(0, 10);
}
