import {cookies} from 'next/headers';import {SignJWT,jwtVerify} from 'jose';import {db} from './db';import type {User,Role} from '@/types';
const configuredSecret=process.env.JWT_SECRET;
if(process.env.NODE_ENV==='production' && (!configuredSecret || configuredSecret.length<32)) throw new Error('Production ortamında en az 32 karakterlik JWT_SECRET zorunludur');
const secret=new TextEncoder().encode(configuredSecret||'dev-only-change-me');
export async function signSession(user:Pick<User,'_id'|'name'|'email'|'role'>){return new SignJWT(user).setProtectedHeader({alg:'HS256'}).setIssuedAt().setExpirationTime('7d').sign(secret)}
export async function getCurrentUser():Promise<User|null>{const token=(await cookies()).get('agm_arizi_session')?.value;if(!token)return null;try{const {payload}=await jwtVerify(token,secret);const u=await db().then(d=>d.collection<User>('users').findOne({_id:String(payload._id)}));return u&&u.active?u:null}catch{return null}}
export function can(role:Role,action:string){const p:Record<Role,string[]>= {yonetici:['*'],teknisyen:['breakdown:view-assigned','breakdown:accept','breakdown:start','breakdown:report'],operator:['breakdown:create','breakdown:edit-own','breakdown:delete-own','breakdown:view-own'],goruntuleyici:['breakdown:view-all','report:view']};return p[role].includes('*')||p[role].includes(action)}
