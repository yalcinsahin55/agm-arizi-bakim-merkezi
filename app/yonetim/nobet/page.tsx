'use client';

import { useEffect, useState } from 'react';
import { useToast } from '@/components/ui/Toaster';
import type { DutyWeek, TechnicianType, User } from '@/types';

const weekLabel = (weekStart: string, i: number) => {
  if (i === 0) return 'Bu Hafta';
  if (i === 1) return 'Gelecek Hafta';
  const end = new Date(`${weekStart}T00:00:00Z`);
  end.setUTCDate(end.getUTCDate() + 6);
  const fmt = (d: Date) => d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' });
  return `${fmt(new Date(`${weekStart}T00:00:00Z`))} – ${fmt(end)}`;
};

export default function DutyRosterPage() {
  const toast = useToast();
  const [techs, setTechs] = useState<User[]>([]);
  const [roster, setRoster] = useState<DutyWeek[]>([]);
  const [currentWeekStart, setCurrentWeekStart] = useState('');
  const [loading, setLoading] = useState(true);
  const [savingWeek, setSavingWeek] = useState<string | null>(null);

  const elektromekanikTechs = techs.filter((t) => (t.technicianType || 'normal') === 'elektromekanik');
  const normalTechs = techs.filter((t) => (t.technicianType || 'normal') === 'normal');

  async function load() {
    setLoading(true);
    try {
      const [techRes, dutyRes] = await Promise.all([
        fetch('/api/technicians').then((r) => (r.ok ? r.json() : [])),
        fetch('/api/duty?weeks=4').then((r) => (r.ok ? r.json() : { roster: [], currentWeekStart: '' })),
      ]);
      setTechs(techRes);
      setRoster(dutyRes.roster || []);
      setCurrentWeekStart(dutyRes.currentWeekStart || '');
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    queueMicrotask(load);
  }, []);

  async function setDuty(weekStart: string, field: TechnicianType, technicianId: string, week: DutyWeek) {
    setSavingWeek(weekStart);
    try {
      const r = await fetch('/api/duty', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          weekStart,
          elektromekanikTechnicianId: field === 'elektromekanik' ? technicianId || null : week.elektromekanik?.id || null,
          normalTechnicianId: field === 'normal' ? technicianId || null : week.normal?.id || null,
        }),
      });
      if (!r.ok) {
        const err = await r.json().catch(() => ({}));
        toast.error('Kaydedilemedi', err.error);
      } else {
        toast.success('Nöbet planı güncellendi');
      }
      load();
    } finally {
      setSavingWeek(null);
    }
  }

  return (
    <>
      <h1 className="page-title">Nöbetçi Teknisyen Planı</h1>
      <p className="muted">
        Her hafta için <b>2 nöbetçi</b> belirleyin: biri Elektromekanik, biri Normal tipte
        teknisyen olmalı. Hafta içi 20:00–06:00 arası veya hafta sonu (Cmt/Paz tamamı) açılıp
        &quot;kritik/üretim kaybı&quot; işaretlenen arızalar otomatik olarak buradaki teknisyene
        gider. Nöbet <b>Pazartesi</b> gününe kadar planlanmazsa yöneticilere uyarı gönderilir.
      </p>

      {!loading && elektromekanikTechs.length === 0 && (
        <div className="notice" style={{ marginTop: 12 }}>
          Henüz &quot;Elektromekanik&quot; tipinde tanımlı bir teknisyen yok. Kullanıcılar
          sayfasından en az bir teknisyenin tipini güncelleyin.
        </div>
      )}
      {!loading && normalTechs.length === 0 && (
        <div className="notice" style={{ marginTop: 12 }}>
          Henüz &quot;Normal&quot; tipinde tanımlı bir teknisyen yok. Kullanıcılar sayfasından en
          az bir teknisyenin tipini güncelleyin.
        </div>
      )}

      <div className="card" style={{ marginTop: 16 }}>
        {loading && <div className="empty-compact">Yükleniyor…</div>}
        {!loading &&
          roster.map((week, i) => {
            const isCurrent = week.weekStart === currentWeekStart;
            const incomplete = !week.elektromekanik || !week.normal;
            return (
              <div
                key={week.weekStart}
                className={`duty-week-row${isCurrent && incomplete ? ' duty-week-missing' : ''}`}
                style={{ borderBottom: i < roster.length - 1 ? '1px solid var(--line)' : 'none' }}
              >
                <div className="duty-week-head">
                  <b>{weekLabel(week.weekStart, i)}</b>
                  <div className="muted" style={{ fontSize: 12 }}>
                    {week.weekStart}
                    {isCurrent && incomplete && (
                      <span className="badge duty-missing-badge"> ⚠ Nöbet planlanmadı</span>
                    )}
                  </div>
                </div>
                <div className="duty-week-selects">
                  <label>
                    Elektromekanik Nöbetçi
                    <select
                      value={week.elektromekanik?.id || ''}
                      disabled={savingWeek === week.weekStart}
                      onChange={(e) => setDuty(week.weekStart, 'elektromekanik', e.target.value, week)}
                    >
                      <option value="">Atanmadı</option>
                      {elektromekanikTechs.map((t) => (
                        <option key={String(t._id)} value={String(t._id)}>
                          {t.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Normal Nöbetçi
                    <select
                      value={week.normal?.id || ''}
                      disabled={savingWeek === week.weekStart}
                      onChange={(e) => setDuty(week.weekStart, 'normal', e.target.value, week)}
                    >
                      <option value="">Atanmadı</option>
                      {normalTechs.map((t) => (
                        <option key={String(t._id)} value={String(t._id)}>
                          {t.name}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              </div>
            );
          })}
      </div>
    </>
  );
}
