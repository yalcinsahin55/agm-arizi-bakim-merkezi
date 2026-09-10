import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { rateLimit, rateLimitResponse } from '@/lib/security';
import { getCurrentUser } from '@/lib/auth';

interface PushSubscriptionDocument {
  subscription?: { endpoint?: string };
  updatedAt?: Date;
}

export async function GET() {
  const u = await getCurrentUser();
  if (!u) return NextResponse.json({ error: 'Giriş gerekli' }, { status: 401 });

  const d = await db();
  const subs = await d
    .collection('push_subscriptions')
    .find({ userId: u._id })
    .project({ 'subscription.endpoint': 1, updatedAt: 1 })
    .toArray();

  return NextResponse.json({
    configured: Boolean(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY),
    publicKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || process.env.VAPID_PUBLIC_KEY || null,
    count: subs.length,
    endpoints: subs.map((s: PushSubscriptionDocument) => {
      const ep = String(s.subscription?.endpoint || '');
      return ep.length > 48 ? `${ep.slice(0, 40)}…` : ep;
    }),
  });
}

export async function POST(req: Request) {
  const u = await getCurrentUser();
  if (!u) return NextResponse.json({ error: 'Giriş gerekli' }, { status: 401 });
  const rl = await rateLimit(req, 'push:subscribe', u, 20);
  if (!rl.ok) return rateLimitResponse(rl.retryAfter);

  const subscription = await req.json().catch(() => null);
  if (
    !subscription ||
    typeof subscription !== 'object' ||
    typeof (subscription as { endpoint?: unknown }).endpoint !== 'string'
  ) {
    return NextResponse.json({ error: 'Geçersiz push aboneliği' }, { status: 400 });
  }

  const endpoint = (subscription as { endpoint: string }).endpoint;
  await (
    await db()
  )
    .collection('push_subscriptions')
    .updateOne(
      { userId: u._id, 'subscription.endpoint': endpoint },
      {
        $set: {
          userId: u._id,
          userName: u.name,
          subscription,
          userAgent: req.headers.get('user-agent') || undefined,
          updatedAt: new Date(),
        },
        $setOnInsert: { createdAt: new Date() },
      },
      { upsert: true },
    );

  return NextResponse.json({ ok: true, endpoint });
}

export async function DELETE(req: Request) {
  const u = await getCurrentUser();
  if (!u) return NextResponse.json({ error: 'Giriş gerekli' }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const endpoint = typeof body?.endpoint === 'string' ? body.endpoint : null;
  const d = await db();

  if (endpoint) {
    await d.collection('push_subscriptions').deleteOne({
      userId: u._id,
      'subscription.endpoint': endpoint,
    });
  } else {
    await d.collection('push_subscriptions').deleteMany({ userId: u._id });
  }

  return NextResponse.json({ ok: true });
}
