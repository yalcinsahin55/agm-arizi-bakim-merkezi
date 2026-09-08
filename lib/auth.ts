import { cookies } from 'next/headers';
import { SignJWT, jwtVerify } from 'jose';
import { db } from './db';
import { sessionId } from './session';
import type { Role, User } from '@/types';
const configuredSecret = process.env.JWT_SECRET;
if (process.env.NODE_ENV === 'production' &&
    (!configuredSecret || configuredSecret.length < 32)) {
    throw new Error('Production ortamında en az 32 karakterlik JWT_SECRET zorunludur');
}
const secret = new TextEncoder().encode(configuredSecret || 'dev-only-change-me');
export async function signSession(user: Pick<User, '_id' | 'name' | 'email' | 'role'>, req?: Request) {
    const id = sessionId();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const database = await db();
    await database.collection('sessions').insertOne({
        _id: id,
        userId: user._id,
        createdAt: now,
        lastSeenAt: now,
        expiresAt,
        userAgent: req?.headers.get('user-agent') || undefined,
        ip: req?.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || undefined,
    });
    return new SignJWT({ ...user, sid: id })
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime('7d')
        .sign(secret);
}
export async function getCurrentUser(): Promise<User | null> {
    const token = (await cookies()).get('agm_arizi_session')?.value;
    if (!token)
        return null;
    try {
        const { payload } = await jwtVerify(token, secret);
        const userId = String(payload._id || '');
        const sid = String(payload.sid || '');
        if (!userId || !sid)
            return null;
        const database = await db();
        const session = await database.collection('sessions').findOne({
            _id: sid,
            userId,
            revokedAt: { $exists: false },
            expiresAt: { $gt: new Date() },
        });
        if (!session)
            return null;
        await database.collection('sessions').updateOne({ _id: sid }, { $set: { lastSeenAt: new Date() } });
        const user = await database
            .collection<User>('users')
            .findOne({ _id: userId });
        return user && user.active ? user : null;
    }
    catch {
        return null;
    }
}
export async function revokeCurrentSession() {
    const token = (await cookies()).get('agm_arizi_session')?.value;
    if (!token)
        return;
    try {
        const { payload } = await jwtVerify(token, secret);
        const sid = String(payload.sid || '');
        const userId = String(payload._id || '');
        if (sid && userId) {
            await (await db()).collection('sessions').updateOne({ _id: sid, userId }, { $set: { revokedAt: new Date() } });
        }
    }
    catch {
        // Cookie will still be removed by the logout route.
    }
}
export function can(role: Role, action: string) {
    const permissions: Record<Role, string[]> = {
        yonetici: ['*'],
        teknisyen: ['breakdown:view-assigned', 'breakdown:accept', 'breakdown:start', 'breakdown:report'],
        operator: ['breakdown:create', 'breakdown:edit-own', 'breakdown:delete-own', 'breakdown:view-own'],
        goruntuleyici: ['breakdown:view-all', 'report:view'],
    };
    return permissions[role].includes('*') || permissions[role].includes(action);
}

