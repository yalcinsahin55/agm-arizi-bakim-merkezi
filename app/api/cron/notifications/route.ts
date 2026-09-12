import { NextRequest, NextResponse } from 'next/server';
import { retryFailedNotifications, escalateUnresponsiveBreakdowns, checkWeeklyDutyRoster } from '@/lib/notify';

export const dynamic = 'force-dynamic';

function isAuthorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const auth = req.headers.get('authorization');
  return auth === `Bearer ${secret}`;
}

export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
  }

  try {
    const [retriedNotifications, escalatedBreakdowns, dutyReminderSent] = await Promise.all([
      retryFailedNotifications(),
      escalateUnresponsiveBreakdowns(),
      checkWeeklyDutyRoster(),
    ]);

    return NextResponse.json({
      ok: true,
      retriedNotifications,
      escalatedBreakdowns,
      dutyReminderSent,
      executedAt: new Date().toISOString(),
    });
  } catch (error: unknown) {
    console.error('Notification cron failed:', error);
    return NextResponse.json({ error: 'Bildirim bakım görevi başarısız oldu' }, { status: 500 });
  }
}
