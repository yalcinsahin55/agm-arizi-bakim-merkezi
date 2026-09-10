import { db } from '@/lib/db';
import type { User } from '@/types';
type RateLimitDoc = {
    _id: string;
    scope: string;
    ip: string;
    userId: string | null;
    windowStart: Date;
    count: number;
    updatedAt: Date;
};
const WINDOW_MS = 60000;
const DEFAULT_LIMIT = 60;
function clientIp(req: Request): string {
    const forwarded = req.headers.get('x-forwarded-for');
    return (forwarded?.split(',')[0]?.trim() || req.headers.get('x-real-ip') || 'unknown').slice(0, 100);
}
export async function rateLimit(req: Request, scope: string, user?: Pick<User, '_id'> | null, limit = DEFAULT_LIMIT) {
    const now = new Date();
    const bucket = Math.floor(now.getTime() / WINDOW_MS);
    const ip = clientIp(req);
    const key = `${scope}:ip:${ip}:user:${user?._id ?? 'anonymous'}:bucket:${bucket}`;
    const collection = (await db()).collection<RateLimitDoc>('rate_limits');
    const current = await collection.findOneAndUpdate({ _id: key }, {
        $inc: { count: 1 },
        $set: { updatedAt: now },
        $setOnInsert: { _id: key, scope, ip, userId: user?._id ?? null, windowStart: new Date(bucket * WINDOW_MS) },
    }, { upsert: true, returnDocument: 'after' });
    const count = current?.count ?? 1;
    if (count <= limit)
        return { ok: true as const, remaining: limit - count };
    const retryAfter = Math.max(1, Math.ceil(((bucket + 1) * WINDOW_MS - now.getTime()) / 1000));
    return { ok: false as const, retryAfter };
}
export function rateLimitResponse(retryAfter: number) {
    return new Response(JSON.stringify({ error: 'Çok fazla istek. Lütfen kısa süre sonra tekrar deneyin.' }), {
        status: 429,
        headers: { 'Content-Type': 'application/json', 'Retry-After': String(retryAfter), 'Cache-Control': 'no-store' },
    });
}

