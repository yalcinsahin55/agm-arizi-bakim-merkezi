'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { useToast } from '@/components/ui/Toaster';
import ConfirmDialog from '@/components/ui/ConfirmDialog';

type Item = {
  _id: string;
  fileName: string;
  contentType: string;
  size: number;
  url: string;
  uploadedBy: string;
  uploadedByName: string;
  createdAt: string;
};

export default function BreakdownAttachments({
  id,
  canUpload,
  canDelete,
}: {
  id: string;
  canUpload: boolean;
  canDelete: boolean;
}) {
  const toast = useToast();
  const [items, setItems] = useState<Item[]>([]);
  const [busy, setBusy] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<Item | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = () =>
    fetch(`/api/breakdowns/${id}/attachments`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((x) => setItems(x.items || []))
      .catch(() => toast.error('Ekler yüklenemedi'));

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const upload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setBusy(true);
    try {
      const f = new FormData();
      f.append('file', file);
      const r = await fetch(`/api/breakdowns/${id}/attachments`, { method: 'POST', body: f });
      const x = await r.json().catch(() => null);
      if (!r.ok)
        throw new Error(x?.error || `Yükleme başarısız (HTTP ${r.status})`);
      if (!x?.item) throw new Error('Sunucudan geçersiz yanıt geldi.');
      setItems((v) => [x.item, ...v]);
      toast.success('Dosya yüklendi', file.name);
    } catch (err) {
      toast.error('Yükleme başarısız', err instanceof Error ? err.message : 'Bilinmeyen hata');
    } finally {
      setBusy(false);
    }
  };

  const confirmRemove = async () => {
    if (!pendingDelete) return;
    setDeleting(true);
    try {
      const r = await fetch(`/api/breakdowns/${id}/attachments`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ attachmentId: pendingDelete._id }),
      });
      if (r.ok) {
        setItems((v) => v.filter((x) => x._id !== pendingDelete._id));
        toast.success('Dosya silindi');
        setPendingDelete(null);
      } else {
        const j = await r.json().catch(() => null);
        toast.error('Silinemedi', j?.error || 'Dosya silinemedi');
      }
    } catch {
      toast.error('Bağlantı hatası');
    } finally {
      setDeleting(false);
    }
  };

  const mb = (n: number) => `${(n / 1024 / 1024).toFixed(2)} MB`;

  return (
    <div className="card" style={{ marginTop: 16 }}>
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <div>
          <h2>Arıza Kanıtları & Ekler</h2>
          <p className="muted">Fotoğraf, PDF ve servis dokümanları · maksimum 6 MB</p>
        </div>
        {canUpload && (
          <label className="btn primary">
            {busy ? 'Yükleniyor…' : '+ Dosya Ekle'}
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,application/pdf"
              onChange={upload}
              hidden
              disabled={busy}
            />
          </label>
        )}
      </div>
      <div className="attachment-grid">
        {items.map((a) => (
          <div className="attachment" key={a._id}>
            {a.contentType.startsWith('image/') ? (
              <a href={a.url} target="_blank" rel="noreferrer" className="attachment-thumb">
                <Image src={a.url} alt={a.fileName} fill unoptimized style={{ objectFit: 'cover' }} />
              </a>
            ) : (
              <a className="attachment-file" href={a.url} target="_blank" rel="noreferrer">
                <b>PDF</b>
                <span>{a.fileName}</span>
              </a>
            )}
            <div className="attachment-meta">
              <span title={a.fileName}>{a.fileName}</span>
              <small>
                {mb(a.size)} · {a.uploadedByName}
              </small>
              {canDelete && (
                <button className="link-btn" onClick={() => setPendingDelete(a)}>
                  Sil
                </button>
              )}
            </div>
          </div>
        ))}
        {!items.length && <div className="empty-compact">Henüz ek dosya yok.</div>}
      </div>

      <ConfirmDialog
        open={!!pendingDelete}
        title="Dosya silinsin mi?"
        description={pendingDelete ? `${pendingDelete.fileName} kalıcı olarak silinecek.` : undefined}
        confirmLabel="Sil"
        danger
        busy={deleting}
        onCancel={() => !deleting && setPendingDelete(null)}
        onConfirm={confirmRemove}
      />
    </div>
  );
}
