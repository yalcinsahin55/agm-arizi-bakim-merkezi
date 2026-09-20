import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';

/**
 * /yonetim/kullanicilar, /yonetim/nobet, /yonetim/kategoriler, /yonetim/audit,
 * /yonetim/oturumlar — hepsi bu layout altında, tek bir yerden korunuyor.
 *
 * Önceden bu sayfaların hiçbirinde sayfa seviyesinde bir rol kontrolü yoktu;
 * sadece arkadaki API'lerin 403 dönmesine güveniliyordu. Menüden hiçbir yanlış
 * role bu sayfalar gösterilmediği için bu bir güvenlik açığı değildi, ama biri
 * linke doğrudan gitseydi (ör. yer imi, paylaşılan link), /raporlar'da
 * teknisyen için gördüğümüzle aynı şekilde "sessizce hiçbir şey olmayan boş
 * sayfa" deneyimiyle karşılaşırdı. Şimdi /arizalar/arsiv'deki gibi düzgün bir
 * yönlendirme yapılıyor — beş sayfaya ayrı ayrı eklemek yerine tek yerden.
 */
export default async function YonetimLayout({ children }: { children: React.ReactNode }) {
  const u = await getCurrentUser();
  if (!u) redirect('/giris');
  if (u.role !== 'yonetici') redirect('/');
  return <>{children}</>;
}
