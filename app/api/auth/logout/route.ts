import { NextResponse } from 'next/server';
import { revokeCurrentSession } from '@/lib/auth';
export async function POST() {
    await revokeCurrentSession();
    const response = NextResponse.json({ ok: true });
    response.cookies.set('agm_arizi_session', '', {
        expires: new Date(0),
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        path: '/',
    });
    return response;
}

