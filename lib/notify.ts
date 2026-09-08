import webpush from 'web-push';
import type { ObjectId } from 'mongodb';
import { db } from './db';
import type { Breakdown, User } from '@/types';
export type NotificationInput = {
    recipientId: string;
    breakdownId: string;
    eventId: string;
    title: string;
    body: string;
    href: string;
};
type NotificationDocument = {
    _id: ObjectId;
    recipientId: string;
    breakdownId: string;
    eventId: string;
    title: string;
    body: string;
    href: string;
    status: 'unread' | 'seen';
    pushStatus?: 'pending' | 'accepted' | 'partial' | 'failed' | 'no_subscription' | 'not_configured';
    attempts?: number;
    lastPushAt?: Date;
};
function pushConfigured() {
    return Boolean(process.env.VAPID_PUBLIC_KEY &&
        process.env.VAPID_PRIVATE_KEY &&
        process.env.VAPID_SUBJECT);
}
async function sendPush(notification: NotificationDocument) {
    const database = await db();
    if (!pushConfigured()) {
        await database.collection('notifications').updateOne({ _id: notification._id }, {
            $set: {
                pushStatus: 'not_configured',
                lastPushAt: new Date(),
            },
            $inc: { attempts: 1 },
        });
        return { status: 'not_configured' as const, delivered: 0, failed: 0 };
    }
    webpush.setVapidDetails(process.env.VAPID_SUBJECT!, process.env.VAPID_PUBLIC_KEY!, process.env.VAPID_PRIVATE_KEY!);
    const subscriptions = await database
        .collection('push_subscriptions')
        .find({ userId: notification.recipientId })
        .toArray();
    if (!subscriptions.length) {
        await database.collection('notifications').updateOne({ _id: notification._id }, {
            $set: {
                pushStatus: 'no_subscription',
                lastPushAt: new Date(),
            },
            $inc: { attempts: 1 },
        });
        await notifyManagersOfMissingPush(notification);
        return { status: 'no_subscription' as const, delivered: 0, failed: 0 };
    }
    let delivered = 0;
    let failed = 0;
    let lastError = '';
    for (const subscription of subscriptions) {
        try {
            await webpush.sendNotification(subscription.subscription, JSON.stringify({
                title: notification.title,
                body: notification.body,
                data: {
                    href: notification.href,
                    notificationId: String(notification._id),
                },
            }));
            delivered += 1;
        }
        catch (error: unknown) {
            failed += 1;
            lastError = error instanceof Error ? error.message : 'Push gönderilemedi';
            const statusCode = typeof error === 'object' && error !== null && 'statusCode' in error
                ? Number((error as {
                    statusCode?: unknown;
                }).statusCode)
                : undefined;
            if (statusCode === 404 || statusCode === 410) {
                await database.collection('push_subscriptions').deleteOne({ _id: subscription._id });
            }
        }
    }
    const pushStatus = delivered === subscriptions.length ? 'accepted' : delivered ? 'partial' : 'failed';
    await database.collection('notifications').updateOne({ _id: notification._id }, {
        $set: {
            pushStatus,
            pushAccepted: delivered,
            pushFailed: failed,
            lastPushAt: new Date(),
            ...(failed ? { lastPushError: lastError } : {}),
        },
        $inc: { attempts: 1 },
    });
    if (failed) {
        await notifyManagersOfPushFailure(notification, lastError);
    }
    return { status: pushStatus, delivered, failed };
}
async function notifyManagersOfMissingPush(notification: NotificationDocument) {
    const database = await db();
    const recipient = await database.collection('users').findOne({ _id: notification.recipientId });
    if (!recipient)
        return;
    const managers = await database
        .collection<User>('users')
        .find({ role: 'yonetici', active: true, _id: { $ne: recipient._id } })
        .toArray();
    await Promise.all(managers.map(async (manager) => {
        const eventId = `${notification.eventId}:push-missing:${manager._id}`;
        await database.collection('notifications').updateOne({ eventId }, {
            $setOnInsert: {
                recipientId: manager._id,
                breakdownId: notification.breakdownId,
                eventId,
                title: 'Teknisyen push bildirimi etkin değil',
                body: `${recipient.name} için cihaz bildirimi kaydı bulunamadı. ${notification.title}`,
                href: notification.href,
                status: 'unread',
                pushStatus: 'fallback_only',
                attempts: 0,
                createdAt: new Date(),
            },
        }, { upsert: true });
    }));
}
async function notifyManagersOfPushFailure(notification: NotificationDocument, reason: string) {
    const database = await db();
    const managers = await database
        .collection<User>('users')
        .find({ role: 'yonetici', active: true })
        .toArray();
    await Promise.all(managers.map((manager) => createNotification({
        recipientId: manager._id,
        breakdownId: notification.breakdownId,
        eventId: `${notification.eventId}:push-failed:${manager._id}`,
        title: 'Push bildirimi gönderilemedi',
        body: `${notification.title} • ${reason}`,
        href: notification.href,
    })));
}
export async function createNotification(input: NotificationInput) {
    const database = await db();
    const now = new Date();
    let notification: NotificationDocument;
    try {
        const result = await database.collection('notifications').insertOne({
            ...input,
            status: 'unread',
            pushStatus: 'pending',
            attempts: 0,
            createdAt: now,
        });
        notification = {
            ...input,
            _id: result.insertedId,
            status: 'unread',
        };
    }
    catch (error: unknown) {
        const code = typeof error === 'object' && error !== null && 'code' in error
            ? Number((error as {
                code?: unknown;
            }).code)
            : undefined;
        if (code === 11000) {
            const existing = await database.collection('notifications').findOne({ eventId: input.eventId });
            return existing;
        }
        throw error;
    }
    try {
        await sendPush(notification);
    }
    catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Push gönderilemedi';
        await database
            .collection('notifications')
            .updateOne({ _id: notification._id }, {
            $set: {
                pushStatus: 'failed',
                lastPushAt: new Date(),
                lastPushError: message,
            },
            $inc: { attempts: 1 },
        })
            .catch(() => undefined);
    }
    return notification;
}
function managerMessage(eventType: string, breakdown: Breakdown) {
    const technician = breakdown.assignedTechnicianName || 'Teknisyen';
    switch (eventType) {
        case 'created':
            return {
                title: 'Yeni arıza kaydı',
                body: `${breakdown.code} • ${breakdown.motorName} • ${breakdown.categoryName}`,
            };
        case 'seen':
            return {
                title: 'Teknisyen bildirimi gördü',
                body: `${breakdown.code} • ${technician} bildirimi gördü`,
            };
        case 'accept':
            return {
                title: 'Teknisyen işi kabul etti',
                body: `${breakdown.code} • ${technician} işi kabul etti`,
            };
        case 'start':
            return {
                title: 'Teknisyen işe başladı',
                body: `${breakdown.code} • ${technician} müdahaleye başladı`,
            };
        case 'submit':
            return {
                title: 'Teknik rapor gönderildi',
                body: `${breakdown.code} • ${technician} raporu yönetime gönderdi`,
            };
        default:
            return {
                title: 'Arıza bildirimi',
                body: `${breakdown.code} • ${technician} için işlem süresi aşıldı`,
            };
    }
}
export async function notifyManagers(breakdown: Breakdown, eventId: string, eventType = 'created') {
    const database = await db();
    const managers = await database
        .collection<User>('users')
        .find({ role: 'yonetici', active: true })
        .toArray();
    const message = managerMessage(eventType, breakdown);
    await Promise.all(managers.map((manager) => createNotification({
        recipientId: manager._id,
        breakdownId: String(breakdown._id),
        eventId: `${eventId}:manager:${manager._id}`,
        title: message.title,
        body: message.body,
        href: `/arizalar/${breakdown._id}`,
    })));
}
export async function retryFailedNotifications() {
    const database = await db();
    const cutoff = new Date(Date.now() - 15 * 60 * 1000);
    const rows = await database
        .collection('notifications')
        .find({
        pushStatus: { $in: ['pending', 'failed', 'partial'] },
        attempts: { $lt: 5 },
        $or: [{ lastPushAt: { $exists: false } }, { lastPushAt: { $lt: cutoff } }],
    })
        .limit(100)
        .toArray();
    for (const notification of rows) {
        await sendPush(notification as NotificationDocument);
    }
    return rows.length;
}
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
        if (minutes >= 15 && !seen && currentLevel < 1) {
            const eventId = await createSystemEvent(breakdown as Breakdown, 'escalation', 'Teknisyen 15 dakika içinde bildirimi görmedi.', 1);
            const result = await database.collection('breakdowns').updateOne({ _id: breakdown._id, escalationLevel: { $lt: 1 } }, { $set: { escalationLevel: 1, updatedAt: now } });
            if (result.modifiedCount) {
                await notifyManagers(breakdown as Breakdown, eventId, 'escalation');
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
        if (minutes >= 30 && seen && !started && currentLevel < 2) {
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
                const eventId = await createSystemEvent(breakdown as Breakdown, 'escalation_reassign', `Teknisyen 30 dakika içinde müdahaleye başlamadı; ${replacement.name} otomatik devralma adayı olarak atandı.`, 2);
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
                    } as Breakdown, eventId, 'escalation');
                    escalated += 1;
                }
            }
            continue;
        }
        if (minutes >= 60 && currentLevel < 3) {
            const eventId = await createSystemEvent(breakdown as Breakdown, 'escalation_critical', 'Arıza 60 dakika içinde çözüme ilerlemedi; kritik eskalasyon oluşturuldu.', 3);
            const result = await database.collection('breakdowns').updateOne({ _id: breakdown._id, escalationLevel: { $lt: 3 } }, { $set: { escalationLevel: 3, updatedAt: now } });
            if (result.modifiedCount) {
                await notifyManagers(breakdown as Breakdown, eventId, 'escalation');
                await escalatedCriticalAlert(breakdown as Breakdown, eventId);
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

