import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
export async function GET() {
    try {
        await db().then(d => d.command({ ping: 1 }));
        return NextResponse.json({ ok: true, database: true, pushConfigured: !!process.env.VAPID_PUBLIC_KEY });
    }
    catch {
        return NextResponse.json({ ok: false }, { status: 503 });
    }
}

