import {NextResponse} from 'next/server';
import {ObjectId} from 'mongodb';
import {db} from '@/lib/db';
import {getCurrentUser} from '@/lib/auth';
import {createNotification} from '@/lib/notify';

export async function POST(req:Request,{params}:{params:Promise<{id:string}>}){
 const u=await getCurrentUser();
 if(!u||u.role!=='yonetici')return NextResponse.json({error:'Yetkisiz'},{status:403});
 const {id}=await params;
 let bid:ObjectId; try{bid=new ObjectId(id)}catch{return NextResponse.json({error:'Geçersiz arıza kimliği'},{status:400})}
 let body:any; try{body=await req.json()}catch{return NextResponse.json({error:'Geçersiz istek'},{status:400})}
 const technicianId=String(body?.technicianId||''); if(!technicianId)return NextResponse.json({error:'Teknisyen gerekli'},{status:400});
 const d=await db(),now=new Date(),b=await d.collection('breakdowns').findOne({_id:bid});
 if(!b)return NextResponse.json({error:'Arıza bulunamadı'},{status:404});
 if(!['acik','atandi','revizyon'].includes(String(b.status)))return NextResponse.json({error:`${b.status} durumundaki arıza yeniden atanamaz`},{status:409});
 const tech=await d.collection('users').findOne({_id:technicianId,role:'teknisyen',active:true});
 if(!tech)return NextResponse.json({error:'Aktif teknisyen bulunamadı'},{status:400});
 const oldTech=String(b.assignedTechnicianId||'');
 const updated=await d.collection('breakdowns').updateOne({_id:bid,status:b.status},{$set:{assignedTechnicianId:technicianId,assignedTechnicianName:String(tech.name),status:'atandi',assignedAt:now,seenAt:null,acknowledgedAt:null,startedAt:null,submittedAt:null,completedAt:null,closedAt:null,escalationLevel:0,updatedAt:now},$unset:{revisionNote:''}});
 if(!updated.modifiedCount)return NextResponse.json({error:'Kayıt başka bir işlemle değişti, sayfayı yenileyin'},{status:409});
 const ev=`assigned:${id}:${Date.now()}`;
 await d.collection('breakdown_events').insertOne({breakdownId:bid,eventId:ev,type:'assigned',actorId:u._id,actorName:u.name,technicianId,technicianName:String(tech.name),previousTechnicianId:oldTech||null,createdAt:now});
 await createNotification({recipientId:technicianId,breakdownId:id,eventId:ev,title:'Yeni arıza atandı',body:`${b.code} • ${b.motorName} • ${b.categoryName}`,href:`/arizalar/${id}`});
 if(oldTech && oldTech!==technicianId){
   await createNotification({recipientId:oldTech,breakdownId:id,eventId:`${ev}:old`,title:'Arıza başka teknisyene aktarıldı',body:`${b.code} artık ${tech.name} teknisyenine atandı.`,href:`/arizalar/${id}`});
 }
 return NextResponse.json({ok:true});
}
