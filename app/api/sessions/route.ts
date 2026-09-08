import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { rateLimit, rateLimitResponse } from '@/lib/security';
import { revokeSession, type SessionRecord } from '@/lib/session';
export async function GET() {
    const user = await getCurrentUser();
    if (!user || user.role !== 'yonetici') {
        return NextResponse.json({ error: 'Yetkisiz' }, { status: 403 });
    }
    const sessions = await (await db())
        .collection<SessionRecord>('sessions')
        .find({ revokedAt: { $exists: false }, expiresAt: { $gt: new Date() } })
        .sort({ lastSeenAt: -1 })
        .limit(500)
        .toArray();
    const userIds = [...new Set(sessions.map((session) => session.userId))];
    const users = await (await db()).collection('users').find({ _id: { $in: userIds } }, { projection: { name: 1, email: 1 } }).toArray();
    const userMap = new Map(users.map((item) => [String(item._id), item]));
    return NextResponse.json(sessions.map((session) => ({
        _id: session._id,
        userId: session.userId,
        userName: userMap.get(session.userId)?.name || 'Bilinmeyen kullanıcı',
        userEmail: userMap.get(session.userId)?.email || '',
        createdAt: session.createdAt,
        lastSeenAt: session.lastSeenAt,
        expiresAt: session.expiresAt,
        userAgent: session.userAgent,
        ip: session.ip,
    })));
}
export async function DELETE(req: Request) {
    const user = await getCurrentUser();
    if (!user || user.role !== 'yonetici') {
        return NextResponse.json({ error: 'Yetkisiz' }, { status: 403 });
    }
    const limit = await rateLimit(req, 'sessions:revoke', user, 30);
    if (!limit.ok)
        return rateLimitResponse(limit.retryAfter);
    const body = (await req.json().catch(() => ({}))) as {
        id?: unknown;
    };
    const id = String(body.id || '');
    if (!id)
        return NextResponse.json({ error: 'Oturum gerekli' }, { status: 400 });
    const result = await revokeSession(await db(), id);
    if (!result.matchedCount) {
        return NextResponse.json({ error: 'Oturum bulunamadı veya zaten kapatılmış' }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
}

