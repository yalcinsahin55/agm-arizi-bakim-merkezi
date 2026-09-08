import {NextResponse} from 'next/server';
import type {NextRequest} from 'next/server';
import {jwtVerify} from 'jose';

type Role='yonetici'|'teknisyen'|'operator'|'goruntuleyici';
const cookieName='agm_arizi_session';
const configuredSecret=process.env.JWT_SECRET;
const secret=new TextEncoder().encode(configuredSecret||'dev-only-change-me');

function roleAllowed(pathname:string,role:Role){
  if(role==='yonetici') return true;
  if(pathname.startsWith('/yonetim/')) return false;
  if(role==='goruntuleyici') return pathname==='/'||pathname.startsWith('/arizalar')||pathname.startsWith('/raporlar')||pathname.startsWith('/motorlar');
  if(role==='teknisyen') return pathname==='/'||pathname.startsWith('/teknisyen')||pathname.startsWith('/arizalar')||pathname.startsWith('/bildirimler');
  if(role==='operator') return pathname==='/'||pathname.startsWith('/arizalar')||pathname.startsWith('/bildirimler');
  return false;
}

export async function proxy(request:NextRequest){
  const pathname=request.nextUrl.pathname;
  if(pathname==='/giris') return NextResponse.next();
  const token=request.cookies.get(cookieName)?.value;
  if(!token) return NextResponse.redirect(new URL('/giris',request.url));
  try{
    const {payload}=await jwtVerify(token,secret);
    const role=payload.role as Role;
    if(!['yonetici','teknisyen','operator','goruntuleyici'].includes(role)) throw new Error('invalid-role');
    if(!roleAllowed(pathname,role)) return NextResponse.redirect(new URL('/',request.url));
    return NextResponse.next();
  }catch{
    const response=NextResponse.redirect(new URL('/giris',request.url));
    response.cookies.delete(cookieName);
    return response;
  }
}

export const config={
  matcher:['/((?!api|_next/static|_next/image|favicon.ico|manifest.webmanifest|robots.txt|sw.js).*)'],
};
