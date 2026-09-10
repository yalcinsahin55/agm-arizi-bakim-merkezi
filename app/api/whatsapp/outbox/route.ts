import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import type { WhatsappOutboxDoc } from '@/lib/whatsapp-outbox';

export const dynamic = 'force-dynamic';

/** Worker (VM) bu endpoint'ten bekleyen mesajları çeker. */
export async function GET(req: NextRequest) {
  const secret = req.headers.get('x-outbox-secret');
  if (!secret || secret !== process.env.OUTBOX_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const d = await db();
  const now = new Date();
  const candidates = await d
    .collection<WhatsappOutboxDoc>('whatsapp_outbox')
    .find({ status: 'pending', nextAttemptAt: { $lte: now } })
    .sort({ createdAt: 1 })
    .limit(4) // worker turu başına en fazla 4 mesaj (throttle)
    .toArray();

  const items: { id: string; toPhone: string; message: string; event: string }[] = [];
  for (const c of candidates) {
    const taken = await d
      .collection<WhatsappOutboxDoc>('whatsapp_outbox')
      .findOneAndUpdate(
        { _id: c._id, status: 'pending' },
        { $set: { status: 'processing', updatedAt: new Date() } },
        { returnDocument: 'after' }
      );
    if (taken) {
      items.push({
        id: String(taken._id),
        toPhone: taken.toPhone,
        message: taken.message,
        event: taken.event,
      });
    }
  }
  return NextResponse.json({ items });
}
