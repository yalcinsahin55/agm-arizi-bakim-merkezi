'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Breakdown, User } from '@/types';
import { useToast } from '@/components/ui/Toaster';
import { homePath } from '@/lib/home-path';

type Technician = Pick<User, '_id' | 'name'>;

export default function ManagerActions({ breakdown }: { breakdown: Breakdown }) {
  const router = useRouter();
  const toast = useToast();
  const [techs, setTechs] = useState<Technician[]>([]);
  const [techId, setTechId] = useState('');
  const [dutyThisWeek, setDutyThisWeek] = useState<{ elektromekanikId: string | null; elektromekanikName: string | null; normalId: string | null; normalName: string | null }>({ elektromekanikId: null, elektromekanikName: null, normalId: null, normalName: null });
  const [revisionNote, setRevisionNote] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch('/api/technicians')
      .then((x) => (x.ok ? x.json() : []))
      .then(setTechs)
      .catch(() => setTechs([]));
    fetch('/api/duty')
      .then((x) => (x.ok ? x.json() : null))
      .then((j) => {
        const current = j?.current;
        setDutyThisWeek({
          elektromekanikId: current?.elektromekanik?.id || null,
          elektromekanikName: current?.elektromekanik?.name || null,
          normalId: current?.normal?.id || null,
          normalName: current?.normal?.name || null,
        });
      })
      .catch(() => setDutyThisWeek({ elektromekanikId: null, elektromekanikName: null, normalId: null, normalName: null }));
  }, []);

  async function act(action: string, extra: Record<string, unknown> = {}) {
    setBusy(true);
    try {
      const x = await fetch(`/api/breakdowns/${breakdown._id}/action`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action, ...extra }),
      });
      if (x.ok) {
        setRevisionNote('');
        if (action === 'approve') {
          toast.success('Arıza onaylandı ve kapatıldı', 'Kontrol merkezine yönlendiriliyorsunuz.');
          router.push(homePath('yonetici'));
          return;
        }
        if (action === 'revision') {
          toast.info('Revizyona gönderildi', 'Teknisyen bilgilendirildi.');
        }
        router.refresh();
      } else {
        const err = await x.json().catch(() => ({}));
        toast.error('İşlem başarısız', err.error || 'Beklenmeyen hata');
      }
    } catch {
      toast.error('Bağlantı hatası', 'İstek tamamlanamadı.');
    } finally {
      setBusy(false);
    }
  }

  async function assign() {
    const t = techs.find((x) => String(x._id) === techId);
    if (!t) return;
    setBusy(true);
    try {
      const x = await fetch(`/api/breakdowns/${breakdown._id}/assign`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ technicianId: String(t._id) }),
      });
      if (x.ok) {
        toast.success('Teknisyen atandı', `${t.name} bilgilendirildi.`);
        router.refresh();
      } else {
        const err = await x.json().catch(() => ({}));
        toast.error('Atama başarısız', err.error || 'Teknisyen atanamadı');
      }
    } catch {
      toast.error('Bağlantı hatası');
    } finally {
      setBusy(false);
    }
  }

  async function renotify() {
    setBusy(true);
    try {
      const x = await fetch(`/api/breakdowns/${breakdown._id}/renotify`, { method: 'POST' });
      if (x.ok) {
        toast.info('Tekrar bildirim gönderildi');
        router.refresh();
      } else {
        const err = await x.json().catch(() => ({}));
        toast.error('Bildirim gönderilemedi', err.error);
      }
    } catch {
      toast.error('Bağlantı hatası');
    } finally {
      setBusy(false);
    }
  }

  async function unarchive() {
    setBusy(true);
    try {
      const x = await fetch(`/api/breakdowns/${breakdown._id}/archive`, { method: 'POST' });
      if (x.ok) {
        toast.success('Arşivden çıkarıldı');
        router.refresh();
      } else {
        const err = await x.json().catch(() => ({}));
        toast.error('İşlem başarısız', err.error);
      }
    } catch {
      toast.error('Bağlantı hatası');
    } finally {
      setBusy(false);
    }
  }

  if (breakdown.archived) {
    return (
      <div className="form">
        <p className="muted">Bu kayıt arşivlenmiş durumda. Operasyonel işlem yapılamaz.</p>
        <button disabled={busy} className="btn primary" onClick={unarchive}>
          Arşivden Çıkar
        </button>
      </div>
    );
  }

  return (
    <div className="form">
      <label>
        Teknisyen Ata
        <select value={techId} onChange={(e) => setTechId(e.target.value)}>
          <option value="">Teknisyen seçiniz</option>
          {techs.map((t) => {
            const isElektromekanikDuty = String(t._id) === dutyThisWeek.elektromekanikId;
            const isNormalDuty = String(t._id) === dutyThisWeek.normalId;
            return (
              <option key={String(t._id)} value={String(t._id)}>
                {t.name}
                {isElektromekanikDuty ? ' (Bu Hafta Elektromekanik Nöbetçi)' : ''}
                {isNormalDuty ? ' (Bu Hafta Normal Nöbetçi)' : ''}
              </option>
            );
          })}
        </select>
      </label>
      <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
        {dutyThisWeek.elektromekanikId && techId !== dutyThisWeek.elektromekanikId && (
          <button type="button" className="btn btn-sm" onClick={() => setTechId(dutyThisWeek.elektromekanikId!)}>
            Elektromekanik nöbetçiyi seç ({dutyThisWeek.elektromekanikName})
          </button>
        )}
        {dutyThisWeek.normalId && techId !== dutyThisWeek.normalId && (
          <button type="button" className="btn btn-sm" onClick={() => setTechId(dutyThisWeek.normalId!)}>
            Normal nöbetçiyi seç ({dutyThisWeek.normalName})
          </button>
        )}
      </div>
      <button disabled={busy || !techId} className="btn primary" onClick={assign}>
        {breakdown.assignedTechnicianId ? 'Yeniden Ata' : 'Teknisyene Ata'}
      </button>
      <button
        disabled={busy || breakdown.status !== 'onay_bekliyor'}
        className="btn primary"
        onClick={() => act('approve')}
      >
        Onayla ve Kapat
      </button>
      {breakdown.status === 'onay_bekliyor' && (
        <>
          <label>
            Revizyon Notu
            <textarea
              value={revisionNote}
              onChange={(e) => setRevisionNote(e.target.value)}
              placeholder="Teknisyenden hangi düzeltmeyi istediğinizi yazın..."
            />
          </label>
          <button
            disabled={busy || revisionNote.trim().length < 5}
            className="btn"
            onClick={() => act('revision', { note: revisionNote.trim() })}
          >
            Revizyona Gönder
          </button>
        </>
      )}
      {['atandi', 'revizyon'].includes(breakdown.status) && breakdown.assignedTechnicianId && (
        <button disabled={busy} className="btn" onClick={renotify}>
          Tekrar Bildir
        </button>
      )}
    </div>
  );
}
