import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser, can } from '@/lib/auth';
import { RECURRENCE_WINDOW_DAYS } from '@/lib/recurrence';

export async function GET(req: Request) {
    const u = await getCurrentUser();
    if (!u || !can(u.role, 'breakdown:create'))
        return NextResponse.json({ error: 'Yetkisiz' }, { status: 403 });

    const params = new URL(req.url).searchParams;
    const motorId = params.get('motorId');
    const categoryId = params.get('categoryId');
    if (!motorId || !categoryId)
        return NextResponse.json({ priorCount: 0 });

    const since = new Date(Date.now() - RECURRENCE_WINDOW_DAYS * 24 * 60 * 60 * 1000);
    const d = await db();
    const priorCount = await d.collection('breakdowns').countDocuments({
        motorId,
        categoryId,
        createdAt: { $gte: since },
    });
    return NextResponse.json({ priorCount });
}
