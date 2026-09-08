import { NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
export async function GET() {
    const u = await getCurrentUser();
    if (!u)
        return NextResponse.json({ error: 'Giriş gerekli' }, { status: 401 });
    const rows = await (await db()).collection('notifications').find({ recipientId: u._id }).sort({ createdAt: -1 }).limit(100).toArray();
    return NextResponse.json(rows);
}
export async function POST(req: Request) {
    const u = await getCurrentUser();
    if (!u)
        return NextResponse.json({ error: 'Giriş gerekli' }, { status: 401 });
    const { id } = await req.json();
    let oid: ObjectId;
    try {
        oid = new ObjectId(String(id));
    }
    catch {
        return NextResponse.json({ error: 'Geçersiz bildirim' }, { status: 400 });
    }
    const r = await (await db()).collection('notifications').updateOne({ _id: oid, recipientId: u._id }, { $set: { seenAt: new Date(), status: 'seen' } });
    if (!r.matchedCount)
        return NextResponse.json({ error: 'Bildirim bulunamadı' }, { status: 404 });
    return NextResponse.json({ ok: true });
}

