'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { statusLabel, relativeTime } from '@/lib/labels';
import { useToast } from '@/components/ui/Toaster';
import ConfirmDialog from '@/components/ui/ConfirmDialog';

type Row = {
  _id: string;
  code: string;
  motorName?: string;
  title?: string;
  status: string;
  archivedAt?: string;
  createdAt?: string;
};

export default function ArchiveList({ initialRows }: { initialRows: Row[] }) {
  const router = useRouter();
  const toast = useToast();
  const [rows, setRows] = useState(initialRows);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<{ id: string; mode: 'restore' | 'purge'; code: string } | null>(null);

  async function run() {
    if (!confirm) return;
    const { id, mode, code } = confirm;
    setBusyId(id);
    try {
      const res = await fetch(`/api/breakdowns/${id}/archive`, {
        method: mode === 'restore' ? 'POST' : 'DELETE',
      });
      if (res.ok) {
        setRows((prev) => prev.filter((r) => String(r._id) !== id));
        toast.success(
          mode === 'restore' ? 'Arşivden çıkarıldı' : 'Kalıcı silindi',
          mode === 'restore' ? `${code} aktif listeye döndü.` : `${code} veritabanından kaldırıldı.`,
        );
        setConfirm(null);
        router.refresh();
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error('İşlem başarısız', err.error || 'Tamamlanamadı');
      }
    } catch {
      toast.error('Bağlantı hatası');
    } finally {
      setBusyId(null);
    }
  }

  if (!rows.length) {
    return (
      <div className="card empty" style={{ marginTop: 16 }}>
        <p className="muted">Arşivde kayıt yok.</p>
      </div>
    );
  }

  return (
    <>
      <p className="muted" style={{ marginTop: 8, fontSize: 13 }}>
        Geri al → aktif liste · Kalıcı sil → veritabanından silinir (geri alınamaz)
      </p>
      <div className="card" style={{ marginTop: 12, padding: 0, overflow: 'hidden' }}>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Kod</th>
                <th>Motor / Başlık</th>
                <th>Durum</th>
                <th>Arşiv</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const id = String(r._id);
                return (
                  <tr key={id}>
                    <td>
                      <Link href={`/arizalar/${id}`}>{r.code}</Link>
                    </td>
                    <td>
                      <strong>{r.motorName || '—'}</strong>
                      <span className="cell-sub">{r.title || ''}</span>
                    </td>
                    <td>{statusLabel[r.status] || r.status}</td>
                    <td className="muted">{r.archivedAt ? relativeTime(r.archivedAt) : '—'}</td>
                    <td>
                      <div className="row" style={{ gap: 6, justifyContent: 'flex-end' }}>
                        <button
                          className="btn btn-sm"
                          disabled={busyId === id}
                          onClick={() => setConfirm({ id, mode: 'restore', code: r.code })}
                        >
                          Geri al
                        </button>
                        <button
                          className="btn btn-sm danger"
                          disabled={busyId === id}
                          onClick={() => setConfirm({ id, mode: 'purge', code: r.code })}
                        >
                          Kalıcı sil
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
      <ConfirmDialog
        open={!!confirm}
        title={confirm?.mode === 'purge' ? 'Kalıcı silinsin mi?' : 'Arşivden çıkarılsın mı?'}
        description={
          confirm?.mode === 'purge'
            ? `${confirm.code} veritabanından tamamen silinecek. Bu işlem geri alınamaz.`
            : `${confirm?.code} tekrar aktif arıza listesinde görünür.`
        }
        confirmLabel={confirm?.mode === 'purge' ? 'Kalıcı sil' : 'Geri al'}
        danger={confirm?.mode === 'purge'}
        busy={!!busyId}
        onCancel={() => !busyId && setConfirm(null)}
        onConfirm={run}
      />
    </>
  );
}
