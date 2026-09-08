'use client';
import { useRouter } from 'next/navigation';
import type { Breakdown, User } from '@/types';
import TechnicianActions from './breakdown/TechnicianActions';
import ManagerActions from './breakdown/ManagerActions';

export default function BreakdownActions({ breakdown, user }: { breakdown: Breakdown; user: User }) {
  const router = useRouter();
  async function remove() {
    const label = user.role === 'yonetici' ? 'arşivlensin' : 'silinsin';
    if (!confirm(`Bu arıza kaydı ${label} mi?`)) return;
    const response = await fetch('/api/breakdowns', {
      method: 'DELETE',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ id: String(breakdown._id) }),
    });
    if (response.ok) router.push('/arizalar');
    else alert((await response.json()).error);
  }

  if (user.role === 'teknisyen' && breakdown.assignedTechnicianId === user._id) return <TechnicianActions breakdown={breakdown} />;
  if (user.role === 'yonetici') {
    return (
      <>
        <ManagerActions breakdown={breakdown} />
        {!breakdown.archived && (
          <div className="form">
            <button className="btn danger" onClick={remove}>Arıza Kaydını Arşivle</button>
            <p className="muted">Hatalı kayıtları fiziksel olarak silmek yerine geri izlenebilir şekilde arşivler.</p>
          </div>
        )}
      </>
    );
  }
  if (user.role === 'operator' && breakdown.createdBy === user._id && breakdown.status === 'acik') {
    return <div className="form"><button className="btn danger" onClick={remove}>Arıza Kaydını İptal Et</button><p className="muted">Atama yapılana kadar kayıt üzerinde değişiklik/iptal yapılabilir.</p></div>;
  }
  return <p className="muted">Bu kayıt üzerinde işlem yetkiniz yok.</p>;
}
