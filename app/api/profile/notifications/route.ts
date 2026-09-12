import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import type { User } from '@/types';

const schema = z.object({
    whatsappEnabled: z.boolean(),
});

export async function PATCH(req: Request) {
    const user = await getCurrentUser();
    if (!user) {
        return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 });
    }
    const parsed = schema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
        return NextResponse.json({ error: 'Geçersiz istek' }, { status: 400 });
    }
    const database = await db();
    // Kullanıcı yalnızca kendi bildirim tercihini değiştirebilir; başka hiçbir
    // alan (rol, aktiflik, telefon vb.) bu uçtan güncellenemez.
    await database.collection<User>('users').updateOne(
        { _id: user._id },
        { $set: { whatsappEnabled: parsed.data.whatsappEnabled } },
    );
    return NextResponse.json({ ok: true });
}
