import {NextResponse} from 'next/server';
import {ObjectId} from 'mongodb';
import {db} from '@/lib/db';
import {getCurrentUser,can} from '@/lib/auth';
import {notifyManagers} from '@/lib/notify';
import {z} from 'zod';
import { rateLimit, rateLimitResponse } from '@/lib/security';
import { diffFields, writeAudit } from '@/lib/audit';

const schema=z.object({
  motorId:z.string().min(1), categoryId:z.string().min(1),
  subcategoryId:z.string().optional(), subcategoryName:z.string().optional(),
  priority:z.enum(['kritik','yuksek','orta','dusuk']), title:z.string().min(3).max(160), description:z.string().min(3).max(5000),
  motorHours:z.coerce.number().min(0).optional(), downtimeStartedAt:z.string().datetime().optional(),
});

export async function GET(){
 const u=await getCurrentUser(); if(!u)return NextResponse.json({error:'Giriş gerekli'},{status:401});
 const d=await db(); const q={archived:{$ne:true},...(u.role==='yonetici'||u.role==='goruntuleyici'?{}:u.role==='teknisyen'?{assignedTechnicianId:u._id}:{createdBy:u._id})};
 const rows=await d.collection('breakdowns').find(q).sort({createdAt:-1}).limit(500).toArray(); return NextResponse.json(rows);
}

export async function POST(req:Request){
 const u=await getCurrentUser(); if(!u||!can(u.role,'breakdown:create'))return NextResponse.json({error:'Yetkisiz'},{status:403});
 const rl=await rateLimit(req,'breakdown:create',u,20); if(!rl.ok)return rateLimitResponse(rl.retryAfter);
 let raw:any; try{raw=await req.json()}catch{return NextResponse.json({error:'Geçersiz istek gövdesi'},{status:400})} const parsed=schema.safeParse(raw); if(!parsed.success)return NextResponse.json({error:'Geçersiz veri'},{status:400});
 const d=await db(), id=new ObjectId(), now=new Date();
 let motor:any, category:any, subcategory:any=null;
 try { motor=await d.collection('motors').findOne({_id:parsed.data.motorId,active:true}); category=await d.collection('categories').findOne({_id:new ObjectId(parsed.data.categoryId),active:true}); if(parsed.data.subcategoryId) subcategory=await d.collection('categories').findOne({_id:new ObjectId(parsed.data.subcategoryId),active:true}); } catch { return NextResponse.json({error:'Motor veya kategori kimliği geçersiz'},{status:400}); }
 if(!motor)return NextResponse.json({error:'Motor bulunamadı veya pasif'},{status:400});
 if(!category)return NextResponse.json({error:'Kategori bulunamadı veya pasif'},{status:400});
 if(parsed.data.subcategoryId && (!subcategory || String(subcategory.parentId)!==String(category._id)))return NextResponse.json({error:'Alt kategori üst kategoriyle eşleşmiyor'},{status:400});
 const item={_id:id,code:`ARZ-${now.getFullYear()}-${id.toHexString().slice(-6).toUpperCase()}`,...parsed.data,motorName:motor.name,categoryName:category.name,subcategoryName:subcategory?.name,
   motorHours:parsed.data.motorHours??null,downtimeStartedAt:parsed.data.downtimeStartedAt?new Date(parsed.data.downtimeStartedAt):null,
   status:'acik',escalationLevel:0,createdBy:String(u._id),createdByName:u.name,createdAt:now,updatedAt:now,
   report:'',rootCause:'',correctiveAction:'',parts:[],materials:[]};
 await d.collection('breakdowns').insertOne(item);
 await d.collection('breakdown_events').insertOne({breakdownId:id,eventId:`created:${id}`,type:'created',actorId:u._id,actorName:u.name,createdAt:now});
 await notifyManagers(item,`created:${id}`,'created');
 return NextResponse.json(item,{status:201});
}

