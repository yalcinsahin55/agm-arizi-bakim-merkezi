'use client';

import { useState } from 'react';
import { useToast } from '@/components/ui/Toaster';

export default function NotificationPreferences({
  initialWhatsappEnabled,
  hasPhone,
}: {
  initialWhatsappEnabled: boolean;
  hasPhone: boolean;
}) {
  const toast = useToast();
  const [enabled, setEnabled] = useState(initialWhatsappEnabled);
  const [busy, setBusy] = useState(false);

  async function toggle(next: boolean) {
    setEnabled(next);
    setBusy(true);
    try {
      const r = await fetch('/api/profile/notifications', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ whatsappEnabled: next }),
      });
      if (!r.ok) {
        setEnabled(!next);
        toast.error('Kaydedilemedi', 'Tercihiniz güncellenemedi, tekrar deneyin.');
      } else {
        toast.success(next ? 'WhatsApp bildirimleri açıldı' : 'WhatsApp bildirimleri kapatıldı');
      }
    } catch {
      setEnabled(!next);
      toast.error('Bağlantı hatası');
    } finally {
      setBusy(false);
    }
  }

  return (
    <label className="row pref-toggle-row" style={{ justifyContent: 'space-between' }}>
      <span>
        <b>WhatsApp Bildirimleri</b>
        <div className="muted" style={{ fontSize: 13 }}>
          {hasPhone
            ? 'Yeni/atanmış arızalar için telefon numaranıza WhatsApp mesajı gönderilir.'
            : 'WhatsApp bildirimi alabilmek için önce yöneticinizin hesabınıza telefon numarası eklemesi gerekir.'}
        </div>
      </span>
      <input
        type="checkbox"
        className="switch"
        checked={enabled}
        disabled={busy || !hasPhone}
        onChange={(e) => toggle(e.target.checked)}
      />
    </label>
  );
}
