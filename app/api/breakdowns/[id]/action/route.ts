import { NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { createNotification, notifyManagers } from '@/lib/notify';
import { rateLimit, rateLimitResponse } from '@/lib/security';
import { writeAudit } from '@/lib/audit';
import { queueWhatsappMessage, queueWhatsappToManagers } from '@/lib/whatsapp-outbox';
import { canPerformBreakdownAction, type BreakdownAction } from '@/lib/breakdown-workflow';
import type { Breakdown, User } from '@/types';
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://agm-arizi-bakim-merkezi-zsru.vercel.app';
const input = z.object({ action: z.enum(['seen', 'accept', 'start', 'submit', 'approve', 'revision']), report: z.string().trim().max(10000).optional(), rootCause: z.string().trim().max(5000).optional(), correctiveAction: z.string().trim().max(5000).optional(), parts: z.array(z.string().trim().min(1).max(200)).max(100).optional(), materials: z.array(z.string().trim().min(1).max(200)).max(100).optional(), note: z.string().trim().max(2000).optional() });
export async function POST(req: Request, { params }: {
    params: Promise<{
        id: string;
    }>;
}) {
    const u = await getCurrentUser();
    if (!u)
        return NextResponse.json({ error: 'Giriş gerekli' }, { status: 401 });
    const { id } = await params;
    const rl = await rateLimit(req, 'breakdown:action', u, 40);
    if (!rl.ok)
        return rateLimitResponse(rl.retryAfter);
    let bid: ObjectId;
    try {
        bid = new ObjectId(id);
    }
    catch {
        return NextResponse.json({ error: 'Geçersiz arıza kimliği' }, { status: 400 });
    }
    let raw: unknown;
    try {
        raw = await req.json();
    }
    catch {
        return NextResponse.json({ error: 'Geçersiz istek gövdesi' }, { status: 400 });
    }
    const parsed = input.safeParse(raw);
    if (!parsed.success)
        return NextResponse.json({ error: 'Geçersiz işlem verisi' }, { status: 400 });
    const body = parsed.data, d = await db(), now = new Date(), b = await d.collection('breakdowns').findOne({ _id: bid });
    if (!b)
        return NextResponse.json({ error: 'Arıza bulunamadı' }, { status: 404 });
    if (b.archived)
        return NextResponse.json({ error: 'Arşivlenmiş arızada işlem yapılamaz' }, { status: 409 });
    const action = body.action as BreakdownAction;
    const tech = u.role === 'teknisyen' && String(b.assignedTechnicianId) === u._id;
    const manager = u.role === 'yonetici';
    if (!canPerformBreakdownAction(action, u.role, {
        status: b.status,
        assignedTechnicianId: b.assignedTechnicianId ? String(b.assignedTechnicianId) : undefined,
        archived: Boolean(b.archived),
    }, u._id)) {
        return NextResponse.json({ error: 'Bu işlem için yetkiniz yok veya işlem durumu uygun değil' }, { status: 403 });
    }
    if (['seen', 'accept', 'start', 'submit'].includes(body.action) && !tech)
        return NextResponse.json({ error: 'Bu arıza size atanmadı' }, { status: 403 });
    if (['approve', 'revision'].includes(body.action) && !manager)
        return NextResponse.json({ error: 'Yönetici yetkisi gerekli' }, { status: 403 });
    const allowed: Record<string, string[]> = { seen: ['atandi', 'revizyon'], accept: ['atandi', 'revizyon'], start: ['atandi', 'revizyon'], submit: ['devam_ediyor'], approve: ['onay_bekliyor'], revision: ['onay_bekliyor'] };
    if (!allowed[body.action].includes(String(b.status)))
        return NextResponse.json({ error: `Bu işlem '${b.status}' durumunda yapılamaz` }, { status: 409 });
    if (body.action === 'seen' && b.seenAt)
        return NextResponse.json({ ok: true, status: b.status, already: true });
    if (body.action === 'accept' && !b.seenAt)
        return NextResponse.json({ error: 'Önce bildirimi gördüğünüzü onaylamalısınız' }, { status: 409 });
    if (body.action === 'accept' && b.acknowledgedAt)
        return NextResponse.json({ ok: true, status: b.status, already: true });
    if (body.action === 'start' && b.startedAt)
        return NextResponse.json({ ok: true, status: b.status, already: true });
    if (body.action === 'submit' && (!body.report || body.report.length < 10))
        return NextResponse.json({ error: 'Teknik rapor en az 10 karakter olmalı' }, { status: 400 });
    if (body.action === 'revision' && (!body.note || body.note.length < 5))
        return NextResponse.json({ error: 'Revizyon notu en az 5 karakter olmalı' }, { status: 400 });
    const set: Record<string, unknown> = { updatedAt: now };
    let status = b.status;
    if (body.action === 'seen') {
        set.seenAt = now;
        set.escalationLevel = 0;
    }
    if (body.action === 'accept') {
        set.seenAt = b.seenAt || now;
        set.acknowledgedAt = now;
        set.escalationLevel = 0;
    }
    if (body.action === 'start') {
        if (!b.acknowledgedAt)
            return NextResponse.json({ error: 'Önce işi kabul etmelisiniz' }, { status: 409 });
        set.seenAt = b.seenAt || now;
        set.startedAt = now;
        set.escalationLevel = 0;
        status = 'devam_ediyor';
    }
    if (body.action === 'submit') {
        set.report = body.report!.trim();
        set.rootCause = body.rootCause || '';
        set.correctiveAction = body.correctiveAction || '';
        set.parts = body.parts || [];
        set.materials = body.materials || [];
        set.completedAt = now;
        set.submittedAt = now;
        status = 'onay_bekliyor';
    }
    if (body.action === 'approve') {
        set.closedAt = now;
        status = 'onaylandi';
    }
    if (body.action === 'revision') {
        set.revisionNote = body.note || '';
        set.revisionAt = now;
        status = 'revizyon';
        set.seenAt = null;
        set.acknowledgedAt = null;
        set.startedAt = null;
        set.submittedAt = null;
        set.completedAt = null;
        set.closedAt = null;
    }
    const filter: { _id: ObjectId; status: typeof b.status; assignedTechnicianId?: string } = {
        _id: bid,
        status: b.status,
    };
    if (tech)
        filter.assignedTechnicianId = u._id;
    const r = await d.collection('breakdowns').updateOne(filter, { $set: { ...set, status } });
    if (!r.modifiedCount)
        return NextResponse.json({ error: 'Kayıt başka bir işlemle değişti, sayfayı yenileyin' }, { status: 409 });
    if (body.action === 'seen' || body.action === 'accept' || body.action === 'start') {
        await d.collection('notifications').updateMany({ breakdownId: id, recipientId: u._id, status: { $ne: 'seen' } }, { $set: { seenAt: now, status: 'seen' } });
    }
    const ev = `${body.action}:${id}:${now.getTime()}`;
    const fieldChanges: Record<string, {
        from: unknown;
        to: unknown;
    }> = {};
    if (b.status !== status)
        fieldChanges.status = { from: b.status, to: status };
    for (const field of ['seenAt', 'acknowledgedAt', 'startedAt', 'completedAt', 'submittedAt', 'closedAt', 'revisionNote', 'report', 'rootCause', 'correctiveAction', 'parts', 'materials']) {
        if (field in set)
            fieldChanges[field] = { from: b[field] ?? null, to: set[field] ?? null };
    }
    await writeAudit(d, { breakdownId: bid, eventId: ev, type: body.action, actorId: u._id, actorName: u.name, note: body.note || '', fieldChanges, createdAt: now });
    const fresh = { ...b, ...set, status, _id: String(bid) } as unknown as Breakdown;
    if (['seen', 'accept', 'start', 'submit'].includes(body.action))
        await notifyManagers(fresh, ev, body.action);
    if (body.action === 'approve' || body.action === 'revision')
        await createNotification({ recipientId: String(b.assignedTechnicianId), breakdownId: id, eventId: ev, title: body.action === 'approve' ? 'Arıza onaylandı' : 'Arıza revizyona gönderildi', body: body.action === 'approve' ? `${b.code} kapatıldı` : `${b.code} için revizyon istendi`, href: `/arizalar/${id}` });

    // WhatsApp: teknisyen kabul / müdahale / rapor + yönetici onay / revizyon
    const link = `${APP_URL}/arizalar/${id}`;
    const motorLine = `${b.code} | Motor: ${b.motorName} | ${b.categoryName}`;
    if (body.action === 'accept') {
        await queueWhatsappToManagers(
            `✅ İŞ KABUL EDİLDİ ${motorLine}\nTeknisyen: ${u.name}\n🔗 ${link}`,
            'breakdown_accepted',
        );
    }
    if (body.action === 'start') {
        await queueWhatsappToManagers(
            `🛠 MÜDAHALE BAŞLADI ${motorLine}\nTeknisyen: ${u.name}\n🔗 ${link}`,
            'breakdown_started',
        );
    }
    if (body.action === 'submit') {
        const preview = (body.report || '').trim().slice(0, 120);
        await queueWhatsappToManagers(
            `📋 RAPOR GÖNDERİLDİ ${motorLine}\nTeknisyen: ${u.name}\nÖzet: ${preview}${(body.report || '').length > 120 ? '…' : ''}\n🔗 Onay: ${link}`,
            'breakdown_submitted',
        );
    }
    if (body.action === 'approve' && b.assignedTechnicianId) {
        const tech = await d.collection<User>('users').findOne({ _id: String(b.assignedTechnicianId) });
        const phone = String(tech?.phoneNumber || '');
        if (phone && tech?.whatsappEnabled !== false) {
            await queueWhatsappMessage(
                phone,
                `✅ ONAYLANDI ${motorLine}\nArıza kapatıldı. Teşekkürler.\n🔗 ${link}`,
                'breakdown_approved',
            );
        }
    }
    if (body.action === 'revision' && b.assignedTechnicianId) {
        const tech = await d.collection<User>('users').findOne({ _id: String(b.assignedTechnicianId) });
        const phone = String(tech?.phoneNumber || '');
        if (phone && tech?.whatsappEnabled !== false) {
            await queueWhatsappMessage(
                phone,
                `⚠ REVİZYON ${motorLine}\nNot: ${(body.note || '').trim()}\n🔗 ${link}`,
                'breakdown_revision',
            );
        }
    }

    return NextResponse.json({ ok: true, status });
}

