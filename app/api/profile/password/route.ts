import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { rateLimit, rateLimitResponse } from '@/lib/security';
import type { User } from '@/types';

const schema = z.object({
    currentPassword: z.string().min(1, 'Mevcut şifre gerekli'),
    newPassword: z.string().min(8, 'Yeni şifre en az 8 karakter olmalı').max(128),
});

export async function PATCH(req: Request) {
    const user = await getCurrentUser();
    if (!user) {
        return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 });
    }

    const limit = await rateLimit(req, 'profile:password', user, 10);
    if (!limit.ok) return rateLimitResponse(limit.retryAfter);

    const parsed = schema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
        return NextResponse.json(
            { error: parsed.error.issues[0]?.message || 'Geçersiz istek' },
            { status: 400 },
        );
    }
    const { currentPassword, newPassword } = parsed.data;

    const database = await db();
    // Oturumdaki kullanıcı bilgisi güncel olmayabilir; şifre hash'ini taze çekiyoruz.
    const fresh = await database.collection<User>('users').findOne({ _id: user._id });
    if (!fresh) {
        return NextResponse.json({ error: 'Kullanıcı bulunamadı' }, { status: 404 });
    }

    const ok = fresh.passwordHash ? await bcrypt.compare(currentPassword, fresh.passwordHash) : false;
    if (!ok) {
        return NextResponse.json({ error: 'Mevcut şifre yanlış' }, { status: 400 });
    }
    if (currentPassword === newPassword) {
        return NextResponse.json({ error: 'Yeni şifre, mevcut şifreyle aynı olamaz' }, { status: 400 });
    }

    await database.collection<User>('users').updateOne(
        { _id: user._id },
        { $set: { passwordHash: await bcrypt.hash(newPassword, 12), updatedAt: new Date() } },
    );

    return NextResponse.json({ ok: true });
}
