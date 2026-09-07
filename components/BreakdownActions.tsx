'use client';
import {useRouter} from 'next/navigation';
import TechnicianActions from './breakdown/TechnicianActions';
import ManagerActions from './breakdown/ManagerActions';
export default function BreakdownActions({breakdown,user}:{breakdown:any;user:any}){
 const r=useRouter();
 async function del(){if(!confirm('Bu arıza kaydı silinsin mi?'))return;const x=await fetch('/api/breakdowns',{method:'DELETE',headers:{'content-type':'application/json'},body:JSON.stringify({id:String(breakdown._id)})});if(x.ok)r.push('/arizalar');else alert((await x.json()).error)}
 if(user.role==='teknisyen'&&breakdown.assignedTechnicianId===user._id)return <TechnicianActions breakdown={breakdown}/>;
 if(user.role==='yonetici')return <ManagerActions breakdown={breakdown}/>;
 if(user.role==='operator'&&breakdown.createdBy===user._id&&breakdown.status==='acik')return <div className="form"><button className="btn danger" onClick={del}>Arıza Kaydını Sil</button><p className="muted">Atama yapılana kadar kayıt üzerinde değişiklik/silme yapılabilir.</p></div>;
 return <p className="muted">Bu kayıt üzerinde işlem yetkiniz yok.</p>
}
