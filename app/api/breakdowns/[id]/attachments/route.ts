import { NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { put, del } from '@vercel/blob';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { rateLimit, rateLimitResponse } from '@/lib/security';
import { writeAudit } from '@/lib/audit';
const MAX_BYTES = 6 * 1024 * 1024;
const ALLOWED = new Set(['image/jpeg', 'image/png', 'image/webp', 'application/pdf']);
const MAGIC_BYTES: Record<string, (bytes: Uint8Array) => boolean> = {
    'image/jpeg': (bytes) => bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff,
    'image/png': (bytes) => bytes.length >= 8 && bytes.slice(0, 8).every((value, index) => value === [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a][index]),
    'image/webp': (bytes) => new TextDecoder().decode(bytes.slice(0, 4)) === 'RIFF' && new TextDecoder().decode(bytes.slice(8, 12)) === 'WEBP',
    'application/pdf': (bytes) => new TextDecoder().decode(bytes.slice(0, 5)) === '%PDF-',
};
async function hasValidSignature(file: File) {
    const bytes = new Uint8Array(await file.slice(0, 16).arrayBuffer());
    return MAGIC_BYTES[file.type]?.(bytes) === true;
}
function idOf(v: unknown) {
    try {
        return new ObjectId(String(v));
    }
    catch {
        return null;
    }
}
export async function GET(req: Request, { params }: {
    params: Promise<{
        id: string;
    }>;
}) {
    const u = await getCurrentUser();
    if (!u)
        return NextResponse.json({ error: 'Giriş gerekli' }, { status: 401 });
    const rl = await rateLimit(req, 'attachment:list', u, 60);
    if (!rl.ok)
        return rateLimitResponse(rl.retryAfter);
    const { id } = await params;
    const oid = idOf(id);
    if (!oid)
        return NextResponse.json({ error: 'Geçersiz arıza kimliği' }, { status: 400 });
    const d = await db();
    const b = await d.collection('breakdowns').findOne({ _id: oid });
    if (!b)
        return NextResponse.json({ error: 'Arıza bulunamadı' }, { status: 404 });
    if (u.role === 'operator' && String(b.createdBy) !== u._id)
        return NextResponse.json({ error: 'Yetkiniz yok' }, { status: 403 });
    if (u.role === 'teknisyen' && String(b.assignedTechnicianId) !== u._id)
        return NextResponse.json({ error: 'Yetkiniz yok' }, { status: 403 });
    const items = await d.collection('breakdown_attachments').find({ breakdownId: oid }).sort({ createdAt: -1 }).toArray();
    return NextResponse.json({ items: items.map(x => ({ ...x, _id: String(x._id), breakdownId: String(x.breakdownId) })) });
}
export async function POST(req: Request, { params }: {
    params: Promise<{
        id: string;
    }>;
}) {
    const u = await getCurrentUser();
    if (!u)
        return NextResponse.json({ error: 'Giriş gerekli' }, { status: 401 });
    const rl = await rateLimit(req, 'attachment:upload', u, 10);
    if (!rl.ok)
        return rateLimitResponse(rl.retryAfter);
    if (!process.env.BLOB_READ_WRITE_TOKEN)
        return NextResponse.json({ error: 'Dosya depolama yapılandırılmamış. BLOB_READ_WRITE_TOKEN tanımlayın.' }, { status: 503 });
    const { id } = await params;
    const oid = idOf(id);
    if (!oid)
        return NextResponse.json({ error: 'Geçersiz arıza kimliği' }, { status: 400 });
    const d = await db();
    const b = await d.collection('breakdowns').findOne({ _id: oid });
    if (!b)
        return NextResponse.json({ error: 'Arıza bulunamadı' }, { status: 404 });
    if (b.archived)
        return NextResponse.json({ error: 'Arşivlenmiş arızaya dosya eklenemez' }, { status: 409 });
    const allowed = u.role === 'yonetici' || (u.role === 'teknisyen' && String(b.assignedTechnicianId) === u._id) || (u.role === 'operator' && String(b.createdBy) === u._id && b.status === 'acik');
    if (!allowed)
        return NextResponse.json({ error: 'Bu arızaya dosya ekleme yetkiniz yok' }, { status: 403 });
    const form = await req.formData();
    const file = form.get('file');
    if (!(file instanceof File))
        return NextResponse.json({ error: 'Dosya seçilmedi' }, { status: 400 });
    if (file.size <= 0 || file.size > MAX_BYTES)
        return NextResponse.json({ error: 'Dosya 1 byte ile 6 MB arasında olmalı' }, { status: 400 });
    if (!ALLOWED.has(file.type)) {
        return NextResponse.json({ error: 'Sadece JPG, PNG, WEBP ve PDF dosyaları kabul edilir' }, { status: 400 });
    }
    if (!(await hasValidSignature(file))) {
        return NextResponse.json({ error: 'Dosyanın gerçek içeriği seçilen dosya türüyle eşleşmiyor' }, { status: 400 });
    }
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(-120);
        let blob;
    try {
        blob = await put(`breakdowns/${id}/${Date.now()}-${safeName}`, file, { access: 'public', addRandomSuffix: true });
    }
    catch (e) {
        return NextResponse.json({ error: `Depolama hatası: ${e instanceof Error ? e.message : String(e)}` }, { status: 502 });
    }
    const now = new Date();
    const doc = { breakdownId: oid, fileName: file.name, contentType: file.type, size: file.size, url: blob.url, pathname: blob.pathname, uploadedBy: u._id, uploadedByName: u.name, createdAt: now };
    const ins = await d.collection('breakdown_attachments').insertOne(doc);
    await writeAudit(d, { breakdownId: oid, eventId: `attachment:${ins.insertedId}`, type: 'attachment_added', actorId: u._id, actorName: u.name, note: file.name, createdAt: now });
    return NextResponse.json({ ok: true, item: { ...doc, _id: String(ins.insertedId), breakdownId: id } }, { status: 201 });
}
export async function DELETE(req: Request, { params }: {
    params: Promise<{
        id: string;
    }>;
}) {
    const u = await getCurrentUser();
    if (!u)
        return NextResponse.json({ error: 'Giriş gerekli' }, { status: 401 });
    const rl = await rateLimit(req, 'attachment:delete', u, 20);
    if (!rl.ok)
        return rateLimitResponse(rl.retryAfter);
    const { id } = await params;
    const oid = idOf(id);
    if (!oid)
        return NextResponse.json({ error: 'Geçersiz arıza kimliği' }, { status: 400 });
    const d = await db();
    const b = await d.collection('breakdowns').findOne({ _id: oid });
    if (!b)
        return NextResponse.json({ error: 'Arıza bulunamadı' }, { status: 404 });
    if (b.archived)
        return NextResponse.json({ error: 'Arşivlenmiş arızanın dosyası değiştirilemez' }, { status: 409 });
    const body = await req.json().catch(() => ({}));
    const aid = idOf(body.attachmentId);
    if (!aid)
        return NextResponse.json({ error: 'Geçersiz dosya kimliği' }, { status: 400 });
    const a = await d.collection('breakdown_attachments').findOne({ _id: aid, breakdownId: oid });
    if (!a)
        return NextResponse.json({ error: 'Dosya bulunamadı' }, { status: 404 });
    if (u.role !== 'yonetici' && String(a.uploadedBy) !== u._id)
        return NextResponse.json({ error: 'Bu dosyayı silme yetkiniz yok' }, { status: 403 });
    if (a.pathname)
        await del(a.pathname);
    await d.collection('breakdown_attachments').deleteOne({ _id: aid });
    await writeAudit(d, { breakdownId: oid, eventId: `attachment_deleted:${aid}:${Date.now()}`, type: 'attachment_deleted', actorId: u._id, actorName: u.name, note: a.fileName, createdAt: new Date() });
    return NextResponse.json({ ok: true });
}

