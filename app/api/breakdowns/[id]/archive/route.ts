import { NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { rateLimit, rateLimitResponse } from '@/lib/security';
import { diffFields, writeAudit } from '@/lib/audit';

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const u = await getCurrentUser();
  if (!u || u.role !== 'yonetici') return NextResponse.json({ error: 'Yetkisiz' }, { status: 403 });
  const rl = await rateLimit(req, 'breakdown:archive-toggle', u, 20);
  if (!rl.ok) return rateLimitResponse(rl.retryAfter);
  const { id } = await params;
  let oid: ObjectId;
  try { oid = new ObjectId(id); } catch { return NextResponse.json({ error: 'Geçersiz arıza kimliği' }, { status: 400 }); }
  const d = await db();
  const b = await d.collection('breakdowns').findOne({ _id: oid });
  if (!b) return NextResponse.json({ error: 'Arıza bulunamadı' }, { status: 404 });
  if (!b.archived) return NextResponse.json({ error: 'Arıza zaten aktif' }, { status: 409 });
  const now = new Date();
  const update = { archived: false, archivedAt: null, archivedBy: null, updatedAt: now };
  await d.collection('breakdowns').updateOne({ _id: oid, archived: true }, { $set: update });
  await writeAudit(d, {
    breakdownId: oid,
    eventId: `unarchived:${oid}:${Date.now()}`,
    type: 'unarchived',
    actorId: u._id,
    actorName: u.name,
    note: 'Yönetici tarafından arşivden çıkarıldı',
    fieldChanges: diffFields(b, { ...b, ...update }, ['archived']),
    createdAt: now,
  });
  return NextResponse.json({ ok: true, archived: false });
}
