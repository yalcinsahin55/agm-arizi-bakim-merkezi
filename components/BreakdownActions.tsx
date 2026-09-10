'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Breakdown, User } from '@/types';
import TechnicianActions from './breakdown/TechnicianActions';
import ManagerActions from './breakdown/ManagerActions';
import { useToast } from '@/components/ui/Toaster';
import { homePath } from '@/lib/home-path';
import ConfirmDialog from '@/components/ui/ConfirmDialog';

export default function BreakdownActions({
  breakdown,
  user,
}: {
  breakdown: Breakdown;
  user: User;
}) {
  const router = useRouter();
  const toast = useToast();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const isManager = user.role === 'yonetici';

  async function remove() {
    setBusy(true);
    try {
      const response = await fetch('/api/breakdowns', {
        method: 'DELETE',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ id: String(breakdown._id) }),
      });
      if (response.ok) {
        toast.success(
          isManager ? 'Kayıt silindi (arşiv)' : 'Arıza kaydı iptal edildi',
          isManager
            ? 'Kayıt arşive taşındı; Arşiv sayfasından görülebilir.'
            : 'Kayıt iptal durumuna alındı.',
        );
        setConfirmOpen(false);
        router.push(homePath(user.role));
      } else {
        const err = await response.json().catch(() => ({}));
        toast.error('İşlem başarısız', err.error || 'Kayıt silinemedi');
      }
    } catch {
      toast.error('Bağlantı hatası');
    } finally {
      setBusy(false);
    }
  }

  if (user.role === 'teknisyen' && breakdown.assignedTechnicianId === user._id) {
    return <TechnicianActions breakdown={breakdown} />;
  }

  if (user.role === 'yonetici') {
    return (
      <>
        <ManagerActions breakdown={breakdown} />
        {!breakdown.archived && (
          <div className="form" style={{ marginTop: 12 }}>
            <button className="btn danger" onClick={() => setConfirmOpen(true)}>
              Arıza Kaydını Sil
            </button>
            <p className="muted">
              Açık, kapalı veya onay bekleyen tüm kayıtlar listeden kaldırılır; arşivde ve denetim günlüğünde saklanır.
            </p>
          </div>
        )}
        <ConfirmDialog
          open={confirmOpen}
          title="Arıza kaydı silinsin mi?"
          description={`${breakdown.code} listelerden çıkarılır, arşive taşınır. İsterseniz arşivden geri çıkarabilirsiniz.`}
          confirmLabel="Sil (Arşive taşı)"
          danger
          busy={busy}
          onCancel={() => !busy && setConfirmOpen(false)}
          onConfirm={remove}
        />
      </>
    );
  }

  if (
    user.role === 'operator' &&
    breakdown.createdBy === user._id &&
    breakdown.status === 'acik'
  ) {
    return (
      <div className="form">
        <button className="btn danger" onClick={() => setConfirmOpen(true)}>
          Arıza Kaydını İptal Et
        </button>
        <p className="muted">Atama yapılana kadar kayıt üzerinde değişiklik/iptal yapılabilir.</p>
        <ConfirmDialog
          open={confirmOpen}
          title="Arıza kaydı iptal edilsin mi?"
          description={`${breakdown.code} iptal durumuna alınacak.`}
          confirmLabel="İptal Et"
          danger
          busy={busy}
          onCancel={() => !busy && setConfirmOpen(false)}
          onConfirm={remove}
        />
      </div>
    );
  }

  return <p className="muted">Bu kayıt üzerinde işlem yetkiniz yok.</p>;
}
