'use client';

import { useState } from 'react';
import { useToast } from '@/components/ui/Toaster';

export default function ShareActions({
  code,
  title,
  id,
}: {
  code: string;
  title: string;
  id: string;
}) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(code);
      toast.success('Kod kopyalandı', code);
    } catch {
      toast.error('Kopyalanamadı', 'Tarayıcı panoya izin vermedi');
    }
  }

  async function copyLink() {
    const url = `${window.location.origin}/arizalar/${id}`;
    try {
      await navigator.clipboard.writeText(url);
      toast.success('Link kopyalandı');
    } catch {
      toast.error('Kopyalanamadı');
    }
  }

  async function share() {
    const url = `${window.location.origin}/arizalar/${id}`;
    const text = `${code} · ${title}`;
    setBusy(true);
    try {
      if (navigator.share) {
        await navigator.share({ title: code, text, url });
      } else {
        await navigator.clipboard.writeText(`${text}\n${url}`);
        toast.success('Paylaşım metni kopyalandı');
      }
    } catch (e: unknown) {
      if (!(e instanceof Error) || e.name !== 'AbortError') toast.error('Paylaşılamadı');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="row share-actions">
      <button type="button" className="btn btn-sm" onClick={copyCode}>
        Kodu Kopyala
      </button>
      <button type="button" className="btn btn-sm" onClick={copyLink}>
        Linki Kopyala
      </button>
      <button type="button" className="btn btn-sm primary" disabled={busy} onClick={share}>
        Paylaş
      </button>
    </div>
  );
}
