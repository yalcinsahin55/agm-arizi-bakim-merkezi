import { NextRequest, NextResponse } from 'next/server';
import { WhatsappOutbox } from '@/lib/whatsapp-outbox';
import connectDB from '@/lib/db'; // ⚠️ aynı not

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const secret = req.headers.get('x-outbox-secret');
  if (!secret || secret !== process.env.OUTBOX_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { id, ok, error } = await req.json();
  await connectDB();

  const doc = await WhatsappOutbox.findById(id);
  if (!doc) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  if (ok) {
    doc.status = 'sent';
  } else {
    doc.attempts += 1;
    doc.lastError = error || 'unknown';
    doc.status = doc.attempts >= 6 ? 'failed' : 'pending';
    doc.nextAttemptAt = new Date(Date.now() + 5 * 60 * 1000); // 5 dk sonra tekrar dene
  }
  await doc.save();
  return NextResponse.json({ success: true });
}
