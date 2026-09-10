import { NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { rateLimit, rateLimitResponse } from '@/lib/security';
import { diffFields, writeAudit } from '@/lib/audit';
export async function POST(req: Request, { params }: {
    params: Promise<{
        id: string;
    }>;
}) {
    const u = await getCurrentUser();
    if (!u || u.role !== 'yonetici')
        return NextResponse.json({ error: 'Yetkisiz' }, { status: 403 });
    const rl = await rateLimit(req, 'breakdown:archive-toggle', u, 20);
    if (!rl.ok)
        return rateLimitResponse(rl.retryAfter);
    const { id } = await params;
    let oid: ObjectId;
    try {
        oid = new ObjectId(id);
    }
    catch {
        return NextResponse.json({ error: 'Geçersiz arıza kimliği' }, { status: 400 });
    }
    const d = await db();
    const b = await d.collection('breakdowns').findOne({ _id: oid });
    if (!b)
        return NextResponse.json({ error: 'Arıza bulunamadı' }, { status: 404 });
    if (!b.archived)
        return NextResponse.json({ error: 'Arıza zaten aktif' }, { status: 409 });
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


/** Kalıcı silme — sadece arşivlenmiş kayıtlar, sadece yönetici */
export async function DELETE(req: Request, { params }: {
    params: Promise<{ id: string }>;
}) {
    const u = await getCurrentUser();
    if (!u || u.role !== 'yonetici')
        return NextResponse.json({ error: 'Yetkisiz' }, { status: 403 });
    const rl = await rateLimit(req, 'breakdown:purge', u, 15);
    if (!rl.ok)
        return rateLimitResponse(rl.retryAfter);
    const { id } = await params;
    let oid: ObjectId;
    try {
        oid = new ObjectId(id);
    } catch {
        return NextResponse.json({ error: 'Geçersiz arıza kimliği' }, { status: 400 });
    }
    const d = await db();
    const b = await d.collection('breakdowns').findOne({ _id: oid });
    if (!b)
        return NextResponse.json({ error: 'Arıza bulunamadı' }, { status: 404 });
    if (!b.archived)
        return NextResponse.json({ error: 'Önce arşivleyin; aktif kayıt kalıcı silinemez' }, { status: 409 });

    const now = new Date();
    // Audit önce — kayıt silinmeden özet
    await writeAudit(d, {
        breakdownId: oid,
        eventId: `purged:${oid}:${Date.now()}`,
        type: 'purged',
        actorId: u._id,
        actorName: u.name,
        note: `Kalıcı silindi: ${b.code || id}`,
        fieldChanges: {
            code: { from: b.code, to: null },
            status: { from: b.status, to: null },
        },
        createdAt: now,
    });

    // İlişkili ekler ve bildirimler
    await d.collection('attachments').deleteMany({ breakdownId: oid }).catch(() => null);
    await d.collection('attachments').deleteMany({ breakdownId: String(oid) }).catch(() => null);
    await d.collection('notifications').deleteMany({
        $or: [{ breakdownId: oid }, { breakdownId: String(oid) }],
    }).catch(() => null);

    await d.collection('breakdowns').deleteOne({ _id: oid, archived: true });

    return NextResponse.json({ ok: true, purged: true });
}
