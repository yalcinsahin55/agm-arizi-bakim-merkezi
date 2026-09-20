import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import ReportsView from './_components/ReportsView';

// Sayfanın kendi metni zaten "CEO/Görüntüleyici ve yöneticiler için" diyor ve
// /api/reports de sadece bu iki role izin veriyor — ama sayfa hiç korumasızdı.
// Önceden teknisyen (mobil "Diğer" menüsünden) buraya gelebiliyordu; filtreler
// görünüyor ama "Raporu Oluştur"a basınca API 403 dönüyor ve sayfa
// (`if (!response.ok) return;`) bunu hiçbir şekilde göstermeden sessizce
// hiçbir şey yapmıyordu. Teknisyen menüsünden linki kaldırdık, ama linke
// doğrudan gidilmesi ihtimaline karşı sayfayı da sunucu tarafında koruyoruz.
export default async function RaporlarPage() {
  const u = await getCurrentUser();
  if (!u) redirect('/giris');
  if (!['yonetici', 'goruntuleyici'].includes(u.role)) redirect('/');
  return <ReportsView />;
}