export async function PATCH(req:Request){
 const u=await getCurrentUser(); if(!u)return NextResponse.json({error:'Giriş gerekli'},{status:401}); const body=await req.json();
 const rl=await rateLimit(req,'breakdown:edit',u,30); if(!rl.ok)return rateLimitResponse(rl.retryAfter); let id:ObjectId;
 try{id=new ObjectId(String(body.id))}catch{return NextResponse.json({error:'Geçersiz arıza kimliği'},{status:400})}
 const d=await db(),b=await d.collection('breakdowns').findOne({_id:id}); if(!b)return NextResponse.json({error:'Arıza bulunamadı'},{status:404});
 if(u.role!=='yonetici'&&(u.role!=='operator'||String(b.createdBy)!==u._id||b.status!=='acik'))return NextResponse.json({error:'Bu kayıt artık değiştirilemez'},{status:403});
 const p=schema.partial().safeParse(body); if(!p.success)return NextResponse.json({error:'Geçersiz veri'},{status:400});
 const set:Record<string,unknown>={...p.data,updatedAt:new Date()};
 if(p.data.downtimeStartedAt)set.downtimeStartedAt=new Date(p.data.downtimeStartedAt);
 if(p.data.motorId||p.data.categoryId||p.data.subcategoryId!==undefined){
   let motor:any=null,category:any=null,subcategory:any=null;
   try {
     if(p.data.motorId) motor=await d.collection('motors').findOne({_id:String(p.data.motorId),active:true});
     if(p.data.categoryId) category=await d.collection('categories').findOne({_id:new ObjectId(p.data.categoryId),active:true});
     if(p.data.subcategoryId) subcategory=await d.collection('categories').findOne({_id:new ObjectId(p.data.subcategoryId),active:true});
   } catch { return NextResponse.json({error:'Motor veya kategori kimliği geçersiz'},{status:400}); }
   if(p.data.motorId && !motor)return NextResponse.json({error:'Motor bulunamadı veya pasif'},{status:400});
   if(p.data.categoryId && !category)return NextResponse.json({error:'Kategori bulunamadı veya pasif'},{status:400});
   const finalCategoryId=String(p.data.categoryId||b.categoryId);
   if(p.data.subcategoryId!==undefined){
     if(p.data.subcategoryId && (!subcategory||String(subcategory.parentId)!==finalCategoryId))return NextResponse.json({error:'Alt kategori üst kategoriyle eşleşmiyor'},{status:400});
     set.subcategoryName=subcategory?.name;
   }
   if(motor){set.motorName=motor.name;set.motorId=String(motor._id);}
   if(category){set.categoryName=category.name;set.categoryId=String(category._id);}
 }
 const fieldChanges=diffFields(b,set,['motorId','motorName','categoryId','categoryName','subcategoryId','subcategoryName','priority','title','description','motorHours','downtimeStartedAt']);
 await d.collection('breakdowns').updateOne({_id:id},{$set:set});
 await writeAudit(d,{breakdownId:id,eventId:`edited:${id}:${Date.now()}`,type:'edited',actorId:u._id,actorName:u.name,note:u.role==='yonetici'?'Yönetici tarafından düzenlendi':'Arıza bildirimi düzenlendi',fieldChanges});
 return NextResponse.json({ok:true});
}

export async function DELETE(req:Request){
 const u=await getCurrentUser(); if(!u)return NextResponse.json({error:'Giriş gerekli'},{status:401}); const {id}=await req.json(); let oid:ObjectId;
 try{oid=new ObjectId(String(id))}catch{return NextResponse.json({error:'Geçersiz arıza kimliği'},{status:400})}
 const d=await db(),b=await d.collection('breakdowns').findOne({_id:oid}); if(!b)return NextResponse.json({error:'Arıza bulunamadı'},{status:404});
 if(u.role==='yonetici'){
   const rl=await rateLimit(req,'breakdown:archive',u,20); if(!rl.ok)return rateLimitResponse(rl.retryAfter);
   if(b.archived)return NextResponse.json({ok:true,already:true});
   const now=new Date();
   await d.collection('breakdowns').updateOne({_id:oid},{$set:{archived:true,archivedAt:now,archivedBy:u._id,updatedAt:now}});
   const fieldChanges=diffFields(b,{...b,archived:true,archivedAt:now,archivedBy:u._id},['archived']);
   await writeAudit(d,{breakdownId:oid,eventId:`archived:${oid}:${Date.now()}`,type:'archived',actorId:u._id,actorName:u.name,note:'Yönetici tarafından arşivlendi',fieldChanges});
   return NextResponse.json({ok:true,archived:true});
 }
 const rl=await rateLimit(req,'breakdown:cancel',u,20); if(!rl.ok)return rateLimitResponse(rl.retryAfter);
 if(!(u.role==='operator'&&String(b.createdBy)===u._id&&b.status==='acik'))return NextResponse.json({error:'Bu kayıt silinemez'},{status:403});
 const now=new Date(); await d.collection('breakdowns').updateOne({_id:oid},{$set:{status:'iptal',cancelledAt:now,cancelledBy:u._id,updatedAt:now}});
 await writeAudit(d,{breakdownId:oid,eventId:`cancelled:${oid}:${Date.now()}`,type:'cancelled',actorId:u._id,actorName:u.name,fieldChanges:{status:{from:b.status,to:'iptal'}},createdAt:now});
 return NextResponse.json({ok:true});
}
