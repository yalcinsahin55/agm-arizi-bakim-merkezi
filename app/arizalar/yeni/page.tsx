import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { can } from '@/lib/permissions';
import NewBreakdownForm from './_components/NewBreakdownForm';

export default async function YeniArizaPage() {
  const u = await getCurrentUser();
  if (!u) redirect('/giris');
  if (!can(u.role, 'breakdown:create')) redirect('/');
  return <NewBreakdownForm />;
}
