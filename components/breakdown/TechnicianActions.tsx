'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/ui/Toaster';
import { homePath } from '@/lib/home-path';

export default function TechnicianActions({ breakdown }: { breakdown: import('@/types').Breakdown }) {
  const r = useRouter();
  const toast = useToast();
  const [report, setReport] = useState('');
  const [rootCause, setRootCause] = useState('');
  const [correctiveAction, setCorrectiveAction] = useState('');
  const [busy, setBusy] = useState(false);

  async function act(action: import('@/lib/breakdown-workflow').TechnicianAction, extra: Record<string, unknown> = {}) {
    setBusy(true);
    try {
      const x = await fetch(`/api/breakdowns/${breakdown._id}/action`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action, ...extra }),
      });
      if (x.ok) {
        if (action === 'submit') {
          toast.success(
            'Rapor gönderildi',
            'Teknik rapor yönetici onayına iletildi. Ana sayfanıza yönlendiriliyorsunuz.',
          );
          r.push(homePath('teknisyen'));
          return;
        }
        const labels: Record<string, string> = {
          seen: 'Bildirim görüldü olarak işaretlendi',
          accept: 'İş kabul edildi',
          start: 'Müdahale başlatıldı',
        };
        toast.success(labels[action] || 'İşlem tamamlandı');
        r.refresh();
      } else {
        const err = await x.json().catch(() => ({}));
        toast.error('İşlem başarısız', err.error || 'Beklenmeyen bir hata oluştu');
      }
    } catch {
      toast.error('Bağlantı hatası', 'Ağ isteği tamamlanamadı. Tekrar deneyin.');
    } finally {
      setBusy(false);
    }
  }

  function submitReport() {
    if (report.trim().length < 10) {
      toast.warning(
        'Rapor çok kısa',
        'Teknik rapor en az 10 karakter olmalı. Yaptığınız işlemi kısaca açıklayın.',
      );
      return;
    }
    act('submit', {
      report: report.trim(),
      rootCause: rootCause.trim(),
      correctiveAction: correctiveAction.trim(),
      parts: [],
      materials: [],
    });
  }

  return (
    <div className="form">
      {!breakdown.seenAt && (
        <button disabled={busy} className="btn primary" onClick={() => act('seen')}>
          Bildirimi Gördüm
        </button>
      )}
      {['atandi', 'revizyon'].includes(breakdown.status) && !breakdown.acknowledgedAt && (
        <button
          disabled={busy || !breakdown.seenAt}
          className="btn primary"
          onClick={() => act('accept')}
        >
          İşi Kabul Et
        </button>
      )}
      {['atandi', 'revizyon'].includes(breakdown.status) && breakdown.acknowledgedAt && (
        <button disabled={busy} className="btn primary" onClick={() => act('start')}>
          Müdahaleye Başla
        </button>
      )}
      {breakdown.status === 'devam_ediyor' && (
        <>
          <label>
            Kök Neden
            <textarea
              value={rootCause}
              onChange={(e) => setRootCause(e.target.value)}
              placeholder="Arızanın temel nedeni..."
            />
          </label>
          <label>
            Teknik Rapor
            <textarea
              value={report}
              onChange={(e) => setReport(e.target.value)}
              placeholder="Tespit, yapılan işlemler ve sonuç... (en az 10 karakter)"
            />
          </label>
          <small className="muted">
            {report.trim().length}/10 karakter{' '}
            {report.trim().length < 10 ? '— biraz daha detay lazım' : '— hazır ✅'}
          </small>
          <label>
            Düzeltici Faaliyet
            <textarea
              value={correctiveAction}
              onChange={(e) => setCorrectiveAction(e.target.value)}
              placeholder="Yapılan kalıcı çözüm..."
            />
          </label>
          <button disabled={busy} className="btn primary" onClick={submitReport}>
            {busy ? 'Gönderiliyor…' : 'Raporu Yöneticiye Gönder'}
          </button>
        </>
      )}
    </div>
  );
}
