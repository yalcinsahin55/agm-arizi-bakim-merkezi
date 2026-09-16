import { db } from './db';
import { isMondayInTurkey, turkeyWeekStart } from './tz';
import type { User } from '@/types';
import { createNotification } from './notifications';

/**
 * Her Pazartesi çalışır (günlük cron içinden çağrılır, kendi içinde gün
 * kontrolü yapar): o haftanın nöbet planı (elektromekanik + normal) eksikse
 * yöneticilere bir kez uyarı gönderir. Plan tamamsa hiçbir şey yapmaz.
 */
export async function checkWeeklyDutyRoster(): Promise<boolean> {
    const now = new Date();
    if (!isMondayInTurkey(now)) return false;

    const database = await db();
    const weekStart = turkeyWeekStart(now);
    const duty = await database.collection('duty_roster').findOne({ weekStart });
    const missing: string[] = [];
    if (!duty?.elektromekanikTechnicianId) missing.push('Elektromekanik');
    if (!duty?.normalTechnicianId) missing.push('Normal');
    if (!missing.length) return false;

    const managers = await database.collection<User>('users').find({ role: 'yonetici', active: true }).toArray();
    await Promise.all(managers.map((manager) => createNotification({
        recipientId: manager._id,
        breakdownId: '',
        eventId: `duty-roster-missing:${weekStart}:${manager._id}`,
        title: 'Bu hafta nöbetçi seçilmedi',
        body: `${weekStart} haftası için ${missing.join(' ve ')} nöbetçi teknisyen(ler)i henüz atanmadı. Lütfen nöbet planını tamamlayın.`,
        href: '/yonetim/nobet',
    })));
    return true;
}
