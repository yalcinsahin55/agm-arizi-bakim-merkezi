import webpush from 'web-push';
import type { ObjectId } from 'mongodb';
import { db } from './db';
import type { User } from '@/types';
import { createNotification } from './notifications';

export type NotificationDocument = {
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

export function pushConfigured() {
    return Boolean(process.env.VAPID_PUBLIC_KEY &&
        process.env.VAPID_PRIVATE_KEY &&
        process.env.VAPID_SUBJECT);
}

export async function sendPush(notification: NotificationDocument) {
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
                icon: '/icon-192.png',
                badge: '/icon-96.png',
                tag: `agm-${notification.breakdownId || 'gen'}`,
                renotify: true,
                data: {
                    href: notification.href,
                    notificationId: String(notification._id),
                    breakdownId: notification.breakdownId,
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
    const recipient = await database.collection<User>('users').findOne({ _id: notification.recipientId });
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
