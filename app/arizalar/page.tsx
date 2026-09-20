import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { can } from '@/lib/permissions';
import NewBreakdownForm from './_components/NewBreakdownForm';

// Bu form önceden 'use client' olarak doğrudan sayfaydı ve hiçbir rol kontrolü
// yoktu — sadece submit sırasında arkadaki /api/breakdowns (POST) 403
// döndürüyordu. Teknisyen ya da görüntüleyici linke doğrudan gitseydi,
// formun tamamını doldurup en son adımda "Kayıt oluşturulamadı" hatasıyla
// karşılaşırdı. Şimdi sunucu tarafında, form hiç render edilmeden önce
// yönlendiriliyor.
export default async function YeniArizaPage() {
  const u = await getCurrentUser();
  if (!u) redirect('/giris');
  if (!can(u.role, 'breakdown:create')) redirect('/');
  return <NewBreakdownForm />;
}
