import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { createNotification } from '@/lib/notify';
import { rateLimit, rateLimitResponse } from '@/lib/security';
import { normalizePhone } from '@/lib/phone';
import type { User } from '@/types';
const roles = ['yonetici', 'teknisyen', 'operator', 'goruntuleyici'] as const;
const schema = z.object({
    name: z.string().min(2).max(100),
    phone: z.string().min(10).max(20),
    password: z.string().min(8).max(128),
    role: z.enum(roles),
});
type UserPatchBody = {
    id?: unknown;
    name?: unknown;
    role?: unknown;
    active?: unknown;
    password?: unknown;
    phone?: unknown;
};
export async function GET() {
    const user = await getCurrentUser();
    if (!user || user.role !== 'yonetici') {
        return NextResponse.json({ error: 'Yetkisiz' }, { status: 403 });
    }
    const rows = await (await db())
        .collection<User>('users')
        .find({}, { projection: { passwordHash: 0 } })
        .sort({ name: 1 })
        .toArray();
    return NextResponse.json(rows);
}
export async function POST(req: Request) {
    const user = await getCurrentUser();
    if (!user || user.role !== 'yonetici') {
        return NextResponse.json({ error: 'Yetkisiz' }, { status: 403 });
    }
    const limit = await rateLimit(req, 'user:write', user, 20);
    if (!limit.ok)
        return rateLimitResponse(limit.retryAfter);
    const parsed = schema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
        return NextResponse.json({ error: 'Geçersiz kullanıcı bilgileri' }, { status: 400 });
    }
    const value = parsed.data;
    const phone = normalizePhone(value.phone);
    if (!phone) {
        return NextResponse.json({ error: 'Geçersiz telefon numarası (örn: 0535 027 88 55)' }, { status: 400 });
    }
    const database = await db();
    if (await database.collection<User>('users').findOne({ phoneNumber: phone })) {
        return NextResponse.json({ error: 'Bu telefon numarası zaten kayıtlı' }, { status: 409 });
    }
    const item = {
        _id: randomUUID(),
        name: value.name.trim(),
        email: `${phone}@tel.agm`,
        phoneNumber: phone,
        whatsappEnabled: true,
        role: value.role,
        passwordHash: await bcrypt.hash(value.password, 12),
        active: true,
        createdAt: new Date(),
    };
    await database.collection<User>('users').insertOne(item);
    return NextResponse.json({
        ok: true,
        user: {
            _id: item._id,
            name: item.name,
            phoneNumber: item.phoneNumber,
            role: item.role,
            active: true,
        },
    }, { status: 201 });
}
export async function PATCH(req: Request) {
    const user = await getCurrentUser();
    if (!user || user.role !== 'yonetici') {
        return NextResponse.json({ error: 'Yetkisiz' }, { status: 403 });
    }
    const limit = await rateLimit(req, 'user:write', user, 20);
    if (!limit.ok)
        return rateLimitResponse(limit.retryAfter);
    const body = (await req.json().catch(() => ({}))) as UserPatchBody;
    const targetId = String(body.id || '');
    if (!targetId)
        return NextResponse.json({ error: 'Kullanıcı gerekli' }, { status: 400 });
    if (targetId === user._id && body.role && body.role !== 'yonetici') {
        return NextResponse.json({ error: 'Kendi yönetici rolünüzü değiştiremezsiniz' }, { status: 400 });
    }
    if (targetId === user._id && body.active === false) {
        return NextResponse.json({ error: 'Kendi hesabınızı pasifleştiremezsiniz' }, { status: 400 });
    }
    const database = await db();
    const target = await database.collection<User>('users').findOne({ _id: targetId });
    if (!target)
        return NextResponse.json({ error: 'Kullanıcı bulunamadı' }, { status: 404 });
    const set: Record<string, unknown> = { updatedAt: new Date() };
    if (typeof body.name === 'string' && body.name.trim())
        set.name = body.name.trim();
    if (typeof body.role === 'string' && roles.includes(body.role as (typeof roles)[number])) {
        set.role = body.role;
    }
    if (typeof body.active === 'boolean')
        set.active = body.active;
    if (typeof body.password === 'string' && body.password.length >= 8) {
        set.passwordHash = await bcrypt.hash(body.password, 12);
    }
    if (typeof body.phone === 'string' && body.phone.trim()) {
        const np = normalizePhone(body.phone);
        if (!np)
            return NextResponse.json({ error: 'Geçersiz telefon numarası (örn: 0535 027 88 55)' }, { status: 400 });
        const dup = await database.collection<User>('users').findOne({ phoneNumber: np, _id: { $ne: targetId } });
        if (dup)
            return NextResponse.json({ error: 'Bu telefon numarası başka bir kullanıcıda kayıtlı' }, { status: 409 });
        set.phoneNumber = np;
        set.email = `${np}@tel.agm`;
    }
    const removingTechnician = target.role === 'teknisyen' &&
        (set.active === false || (typeof set.role === 'string' && set.role !== 'teknisyen'));
    if (removingTechnician) {
        const openBreakdowns = await database
            .collection('breakdowns')
            .find({
            assignedTechnicianId: targetId,
            archived: { $ne: true },
            status: { $in: ['atandi', 'devam_ediyor', 'revizyon', 'onay_bekliyor'] },
        })
            .toArray();
        const replacement = await database
            .collection<User>('users')
            .findOne({ role: 'teknisyen', active: true, _id: { $ne: targetId } });
        if (openBreakdowns.length && !replacement) {
            return NextResponse.json({
                error: `Teknisyenin ${openBreakdowns.length} açık arızası var. Devralacak aktif teknisyen bulunamadı.`,
            }, { status: 409 });
        }
        if (replacement) {
            for (const breakdown of openBreakdowns) {
                await database.collection('breakdowns').updateOne({ _id: breakdown._id }, {
                    $set: {
                        assignedTechnicianId: String(replacement._id),
                        assignedTechnicianName: String(replacement.name),
                        status: 'atandi',
                        assignedAt: new Date(),
                        seenAt: null,
                        acknowledgedAt: null,
                        startedAt: null,
                        escalationLevel: 0,
                        updatedAt: new Date(),
                    },
                });
                await createNotification({
                    recipientId: String(replacement._id),
                    breakdownId: String(breakdown._id),
                    eventId: `technician-handover:${breakdown._id}:${Date.now()}`,
                    title: 'Teknisyen devri: yeni arıza görevi',
                    body: `${breakdown.code} • ${breakdown.motorName} • ${breakdown.categoryName}`,
                    href: `/arizalar/${breakdown._id}`,
                });
            }
        }
    }
    if ((set.active === false || (set.role && set.role !== 'yonetici')) &&
        target.role === 'yonetici' &&
        target.active) {
        const others = await database.collection<User>('users').countDocuments({
            _id: { $ne: targetId },
            role: 'yonetici',
            active: true,
        });
        if (others === 0) {
            return NextResponse.json({ error: 'Sistemde en az bir aktif yönetici kalmalıdır' }, { status: 400 });
        }
    }
    const result = await database.collection<User>('users').updateOne({ _id: targetId }, { $set: set });
    if (!result.matchedCount)
        return NextResponse.json({ error: 'Kullanıcı bulunamadı' }, { status: 404 });
    return NextResponse.json({ ok: true });
}
export async function DELETE(req: Request) {
    const user = await getCurrentUser();
    if (!user || user.role !== 'yonetici') {
        return NextResponse.json({ error: 'Yetkisiz' }, { status: 403 });
    }
    const limit = await rateLimit(req, 'user:write', user, 20);
    if (!limit.ok)
        return rateLimitResponse(limit.retryAfter);
    const body = (await req.json().catch(() => ({}))) as { id?: unknown };
    const targetId = String(body.id || '');
    if (!targetId)
        return NextResponse.json({ error: 'Kullanıcı gerekli' }, { status: 400 });
    if (targetId === user._id) {
        return NextResponse.json({ error: 'Kendi hesabınızı silemezsiniz' }, { status: 400 });
    }
    const database = await db();
    const target = await database.collection<User>('users').findOne({ _id: targetId });
    if (!target)
        return NextResponse.json({ error: 'Kullanıcı bulunamadı' }, { status: 404 });
    if (target.role === 'yonetici' && target.active) {
        const others = await database.collection<User>('users').countDocuments({
            _id: { $ne: targetId },
            role: 'yonetici',
            active: true,
        });
        if (others === 0) {
            return NextResponse.json({ error: 'Sistemde en az bir aktif yönetici kalmalıdır' }, { status: 400 });
        }
    }
    if (target.role === 'teknisyen') {
        const openBreakdowns = await database
            .collection('breakdowns')
            .find({
            assignedTechnicianId: targetId,
            archived: { $ne: true },
            status: { $in: ['atandi', 'devam_ediyor', 'revizyon', 'onay_bekliyor'] },
        })
            .toArray();
        if (openBreakdowns.length) {
            const replacement = await database
                .collection<User>('users')
                .findOne({ role: 'teknisyen', active: true, _id: { $ne: targetId } });
            if (!replacement) {
                return NextResponse.json({
                    error: `Teknisyenin ${openBreakdowns.length} açık arızası var. Devralacak aktif teknisyen bulunamadı.`,
                }, { status: 409 });
            }
            for (const breakdown of openBreakdowns) {
                await database.collection('breakdowns').updateOne({ _id: breakdown._id }, {
                    $set: {
                        assignedTechnicianId: String(replacement._id),
                        assignedTechnicianName: String(replacement.name),
                        status: 'atandi',
                        assignedAt: new Date(),
                        seenAt: null,
                        acknowledgedAt: null,
                        startedAt: null,
                        escalationLevel: 0,
                        updatedAt: new Date(),
                    },
                });
                await createNotification({
                    recipientId: String(replacement._id),
                    breakdownId: String(breakdown._id),
                    eventId: `technician-handover:${breakdown._id}:${Date.now()}`,
                    title: 'Teknisyen devri: yeni arıza görevi',
                    body: `${breakdown.code} • ${breakdown.motorName} • ${breakdown.categoryName}`,
                    href: `/arizalar/${breakdown._id}`,
                });
            }
        }
    }
    await database.collection('sessions').deleteMany({ userId: targetId });
    await database.collection('push_subscriptions').deleteMany({ userId: targetId });
    await database.collection('notifications').deleteMany({ recipientId: targetId });
    await database.collection<User>('users').deleteOne({ _id: targetId });
    return NextResponse.json({ ok: true });
}
