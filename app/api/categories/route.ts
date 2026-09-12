import { NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { db } from '@/lib/db';
import { rateLimit, rateLimitResponse } from '@/lib/security';
import { getCurrentUser } from '@/lib/auth';

const NIGHT_ROUTE_TYPES = ['elektromekanik', 'normal'];
function parseNightRouteType(value: unknown): 'elektromekanik' | 'normal' | undefined {
    return NIGHT_ROUTE_TYPES.includes(String(value)) ? (value as 'elektromekanik' | 'normal') : undefined;
}

export async function GET() {
    const u = await getCurrentUser();
    if (!u)
        return NextResponse.json({ error: 'Giriş gerekli' }, { status: 401 });
    const d = await db();
    return NextResponse.json(await d.collection('categories').find({ active: true }).sort({ parentId: 1, name: 1 }).toArray());
}
export async function POST(req: Request) {
    const u = await getCurrentUser();
    if (!u || u.role !== 'yonetici')
        return NextResponse.json({ error: 'Yetkisiz' }, { status: 403 });
    const rl = await rateLimit(req, 'category:write', u, 30);
    if (!rl.ok)
        return rateLimitResponse(rl.retryAfter);
    const body = await req.json();
    const name = String(body.name || '').trim();
    const parentId = body.parentId ? String(body.parentId) : null;
    if (name.length < 2)
        return NextResponse.json({ error: 'Kategori adı gerekli' }, { status: 400 });
    const d = await db();
    if (parentId) {
        let p;
        try {
            p = await d.collection('categories').findOne({ _id: new ObjectId(parentId), active: true });
        }
        catch {
            return NextResponse.json({ error: 'Üst kategori geçersiz' }, { status: 400 });
        }
        if (!p)
            return NextResponse.json({ error: 'Üst kategori bulunamadı' }, { status: 400 });
    }
    // Gece nöbet yönlendirmesi yalnızca ana (kök) kategorilerde anlamlıdır;
    // alt kategoriler üst kategorisinden miras alır.
    const nightRouteType = !parentId ? (parseNightRouteType(body.nightRouteType) || 'normal') : undefined;
    const r = await d.collection('categories').insertOne({ name, active: true, parentId, ...(nightRouteType ? { nightRouteType } : {}), createdAt: new Date() });
    return NextResponse.json({ _id: r.insertedId }, { status: 201 });
}
export async function PUT(req: Request) {
    const u = await getCurrentUser();
    if (!u || u.role !== 'yonetici')
        return NextResponse.json({ error: 'Yetkisiz' }, { status: 403 });
    const body = await req.json();
    if (!body.id)
        return NextResponse.json({ error: 'Geçersiz kategori' }, { status: 400 });
    const set: Record<string, unknown> = { updatedAt: new Date() };
    if (body.name !== undefined) {
        if (!String(body.name).trim())
            return NextResponse.json({ error: 'Geçersiz kategori' }, { status: 400 });
        set.name = String(body.name).trim();
    }
    const nightRouteType = parseNightRouteType(body.nightRouteType);
    if (nightRouteType)
        set.nightRouteType = nightRouteType;
    try {
        const d = await db();
        const r = await d.collection('categories').updateOne({ _id: new ObjectId(body.id) }, { $set: set });
        if (!r.matchedCount)
            return NextResponse.json({ error: 'Kategori bulunamadı' }, { status: 404 });
        return NextResponse.json({ ok: true });
    }
    catch {
        return NextResponse.json({ error: 'Kategori bulunamadı' }, { status: 404 });
    }
}
export async function DELETE(req: Request) {
    const u = await getCurrentUser();
    if (!u || u.role !== 'yonetici')
        return NextResponse.json({ error: 'Yetkisiz' }, { status: 403 });
    const body = await req.json();
    try {
        const d = await db();
        const id = new ObjectId(body.id);
        const children = await d.collection('categories').countDocuments({ parentId: String(id), active: true });
        if (children)
            return NextResponse.json({ error: 'Önce alt kategorileri pasifleştirin' }, { status: 400 });
        await d.collection('categories').updateOne({ _id: id }, { $set: { active: false, deletedAt: new Date() } });
        return NextResponse.json({ ok: true });
    }
    catch {
        return NextResponse.json({ error: 'Kategori bulunamadı' }, { status: 404 });
    }
}

