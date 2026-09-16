import { db } from './db';
import type { Breakdown, User } from '@/types';
import { sendPush, type NotificationDocument } from './push';

export type NotificationInput = {
    recipientId: string;
    breakdownId: string;
    eventId: string;
    title: string;
    body: string;
    href: string;
};

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
