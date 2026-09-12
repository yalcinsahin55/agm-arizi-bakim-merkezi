import { createNotification } from '@/lib/notify';
import { queueWhatsappMessage } from '@/lib/whatsapp-outbox';
import type { User } from '@/types';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://agm-arizi-bakim-merkezi-zsru.vercel.app';

export async function notifyTechnicianAssignment(
  tech: Pick<User, '_id' | 'phoneNumber' | 'whatsappEnabled'>,
  breakdown: { _id: unknown; code: string; motorName: string; categoryName: string; priority: string },
  eventId: string,
  title = 'Yeni arıza atandı',
) {
  await createNotification({
    recipientId: tech._id,
    breakdownId: String(breakdown._id),
    eventId,
    title,
    body: `${breakdown.code} • ${breakdown.motorName} • ${breakdown.categoryName}`,
    href: `/arizalar/${breakdown._id}`,
  });
  const waPhone = String(tech.phoneNumber || '');
  if (waPhone && tech.whatsappEnabled !== false) {
    await queueWhatsappMessage(
      waPhone,
      `🔧 GÖREV ATANDI ${breakdown.code} | Motor: ${breakdown.motorName} | ${breakdown.categoryName} | Öncelik: ${breakdown.priority}\n🔗 İş emri: ${APP_URL}/arizalar/${breakdown._id}`,
      'breakdown_assigned',
    );
  }
}
