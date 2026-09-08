import { NextResponse } from 'next/server';
import { retryFailedNotifications, escalateUnresponsiveBreakdowns } from '@/lib/notify';
export async function GET(req: Request) {
    const secret = process.env.CRON_SECRET, auth = req.headers.get('authorization');
    if (!secret || auth !== `Bearer ${secret}`)
        return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 });
    try {
        const [retried, escalated] = await Promise.all([retryFailedNotifications(), escalateUnresponsiveBreakdowns()]);
        return NextResponse.json({ ok: true, retried, escalated });
    }
    catch (e) {
        console.error('notification cron', e);
        return NextResponse.json({ error: 'Bildirim servisi çalıştırılamadı' }, { status: 500 });
    }
}

