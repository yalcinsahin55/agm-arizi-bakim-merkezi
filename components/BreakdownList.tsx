'use client';

import { useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import type { User } from '@/types';
import { useToast } from '@/components/ui/Toaster';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import BreakdownListToolbar from '@/components/breakdown-list/BreakdownListToolbar';
import BreakdownTable from '@/components/breakdown-list/BreakdownTable';
import { PRIORITY_ORDER, matchesSearch, type BreakdownRow } from '@/components/breakdown-list/helpers';

export default function BreakdownList({
  initialRows,
  user,
}: {
  initialRows: BreakdownRow[];
  user: Pick<User, '_id' | 'role' | 'name'>;
}) {
  const router = useRouter();
  const toast = useToast();
  const searchParams = useSearchParams();
  const [rows, setRows] = useState<BreakdownRow[]>(initialRows);
  // Genel arama (Ctrl/Cmd+K) veya tekrarlayan arıza uyarısı gibi başka
  // sayfalardan "?q=..." ile buraya derin bağlantı (deep link) verilebilsin diye
  // başlangıç değeri URL'den okunur.
  const [q, setQ] = useState(() => searchParams.get('q') || '');
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
        return matchesSearch(r, term);
      })
      .sort((a, b) => {
        const pa = PRIORITY_ORDER[a.priority] ?? 9;
        const pb = PRIORITY_ORDER[b.priority] ?? 9;
        if (pa !== pb) return pa - pb;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
  }, [rows, q, status, priority]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: rows.length };
    for (const r of rows) c[r.status] = (c[r.status] || 0) + 1;
    return c;
  }, [rows]);

  function requestRemove(id: string, code: string) {
    setConfirm({ id, mode: user.role === 'yonetici' ? 'archive' : 'cancel', code });
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

  return (
    <>
      <BreakdownListToolbar
        q={q}
        onQChange={setQ}
        priority={priority}
        onPriorityChange={setPriority}
        status={status}
        onStatusChange={setStatus}
        counts={counts}
      />

      <BreakdownTable
        filtered={filtered}
        total={rows.length}
        user={user}
        hasActiveFilter={!!q || status !== 'all' || priority !== 'all'}
        busyId={busyId}
        onRequestRemove={requestRemove}
      />

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
