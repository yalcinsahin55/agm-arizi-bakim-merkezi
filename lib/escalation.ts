import { db } from './db';
import type { Breakdown, User } from '@/types';
import { createNotification, notifyManagers } from './notifications';

async function createSystemEvent(breakdown: Breakdown, type: string, note: string, level: number) {
    const database = await db();
    const eventId = `escalation:${breakdown._id}:${level}`;
    await database.collection('breakdown_events').updateOne({ eventId }, {
        $setOnInsert: {
            breakdownId: breakdown._id,
            eventId,
            type,
            actorId: 'system',
            actorName: 'Bildirim Servisi',
            note,
            createdAt: new Date(),
        },
    }, { upsert: true });
    return eventId;
}

export async function escalateUnresponsiveBreakdowns() {
    const database = await db();
    const now = new Date();
    const rows = await database
        .collection('breakdowns')
        .find({
        status: { $in: ['atandi', 'devam_ediyor'] },
        assignedTechnicianId: { $exists: true },
        archived: { $ne: true },
    })
        .limit(100)
        .toArray();
    let escalated = 0;
    for (const breakdown of rows) {
        const assignedAt = breakdown.assignedAt ? new Date(breakdown.assignedAt).getTime() : 0;
        if (!assignedAt)
            continue;
        const minutes = Math.floor((now.getTime() - assignedAt) / 60000);
        const seen = Boolean(breakdown.seenAt);
        const started = Boolean(breakdown.startedAt);
        const currentLevel = Number(breakdown.escalationLevel || 0);
        // Mesai dışı nöbetçi ataması evden yola çıkmayı gerektirdiğinden,
        // teknisyenin tanımlı ulaşım süresi kadar eskalasyon eşikleri ötelenir.
        const travelBuffer = Number(breakdown.assignedTravelBufferMinutes || 0);
        if (minutes >= 15 + travelBuffer && !seen && currentLevel < 1) {
            const eventId = await createSystemEvent(breakdown as unknown as Breakdown, 'escalation', 'Teknisyen 15 dakika içinde bildirimi görmedi.', 1);
            const result = await database.collection('breakdowns').updateOne({ _id: breakdown._id, escalationLevel: { $lt: 1 } }, { $set: { escalationLevel: 1, updatedAt: now } });
            if (result.modifiedCount) {
                await notifyManagers(breakdown as unknown as Breakdown, eventId, 'escalation');
                await createNotification({
                    recipientId: String(breakdown.assignedTechnicianId),
                    breakdownId: String(breakdown._id),
                    eventId: `${eventId}:tech`,
                    title: 'Arıza bildirimi bekliyor',
                    body: `${breakdown.code} için bildirimi görüp işe başlamanız bekleniyor.`,
                    href: `/arizalar/${breakdown._id}`,
                });
                escalated += 1;
            }
            continue;
        }
        if (minutes >= 30 + travelBuffer && seen && !started && currentLevel < 2) {
            const candidates = await database
                .collection<User>('users')
                .find({
                role: 'teknisyen',
                active: true,
                _id: { $ne: String(breakdown.assignedTechnicianId) },
            })
                .toArray();
            if (candidates.length) {
                const workload = await Promise.all(candidates.map(async (candidate) => ({
                    candidate,
                    count: await database.collection('breakdowns').countDocuments({
                        assignedTechnicianId: candidate._id,
                        status: { $in: ['atandi', 'devam_ediyor', 'revizyon'] },
                        archived: { $ne: true },
                    }),
                })));
                workload.sort((a, b) => a.count - b.count);
                const replacement = workload[0].candidate;
                const eventId = await createSystemEvent(breakdown as unknown as Breakdown, 'escalation_reassign', `Teknisyen 30 dakika içinde müdahaleye başlamadı; ${replacement.name} otomatik devralma adayı olarak atandı.`, 2);
                const result = await database.collection('breakdowns').updateOne({ _id: breakdown._id, escalationLevel: { $lt: 2 } }, {
                    $set: {
                        assignedTechnicianId: replacement._id,
                        assignedTechnicianName: replacement.name,
                        status: 'atandi',
                        assignedAt: now,
                        seenAt: null,
                        acknowledgedAt: null,
                        startedAt: null,
                        escalationLevel: 2,
                        updatedAt: now,
                    },
                });
                if (result.modifiedCount) {
                    await createNotification({
                        recipientId: replacement._id,
                        breakdownId: String(breakdown._id),
                        eventId: `${eventId}:replacement`,
                        title: 'Eskalasyon: yeni arıza görevi',
                        body: `${breakdown.code} • ${breakdown.motorName} • ${breakdown.categoryName}`,
                        href: `/arizalar/${breakdown._id}`,
                    });
                    await notifyManagers({
                        ...breakdown,
                        assignedTechnicianId: replacement._id,
                        assignedTechnicianName: replacement.name,
                    } as unknown as Breakdown, eventId, 'escalation');
                    escalated += 1;
                }
            }
            continue;
        }
        if (minutes >= 60 + travelBuffer && currentLevel < 3) {
            const eventId = await createSystemEvent(breakdown as unknown as Breakdown, 'escalation_critical', 'Arıza 60 dakika içinde çözüme ilerlemedi; kritik eskalasyon oluşturuldu.', 3);
            const result = await database.collection('breakdowns').updateOne({ _id: breakdown._id, escalationLevel: { $lt: 3 } }, { $set: { escalationLevel: 3, updatedAt: now } });
            if (result.modifiedCount) {
                await notifyManagers(breakdown as unknown as Breakdown, eventId, 'escalation');
                await escalatedCriticalAlert(breakdown as unknown as Breakdown, eventId);
                escalated += 1;
            }
        }
    }
    return escalated;
}

async function escalatedCriticalAlert(breakdown: Breakdown, eventId: string) {
    const database = await db();
    const managers = await database
        .collection<User>('users')
        .find({ role: 'yonetici', active: true })
        .toArray();
    await Promise.all(managers.map((manager) => createNotification({
        recipientId: manager._id,
        breakdownId: String(breakdown._id),
        eventId: `${eventId}:critical:${manager._id}`,
        title: 'KRİTİK ESKALASYON',
        body: `${breakdown.code} 60 dakikadır çözüme ilerlemedi. Acil müdahale gerekiyor.`,
        href: `/arizalar/${breakdown._id}`,
    })));
}
