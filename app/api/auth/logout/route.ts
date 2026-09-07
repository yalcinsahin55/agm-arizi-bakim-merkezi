import {NextResponse} from 'next/server';

export async function POST(){
  const r=NextResponse.json({ok:true});
  r.cookies.set('agm_arizi_session','',{expires:new Date(0),httpOnly:true,sameSite:'lax',secure:process.env.NODE_ENV==='production',path:'/'});
  return r;
}
