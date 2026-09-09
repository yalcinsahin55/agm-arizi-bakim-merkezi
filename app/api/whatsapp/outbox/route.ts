import { NextRequest, NextResponse } from 'next/server';
import { WhatsappOutbox } from '@/lib/whatsapp-outbox';
import connectDB from '@/lib/db'; // ⚠️ KENDİ db helper'ının adı neyse onu yaz (connectDB, dbConnect, connectMongo...)

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const secret = req.headers.get('x-outbox-secret');
  if (!secret || secret !== process.env.OUTBOX_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  await connectDB();

  const candidates = await WhatsappOutbox.find({
    status: 'pending',
    nextAttemptAt: { $lte: new Date() },
  })
    .sort({ createdAt: 1 })
    .limit(4); // worker turu başına en fazla 4 mesaj (throttle)

  const items: any[] = [];
  for (const c of candidates) {
    const taken = await WhatsappOutbox.findOneAndUpdate(
      { _id: c._id, status: 'pending' },
      { status: 'processing' },
      { new: true }
    );
    if (taken) {
      items.push({ id: String(taken._id), toPhone: taken.toPhone, message: taken.message, event: taken.event });
    }
  }
  return NextResponse.json({ items });
}
