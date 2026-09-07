import {NextResponse} from 'next/server';
import {db} from '@/lib/db';
import {getCurrentUser} from '@/lib/auth';

function esc(v: unknown) { const raw=String(v ?? ''); const s=/^[=+\-@]/.test(raw) ? `'${raw}` : raw; return /[\",\n\r]/.test(s) ? `"${s.replace(/"/g,'""')}"` : s; }
function dateStart(v:string|null){ if(!v)return undefined; const d=new Date(`${v}T00:00:00`); return Number.isNaN(d.getTime())?undefined:d; }
function dateEnd(v:string|null){ if(!v)return undefined; const d=new Date(`${v}T23:59:59.999`); return Number.isNaN(d.getTime())?undefined:d; }

export async function GET(req:Request){
  const u=await getCurrentUser();
  if(!u||!['yonetici','goruntuleyici'].includes(u.role)) return NextResponse.json({error:'Yetkisiz'},{status:403});
  const url=new URL(req.url); const p=url.searchParams;
  const q:any={};
  const from=dateStart(p.get('from')), to=dateEnd(p.get('to'));
  if(from||to) q.createdAt={...(from?{$gte:from}:{}),...(to?{$lte:to}:{})};
  for(const [key,param] of [['motorId','motor'],['categoryId','category'],['assignedTechnicianId','technician'],['status','status'],['priority','priority']] as const){const v=p.get(param);if(v)q[key]=v;}
  const d=await db();
  const rows=await d.collection('breakdowns').find(q).sort({createdAt:-1}).limit(5000).toArray();
  const minutes=(a:any,b:any)=>a&&b?Math.max(0,Math.round((new Date(b).getTime()-new Date(a).getTime())/60000)):null;
  const mttrValues=rows.map(x=>minutes(x.startedAt,x.closedAt)).filter((x):x is number=>x!==null);
  const responseValues=rows.map(x=>minutes(x.createdAt,x.seenAt)).filter((x):x is number=>x!==null);
  const interventionValues=rows.map(x=>minutes(x.startedAt,x.submittedAt)).filter((x):x is number=>x!==null);
  const avg=(xs:number[])=>xs.length?Math.round(xs.reduce((a,b)=>a+b,0)/xs.length):null;
  const stats={total:rows.length,critical:rows.filter(x=>x.priority==='kritik').length,closed:rows.filter(x=>x.status==='onaylandi').length,waiting:rows.filter(x=>x.status==='onay_bekliyor').length,active:rows.filter(x=>['acik','atandi','devam_ediyor','revizyon'].includes(x.status)).length,avgMttr:avg(mttrValues),avgResponse:avg(responseValues),avgIntervention:avg(interventionValues)};
  const by=(field:string)=>{const m=new Map<string,{name:string,count:number}>();for(const x of rows){const id=String(x[field]??'');const name=String(x[field.replace('Id','Name')]??'Tanımsız');if(!id&&field.endsWith('Id'))continue;const k=id||name;const old=m.get(k);m.set(k,{name,count:(old?.count||0)+1});}return [...m.values()].sort((a,b)=>b.count-a.count);};
  const monthly=(()=>{const m=new Map<string,number>();for(const x of rows){const d=new Date(x.createdAt);if(Number.isNaN(d.getTime()))continue;const k=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;m.set(k,(m.get(k)||0)+1)}return [...m.entries()].sort((a,b)=>a[0].localeCompare(b[0])).slice(-12).map(([name,count])=>({name,count}))})();
  const priority=(()=>{const m=new Map<string,number>();for(const x of rows)m.set(x.priority,(m.get(x.priority)||0)+1);return [...m.entries()].map(([name,count])=>({name,count})).sort((a,b)=>b.count-a.count)})();
  const payload={stats,monthly,priority,rows:rows.map(x=>({...x,_id:String(x._id),createdAt:x.createdAt instanceof Date?x.createdAt.toISOString():x.createdAt})),byMotor:by('motorId'),byCategory:by('categoryId'),byTechnician:by('assignedTechnicianId')};
  if(p.get('format')==='csv'){
    const header=['Arıza No','Tarih','Motor','Kategori','Alt Kategori','Öncelik','Başlık','Durum','Teknisyen','Bildirim Görüldü','İşe Başlama','Rapor Gönderim','Kapanış'];
    const lines=[header,...rows.map(x=>[x.code,x.createdAt instanceof Date?x.createdAt.toLocaleString('tr-TR'):x.createdAt,x.motorName,x.categoryName,x.subcategoryName,x.priority,x.title,x.status,x.assignedTechnicianName,x.seenAt,x.startedAt,x.submittedAt,x.closedAt].map(esc))].map(r=>r.join(','));
    return new NextResponse('\uFEFF'+lines.join('\n'),{headers:{'Content-Type':'text/csv; charset=utf-8','Content-Disposition':'attachment; filename="ariza-raporu.csv"'}});
  }
  return NextResponse.json(payload);
}
