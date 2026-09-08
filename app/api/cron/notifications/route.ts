// app/api/cron/notifications/route.ts (Next.js App Router örneği)
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  // 1. Güvenlik Kontrolü
  const authHeader = req.headers.get('authorization');
  const expectedToken = `Bearer ${process.env.CRON_SECRET}`;

  if (authHeader !== expectedToken) {
    return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
  }

  try {
    // 2. BURADA MEVCUT RETRY MANTIĞIN ÇALIŞACAK
    // Örn: await retryFailedNotifications();
    
    return NextResponse.json({ success: true, message: 'Cron başarıyla çalıştı' });
  } catch (error) {
    console.error('Cron hatası:', error);
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 });
  }
}

// Vercel'in kendi cron'unu devre dışı bırakmak için 
// bu dosyada dynamic = 'force-dynamic' bırakabilirsin.
export const dynamic = 'force-dynamic';
