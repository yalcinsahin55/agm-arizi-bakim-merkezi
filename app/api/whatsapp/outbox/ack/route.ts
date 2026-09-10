import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { db } from '@/lib/db';
import type { WhatsappOutboxDoc } from '@/lib/whatsapp-outbox';

export const dynamic = 'force-dynamic';

/** Worker, gönderim sonucunu buraya raporlar. */
export async function POST(req: NextRequest) {
  const secret = req.headers.get('x-outbox-secret');
  if (!secret || secret !== process.env.OUTBOX_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = (await req.json().catch(() => null)) as
    | { id?: string; ok?: boolean; error?: string }
    | null;
  if (!body || !body.id) {
    return NextResponse.json({ error: 'id gerekli' }, { status: 400 });
  }

  let oid: ObjectId;
  try {
    oid = new ObjectId(body.id);
  } catch {
    return NextResponse.json({ error: 'Geçersiz id' }, { status: 400 });
  }

  const d = await db();
  const doc = await d.collection<WhatsappOutboxDoc>('whatsapp_outbox').findOne({ _id: oid });
  if (!doc) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  if (body.ok) {
    await d
      .collection<WhatsappOutboxDoc>('whatsapp_outbox')
      .updateOne({ _id: oid }, { $set: { status: 'sent', updatedAt: new Date() } });
  } else {
    const attempts = (doc.attempts || 0) + 1;
    await d
      .collection<WhatsappOutboxDoc>('whatsapp_outbox')
      .updateOne(
        { _id: oid },
        {
          $set: {
            attempts,
            lastError: body.error || 'unknown',
            status: attempts >= 6 ? 'failed' : 'pending',
            nextAttemptAt: new Date(Date.now() + 5 * 60 * 1000), // 5 dk sonra yeniden dene
            updatedAt: new Date(),
          },
        }
      );
  }
  return NextResponse.json({ success: true });
}
