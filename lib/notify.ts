import webpush from 'web-push';
import {db} from './db';

export type NotificationInput={recipientId:string;breakdownId:string;eventId:string;title:string;body:string;href:string};
function pushConfigured(){return !!(process.env.VAPID_PUBLIC_KEY&&process.env.VAPID_PRIVATE_KEY&&process.env.VAPID_SUBJECT)}

async function sendPush(n:any){
  const d=await db();
  if(!pushConfigured()){await d.collection('notifications').updateOne({_id:n._id},{$set:{pushStatus:'not_configured',lastPushAt:new Date()},$inc:{attempts:1}});return;}
  webpush.setVapidDetails(process.env.VAPID_SUBJECT!,process.env.VAPID_PUBLIC_KEY!,process.env.VAPID_PRIVATE_KEY!);
  const subs=await d.collection('push_subscriptions').find({userId:n.recipientId}).toArray();
  if(!subs.length){await d.collection('notifications').updateOne({_id:n._id},{$set:{pushStatus:'no_subscription',lastPushAt:new Date()},$inc:{attempts:1}});return;}
  let accepted=0,failed=0,lastError='';
  for(const s of subs){try{await webpush.sendNotification(s.subscription,JSON.stringify({title:n.title,body:n.body,data:{href:n.href,notificationId:String(n._id)}}));accepted++;}catch(e:any){failed++;lastError=e?.message||'Push gönderilemedi';if(e?.statusCode===404||e?.statusCode===410)await d.collection('push_subscriptions').deleteOne({_id:s._id});}}
  await d.collection('notifications').updateOne({_id:n._id},{$set:{pushStatus:accepted===subs.length?'accepted':accepted?'partial':'failed',pushAccepted:accepted,pushFailed:failed,lastPushAt:new Date(),...(failed?{lastPushError:lastError}:{})},$inc:{attempts:1}});
}

export async function createNotification(input:NotificationInput){
  const d=await db(),now=new Date();
  let n:any;
  try{
    const r=await d.collection('notifications').insertOne({...input,status:'created',pushStatus:'pending',attempts:0,createdAt:now});
    n={...input,_id:r.insertedId,status:'created',pushStatus:'pending',attempts:0,createdAt:now};
  }catch(e:any){
    if(e?.code===11000)return await d.collection('notifications').findOne({eventId:input.eventId});
    throw e;
  }
  try{await sendPush(n);}catch(e:any){
    await d.collection('notifications').updateOne({_id:n._id},{$set:{pushStatus:'failed',lastPushAt:new Date(),lastPushError:e?.message||'Push gönderilemedi'},$inc:{attempts:1}}).catch(()=>{});
  }
  return n;
}

const managerMessage=(eventType:string,b:any)=>({title:eventType==='created'?'Yeni arıza kaydı':eventType==='seen'?'Teknisyen bildirimi gördü':eventType==='accept'?'Teknisyen işi kabul etti':eventType==='start'?'Teknisyen işe başladı':eventType==='submit'?'Teknik rapor gönderildi':eventType==='escalation'?'Teknisyen yanıtı gecikti':'Arıza bildirimi',body:eventType==='created'?`${b.code} • ${b.motorName} • ${b.categoryName}`:eventType==='seen'?`${b.code} • ${b.assignedTechnicianName||'Teknisyen'} bildirimi gördü`:eventType==='accept'?`${b.code} • ${b.assignedTechnicianName||'Teknisyen'} işi kabul etti`:eventType==='start'?`${b.code} • ${b.assignedTechnicianName||'Teknisyen'} müdahaleye başladı`:eventType==='submit'?`${b.code} • ${b.assignedTechnicianName||'Teknisyen'} raporu yönetime gönderdi`:`${b.code} • ${b.assignedTechnicianName||'Teknisyen'} için yanıt süresi aşıldı`});
export async function notifyManagers(breakdown:any,eventId:string,eventType='created'){const d=await db();const managers=await d.collection('users').find({role:'yonetici',active:true}).toArray();const msg=managerMessage(eventType,breakdown);await Promise.all(managers.map(m=>createNotification({recipientId:String(m._id),breakdownId:String(breakdown._id),eventId:`${eventId}:manager:${m._id}`,title:msg.title,body:msg.body,href:`/arizalar/${breakdown._id}`})));}

export async function retryFailedNotifications(){
  const d=await db(),cutoff=new Date(Date.now()-15*60*1000);
  const rows=await d.collection('notifications').find({pushStatus:{$in:['pending','failed','partial']},attempts:{$lt:5},$or:[{lastPushAt:{$exists:false}},{lastPushAt:{$lt:cutoff}}]}).limit(100).toArray();
  for(const n of rows)await sendPush(n);
  return rows.length;
}

export async function escalateUnresponsiveBreakdowns(){
  const d=await db(),cutoff=new Date(Date.now()-15*60*1000);
  const rows=await d.collection('breakdowns').find({status:'atandi',assignedTechnicianId:{$exists:true},$or:[{seenAt:{$exists:false}},{seenAt:null}],$and:[{assignedAt:{$lte:cutoff}},{escalationLevel:{$ne:1}}]}).limit(50).toArray();
  for(const b of rows){const r=await d.collection('breakdowns').updateOne({_id:b._id,status:'atandi',escalationLevel:{$ne:1}},{$set:{escalationLevel:1,updatedAt:new Date()}});if(r.modifiedCount){const ev=`escalation:seen:${b._id}:1`;await d.collection('breakdown_events').updateOne({eventId:ev},{$setOnInsert:{breakdownId:b._id,eventId:ev,type:'escalation',actorId:'system',actorName:'Bildirim Servisi',note:'Teknisyen 15 dakika içinde bildirimi görmedi.',createdAt:new Date()}},{upsert:true});await notifyManagers(b,ev,'escalation');await createNotification({recipientId:String(b.assignedTechnicianId),breakdownId:String(b._id),eventId:`${ev}:tech`,title:'Arıza bildirimi bekliyor',body:`${b.code} için bildirimi görüp işe başlamanız bekleniyor.`,href:`/arizalar/${b._id}`});}}
  return rows.length;
}
