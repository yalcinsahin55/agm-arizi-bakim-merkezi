import { randomUUID } from 'node:crypto';
import type { Db } from 'mongodb';
export type SessionRecord = {
    _id: string;
    userId: string;
    createdAt: Date;
    lastSeenAt: Date;
    expiresAt: Date;
    userAgent?: string;
    ip?: string;
    revokedAt?: Date;
};
export function sessionId() {
    return randomUUID();
}
export async function revokeSession(database: Db, id: string, userId?: string) {
    return database.collection<SessionRecord>('sessions').updateOne({ _id: id, ...(userId ? { userId } : {}), revokedAt: { $exists: false } }, { $set: { revokedAt: new Date() } });
}

