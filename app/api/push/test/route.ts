import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { createNotification } from '@/lib/notify';
import { rateLimit, rateLimitResponse } from '@/lib/security';

export async function POST(req: Request) {
  const u = await getCurrentUser();
  if (!u) return NextResponse.json({ error: 'Giriş gerekli' }, { status: 401 });
  const rl = await rateLimit(req, 'push:test', u, 5);
  if (!rl.ok) return rateLimitResponse(rl.retryAfter);

  const eventId = `push-test:${u._id}:${Date.now()}`;
  await createNotification({
    recipientId: u._id,
    breakdownId: 'test',
    eventId,
    title: 'AGM test bildirimi',
    body: 'Push bildirimleri çalışıyor. Bu bir test mesajıdır.',
    href: '/bildirimler',
  });

  return NextResponse.json({ ok: true });
}
