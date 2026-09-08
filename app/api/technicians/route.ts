import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
export async function GET() {
    const u = await getCurrentUser();
    if (!u || !['yonetici', 'goruntuleyici'].includes(u.role))
        return NextResponse.json({ error: 'Yetkisiz' }, { status: 403 });
    const rows = await (await db()).collection('users').find({ role: 'teknisyen', active: true }, { projection: { passwordHash: 0 } }).sort({ name: 1 }).toArray();
    return NextResponse.json(rows);
}

