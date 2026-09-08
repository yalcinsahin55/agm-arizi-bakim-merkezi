import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { db } from '@/lib/db';
import { signSession } from '@/lib/auth';
const WINDOW_MS = 15 * 60 * 1000;
const MAX_FAILURES = 8;
type LoginBody = {
    email?: unknown;
    password?: unknown;
};
function clientKey(req: Request, email: string) {
    const forwarded = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    return `${email}|${forwarded}`;
}
export async function POST(req: Request) {
    let body: LoginBody;
    try {
        body = (await req.json()) as LoginBody;
    }
    catch {
        return NextResponse.json({ error: 'Geçersiz istek' }, { status: 400 });
    }
    const email = String(body.email || '').toLowerCase().trim();
    const password = String(body.password || '');
    if (!email || !password) {
        return NextResponse.json({ error: 'E-posta ve şifre gerekli' }, { status: 400 });
    }
    const database = await db();
    const key = clientKey(req, email);
    const now = new Date();
    const lock = await database.collection('login_attempts').findOne({ _id: key });
    if (lock &&
        new Date(lock.windowStartedAt).getTime() + WINDOW_MS > now.getTime() &&
        lock.failures >= MAX_FAILURES) {
        return NextResponse.json({ error: 'Çok fazla başarısız giriş denemesi. Lütfen 15 dakika sonra tekrar deneyin.' }, { status: 429 });
    }
    const user = await database.collection('users').findOne({ email, active: true });
    const valid = Boolean(user) && (await bcrypt.compare(password, user!.passwordHash));
    if (!valid) {
        const within = lock && new Date(lock.windowStartedAt).getTime() + WINDOW_MS > now.getTime();
        await database.collection('login_attempts').updateOne({ _id: key }, within
            ? {
                $set: { windowStartedAt: lock!.windowStartedAt, updatedAt: now },
                $inc: { failures: 1 },
            }
            : {
                $set: { windowStartedAt: now, updatedAt: now, failures: 1 },
            }, { upsert: true });
        return NextResponse.json({ error: 'E-posta veya şifre hatalı' }, { status: 401 });
    }
    await database.collection('login_attempts').deleteOne({ _id: key });
    const token = await signSession({
        _id: String(user!._id),
        name: user!.name,
        email: user!.email,
        role: user!.role,
    }, req);
    const response = NextResponse.json({ ok: true });
    response.cookies.set('agm_arizi_session', token, {
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        path: '/',
        maxAge: 60 * 60 * 24 * 7,
    });
    return response;
}

