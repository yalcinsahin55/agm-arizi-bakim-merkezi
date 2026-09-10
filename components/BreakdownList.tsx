'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { Breakdown, User } from '@/types';
import { priorityLabel, relativeTime, statusLabel } from '@/lib/labels';
import { useToast } from '@/components/ui/Toaster';
import ConfirmDialog from '@/components/ui/ConfirmDialog';

type Row = Breakdown & { createdAt: string };

const STATUS_FILTERS: { key: string; label: string }[] = [
  { key: 'all', label: 'Tümü' },
  { key: 'acik', label: 'Açık' },
  { key: 'atandi', label: 'Atandı' },
  { key: 'devam_ediyor', label: 'Devam' },
  { key: 'onay_bekliyor', label: 'Onay' },
  { key: 'revizyon', label: 'Revizyon' },
  { key: 'onaylandi', label: 'Kapandı' },
];

const PRIORITY_ORDER: Record<string, number> = {
  kritik: 0,
  yuksek: 1,
  orta: 2,
  dusuk: 3,
};

export default function BreakdownList({
  initialRows,
  user,
}: {
  initialRows: Row[];
  user: Pick<User, '_id' | 'role' | 'name'>;
}) {
  const router = useRouter();
  const toast = useToast();
  const [rows, setRows] = useState<Row[]>(initialRows);
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('all');
  const [priority, setPriority] = useState('all');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<{
    id: string;
    mode: 'archive' | 'cancel';
    code: string;
  } | null>(null);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return rows
      .filter((r) => {
        if (status !== 'all' && r.status !== status) return false;
        if (priority !== 'all' && r.priority !== priority) return false;
        if (!term) return true;
        const hay = [
          r.code,
          r.motorName,
          r.categoryName,
          r.subcategoryName,
          r.title,
          r.assignedTechnicianName,
          r.createdByName,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        return hay.includes(term);
      })
      .sort((a, b) => {
        const pa = PRIORITY_ORDER[a.priority] ?? 9;
        const pb = PRIORITY_ORDER[b.priority] ?? 9;
        if (pa !== pb) return pa - pb;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
  }, [rows, q, status, priority]);

  function canEditRow(r: Row) {
    if (r.archived) return false;
    if (r.status !== 'acik') return false;
    if (user.role === 'yonetici') return true;
    if (user.role === 'operator' && String(r.createdBy) === user._id) return true;
    return false;
  }

  function canRemoveRow(r: Row) {
    if (r.archived) return false;
    if (user.role === 'yonetici') return true;
    if (user.role === 'operator' && String(r.createdBy) === user._id && r.status === 'acik')
      return true;
    return false;
  }

  async function doRemove() {
    if (!confirm) return;
    const { id, mode, code } = confirm;
    setBusyId(id);
    try {
      const res = await fetch('/api/breakdowns', {
        method: 'DELETE',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      if (res.ok) {
        setRows((prev) => prev.filter((x) => String(x._id) !== id));
        toast.success(
          mode === 'archive' ? 'Kayıt arşivlendi' : 'Kayıt iptal edildi',
          `${code} listeden kaldırıldı.`,
        );
        setConfirm(null);
        router.refresh();
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error('İşlem başarısız', err.error || 'Kayıt silinemedi');
      }
    } catch {
      toast.error('Bağlantı hatası');
    } finally {
      setBusyId(null);
    }
  }

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: rows.length };
    for (const r of rows) c[r.status] = (c[r.status] || 0) + 1;
    return c;
  }, [rows]);

  return (
    <>
      <div className="list-toolbar">
        <div className="list-search">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Kod, motor, kategori, başlık veya teknisyen ara…"
            aria-label="Arıza ara"
          />
        </div>
        <div className="list-filters">
          <select value={priority} onChange={(e) => setPriority(e.target.value)} aria-label="Öncelik">
            <option value="all">Tüm öncelikler</option>
            <option value="kritik">Kritik</option>
            <option value="yuksek">Yüksek</option>
            <option value="orta">Orta</option>
            <option value="dusuk">Düşük</option>
          </select>
        </div>
      </div>

      <div className="filter-chips" role="tablist" aria-label="Durum filtresi">
        {STATUS_FILTERS.map((f) => (
          <button
            key={f.key}
            type="button"
            role="tab"
            aria-selected={status === f.key}
            className={`chip ${status === f.key ? 'active' : ''}`}
            onClick={() => setStatus(f.key)}
          >
            {f.label}
            <span className="chip-count">{counts[f.key] || 0}</span>
          </button>
        ))}
      </div>

      <div className="card" style={{ marginTop: 14, overflowX: 'auto' }}>
        {filtered.length === 0 ? (
          <div className="empty">
            <h2>Kayıt bulunamadı</h2>
            <p className="muted">
              {q || status !== 'all' || priority !== 'all'
                ? 'Filtrelere uyan arıza yok. Aramayı veya filtreyi temizleyin.'
                : 'Henüz arıza kaydı yok.'}
            </p>
            {(user.role === 'yonetici' || user.role === 'operator') && (
              <Link className="btn primary" href="/arizalar/yeni" style={{ marginTop: 12 }}>
                + Yeni Arıza Aç
              </Link>
            )}
          </div>
        ) : (
          <table className="table table-actions">
            <thead>
              <tr>
                <th>Kod</th>
                <th>Motor</th>
                <th>Kategori</th>
                <th>Öncelik</th>
                <th>Durum</th>
                <th>Teknisyen</th>
                <th>Zaman</th>
                <th style={{ textAlign: 'right' }}>İşlem</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((x) => {
                const id = String(x._id);
                const edit = canEditRow(x);
                const remove = canRemoveRow(x);
                return (
                  <tr key={id}>
                    <td>
                      <Link href={`/arizalar/${id}`}>
                        <b>{x.code}</b>
                      </Link>
                      <small className="cell-sub">{x.title}</small>
                    </td>
                    <td>
                      <Link href={`/motorlar/${x.motorId}`}>
                        <b>{x.motorName}</b>
                      </Link>
                    </td>
                    <td>
                      {x.categoryName}
                      {x.subcategoryName ? (
                        <small className="cell-sub">{x.subcategoryName}</small>
                      ) : null}
                    </td>
                    <td>
                      <span className={`badge priority-${x.priority}`}>
                        {priorityLabel[x.priority] || x.priority}
                      </span>
                    </td>
                    <td>
                      <span className="status-chip">
                        <i className={`dot ${x.status}`} />
                        {statusLabel[x.status] || x.status}
                      </span>
                    </td>
                    <td>{x.assignedTechnicianName || 'Atanmadı'}</td>
                    <td>
                      <span title={new Date(x.createdAt).toLocaleString('tr-TR')}>
                        {relativeTime(x.createdAt)}
                      </span>
                    </td>
                    <td>
                      <div className="row-actions">
                        <Link className="btn btn-sm" href={`/arizalar/${id}`}>
                          Aç
                        </Link>
                        {edit && (
                          <Link className="btn btn-sm" href={`/arizalar/${id}/duzenle`}>
                            Düzenle
                          </Link>
                        )}
                        {remove && (
                          <button
                            type="button"
                            className="btn btn-sm danger"
                            disabled={busyId === id}
                            onClick={() =>
                              setConfirm({
                                id,
                                mode: user.role === 'yonetici' ? 'archive' : 'cancel',
                                code: x.code,
                              })
                            }
                          >
                            {user.role === 'yonetici' ? 'Sil' : 'İptal'}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
        <div className="list-footer muted">
          {filtered.length} / {rows.length} kayıt gösteriliyor
        </div>
      </div>

      <ConfirmDialog
        open={!!confirm}
        title={
          confirm?.mode === 'archive'
            ? `${confirm.code} arşivlensin mi?`
            : `${confirm?.code} iptal edilsin mi?`
        }
        description={
          confirm?.mode === 'archive'
            ? 'Kayıt listelerden çıkarılır; denetim günlüğünde izlenebilir kalır.'
            : 'Atama yapılmamış açık kayıt iptal durumuna alınır.'
        }
        confirmLabel={confirm?.mode === 'archive' ? 'Sil (Arşive taşı)' : 'İptal Et'}
        danger
        busy={!!busyId}
        onCancel={() => !busyId && setConfirm(null)}
        onConfirm={doRemove}
      />
    </>
  );
}

