import {NextResponse} from 'next/server';
import {db} from '@/lib/db';
import {getCurrentUser} from '@/lib/auth';

export async function GET(_req:Request,{params}:{params:Promise<{id:string}>}){
 const u=await getCurrentUser();
 if(!u)return NextResponse.json({error:'Giriş gerekli'},{status:401});
 const {id}=await params;
 const d=await db();
 const motor=await d.collection('motors').findOne({_id:id,active:true});
 if(!motor)return NextResponse.json({error:'Motor bulunamadı'},{status:404});
 const rows=await d.collection('breakdowns').find({motorId:id}).sort({createdAt:-1}).limit(500).toArray();
 const minutes=(a:any,b:any)=>a&&b?Math.max(0,Math.round((new Date(b).getTime()-new Date(a).getTime())/60000)):null;
 const mttr=rows.map(x=>minutes(x.startedAt,x.closedAt)).filter((x):x is number=>x!==null);
 const active=rows.filter(x=>['acik','atandi','devam_ediyor','revizyon'].includes(x.status)).length;
 const critical=rows.filter(x=>x.priority==='kritik').length;
 const byCategory=[...rows.reduce((m,x)=>{const k=String(x.categoryName||'Tanımsız');m.set(k,(m.get(k)||0)+1);return m},new Map<string,number>())].map(([name,count])=>({name,count})).sort((a,b)=>b.count-a.count);
 const monthly=[...rows.reduce((m,x)=>{const date=new Date(x.createdAt);if(Number.isNaN(date.getTime()))return m;const k=`${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}`;m.set(k,(m.get(k)||0)+1);return m},new Map<string,number>())].sort((a,b)=>a[0].localeCompare(b[0])).slice(-12).map(([name,count])=>({name,count}));
 const attachments=await d.collection('breakdown_attachments').find({breakdownId:{$in:rows.map(x=>String(x._id))}}).sort({createdAt:-1}).limit(1000).toArray();
 return NextResponse.json({motor:{...motor,_id:String(motor._id)},stats:{total:rows.length,active,critical,closed:rows.filter(x=>x.status==='onaylandi').length,avgMttr:mttr.length?Math.round(mttr.reduce((a,b)=>a+b,0)/mttr.length):null},byCategory,monthly,rows:rows.map(x=>({...x,_id:String(x._id)})),attachments:attachments.map(x=>({...x,_id:String(x._id)}))});
}
