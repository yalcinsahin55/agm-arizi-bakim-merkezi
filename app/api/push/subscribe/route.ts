import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { rateLimit, rateLimitResponse } from '@/lib/security';
import { getCurrentUser } from '@/lib/auth';

export async function POST(req: Request) {
  const u = await getCurrentUser();
  if (!u) return NextResponse.json({ error: 'Giriş gerekli' }, { status: 401 });
  const rl = await rateLimit(req, 'push:subscribe', u, 20);
  if (!rl.ok) return rateLimitResponse(rl.retryAfter);
  const subscription = await req.json();
  if (!subscription || typeof subscription !== 'object' || typeof (subscription as { endpoint?: unknown }).endpoint !== 'string') {
    return NextResponse.json({ error: 'Geçersiz push aboneliği' }, { status: 400 });
  }
  await (await db()).collection('push_subscriptions').updateOne(
    { userId: u._id, 'subscription.endpoint': (subscription as { endpoint: string }).endpoint },
    { $set: { userId: u._id, subscription, updatedAt: new Date() } },
    { upsert: true },
  );
  return NextResponse.json({ ok: true });
}
