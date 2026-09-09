import { NextRequest, NextResponse } from 'next/server';

const PUBLIC_PATHS = ['/giris'];

export function middleware(req: NextRequest) {
    const { pathname } = req.nextUrl;
    if (pathname.startsWith('/api') || pathname.startsWith('/_next') || pathname.includes('.')) {
        return NextResponse.next();
    }
    const hasSession = Boolean(req.cookies.get('agm_arizi_session')?.value);
    if (!hasSession && !PUBLIC_PATHS.includes(pathname)) {
        return NextResponse.redirect(new URL('/giris', req.url));
    }
    return NextResponse.next();
}

export const config = {
    matcher: ['/((?!_next/static|_next/image|favicon.ico|sw.js|manifest.webmanifest).*)'],
};
