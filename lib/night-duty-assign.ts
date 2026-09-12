import type { Db } from 'mongodb';
import { isOffHours, turkeyWeekStart } from '@/lib/tz';
import { resolveNightRouteType, type CategoryLike } from '@/lib/night-route';
import { createNotification } from '@/lib/notify';
import type { TechnicianType, User } from '@/types';

type DutyDoc = {
  weekStart: string;
  elektromekanikTechnicianId: string | null;
  elektromekanikTechnicianName: string | null;
  normalTechnicianId: string | null;
  normalTechnicianName: string | null;
};

export type NightAssignment = {
  technicianId: string;
  technicianName: string;
  type: TechnicianType;
  phoneNumber?: string;
  whatsappEnabled?: boolean;
  /** Bu teknisyenin o andaki nöbetçi ulaşım süresi (dakika); arıza kaydına anlık görüntü olarak yazılır. */
  travelBufferMinutes: number;
} | null;

/**
 * Arıza mesai dışında (hafta içi 20:00-06:00 veya Cmt/Paz'ın tamamı) açıldıysa
 * VE arızayı açan kişi "kritik, üretim kaybı yaşanabilir" seçeneğini
 * işaretlediyse, kategoriye göre gereken nöbetçi tipini bulup bu haftanın
 * nöbet planındaki aktif teknisyeni döner. Mesai içindeyse, kritik
 * işaretlenmediyse (yedek ekipmanla idare ediliyorsa), nöbet planlanmamışsa
 * veya atanan teknisyen artık aktif değilse null döner — bu durumda arıza
 * normal akışta açık kalır ve yönetici mesaiye başlayınca manuel atar.
 */
export async function resolveNightDutyAssignment(
  d: Db,
  category: CategoryLike | null,
  criticalDispatch: boolean,
  now: Date = new Date(),
): Promise<NightAssignment> {
  if (!isOffHours(now) || !criticalDispatch) return null;

  const type = await resolveNightRouteType(d, category);
  const weekStart = turkeyWeekStart(now);
  const duty = await d.collection<DutyDoc>('duty_roster').findOne({ weekStart });

  const technicianId =
    type === 'elektromekanik' ? duty?.elektromekanikTechnicianId : duty?.normalTechnicianId;
  const technicianName =
    type === 'elektromekanik' ? duty?.elektromekanikTechnicianName : duty?.normalTechnicianName;

  if (!technicianId) {
    await warnManagersDutyMissing(d, weekStart, type);
    return null;
  }

  // Nöbetçi arada pasife alınmış veya rolü değişmiş olabilir; anlık doğrulama yapılır.
  const tech = await d.collection<User>('users').findOne({ _id: technicianId, role: 'teknisyen', active: true });
  if (!tech) {
    await warnManagersDutyMissing(d, weekStart, type);
    return null;
  }

  return {
    technicianId,
    technicianName: technicianName || tech.name,
    type,
    phoneNumber: tech.phoneNumber,
    whatsappEnabled: tech.whatsappEnabled,
    travelBufferMinutes: Number(tech.dutyTravelBufferMinutes || 0),
  };
}

/** Yöneticilere haftada/tipte bir kez "nöbetçi eksik" uyarısı gönderir (eventId ile tekilleştirilir). */
async function warnManagersDutyMissing(d: Db, weekStart: string, type: TechnicianType) {
  const managers = await d.collection<User>('users').find({ role: 'yonetici', active: true }).toArray();
  const typeLabel = type === 'elektromekanik' ? 'Elektromekanik' : 'Normal';
  await Promise.all(
    managers.map((manager) =>
      createNotification({
        recipientId: manager._id,
        breakdownId: '',
        eventId: `duty-missing:${weekStart}:${type}:${manager._id}`,
        title: 'Nöbetçi teknisyen eksik',
        body: `${weekStart} haftası için "${typeLabel}" nöbetçi teknisyen tanımlanmadığından kritik olarak işaretlenen bir arıza otomatik atanamadı. Nöbet planını tamamlayın.`,
        href: '/yonetim/nobet',
      }),
    ),
  );
}
