'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { queueBreakdown } from '@/lib/offline-queue';
import { useOfflineQueueStatus, registerBackgroundSync } from '@/lib/use-offline-queue-status';
import { useToast } from '@/components/ui/Toaster';
import { homePath } from '@/lib/home-path';
import { BreakdownCoreFields, BreakdownHoursFields, type BreakdownFormValues } from '@/components/breakdown-form/BreakdownFormFields';
import { classifyRecurrence, recurrenceLabel, RECURRENCE_WINDOW_DAYS } from '@/lib/recurrence';
import { isOffHours } from '@/lib/tz';
import type { Category, Motor, Priority } from '@/types';

export default function NewBreakdown() {
  const r = useRouter();
  const toast = useToast();
  const [motors, setMotors] = useState<Motor[]>([]);
  const [cats, setCats] = useState<Category[]>([]);
  const [f, setF] = useState<BreakdownFormValues & { priority: Priority }>({
    motorId: '',
    categoryId: '',
    subcategoryId: '',
    priority: 'orta',
    title: '',
    description: '',
    motorHours: '',
    downtimeStartedAt: '',
  });
  const [busy, setBusy] = useState(false);
  const [priorCount, setPriorCount] = useState<number | null>(null);
  const [criticalDispatch, setCriticalDispatch] = useState(false);
  // Saat/tarihe göre mesai dışı mı: hafta içi 20:00-06:00 veya Cmt/Paz tamamı.
  // Sadece bu pencerede "kritik / üretim kaybı" seçeneği gösterilir; normal
  // mesai saatlerinde form hiç karışmaz. Kullanıcı formu açık bırakıp saat
  // 20:00'ı geçerse diye her dakika tazelenir.
  const [offHours, setOffHours] = useState(() => isOffHours());
  useEffect(() => {
    const id = setInterval(() => setOffHours(isOffHours()), 60000);
    return () => clearInterval(id);
  }, []);
  const { queuedCount, bumpQueuedCount } = useOfflineQueueStatus();

  useEffect(() => {
    Promise.all([
      fetch('/api/motors').then((x) => x.json()),
      fetch('/api/categories').then((x) => x.json()),
    ]).then(([m, c]) => {
      setMotors(m);
      setCats(c);
    });
  }, []);

  // Motor + kategori seçildiğinde, aynı ikilide son 90 günde kaç arıza daha
  // açıldığını sorup operatörü tekrarlayan bir sorun olabileceği konusunda uyarır.
  // Seçim eksik/temizlenirse önceki sonucu sıfırlamak için, bunu bir efekt
  // yerine render sırasında yapıyoruz (React'in "adjusting state when a prop
  // changes" deseni) — efekt içinden senkron setState kademeli render riski taşır.
  const motorCategoryKey = `${f.motorId}|${f.categoryId}`;
  const [prevMotorCategoryKey, setPrevMotorCategoryKey] = useState(motorCategoryKey);
  if (motorCategoryKey !== prevMotorCategoryKey) {
    setPrevMotorCategoryKey(motorCategoryKey);
    if (!f.motorId || !f.categoryId) setPriorCount(null);
  }

  useEffect(() => {
    if (!f.motorId || !f.categoryId) return;
    let cancelled = false;
    const t = setTimeout(() => {
      const qs = new URLSearchParams({ motorId: f.motorId, categoryId: f.categoryId });
      fetch(`/api/breakdowns/recurrence?${qs}`)
        .then((r) => (r.ok ? r.json() : null))
        .then((j) => {
          if (!cancelled) setPriorCount(j ? j.priorCount : null);
        })
        .catch(() => {
          if (!cancelled) setPriorCount(null);
        });
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [f.motorId, f.categoryId]);

  const recurrenceLevel = priorCount !== null ? classifyRecurrence(priorCount) : null;

  function set(key: keyof BreakdownFormValues, value: string) {
    setF((x) => ({ ...x, [key]: key === 'priority' ? (value as Priority) : value }) as typeof x);
  }

  async function save() {
    setBusy(true);
    const m = motors.find((x) => String(x._id) === f.motorId);
    const c = cats.find((x) => String(x._id) === f.categoryId);
    const s = cats.find((x) => String(x._id) === f.subcategoryId);
    const body = {
      motorId: f.motorId,
      motorName: m?.name,
      equipmentType: m?.equipmentType ?? 'motor',
      categoryId: f.categoryId,
      categoryName: c?.name,
      subcategoryId: f.subcategoryId || undefined,
      subcategoryName: s?.name,
      priority: f.priority,
      title: f.title,
      description: f.description,
      motorHours: f.motorHours ? Number(f.motorHours) : undefined,
      downtimeStartedAt: f.downtimeStartedAt
        ? new Date(f.downtimeStartedAt).toISOString()
        : undefined,
      criticalDispatch: offHours ? criticalDispatch : undefined,
    };
    try {
      const x = await fetch('/api/breakdowns', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (x.ok) {
        const b = await x.json();
        toast.success(
          'Arıza kaydı oluşturuldu',
          `${b.code || 'Kayıt'} yöneticilere bildirildi. Ana sayfaya dönülüyor.`,
        );
        r.push(homePath());
      } else {
        const err = await x.json().catch(() => ({}));
        toast.error('Kayıt oluşturulamadı', err.error || 'Geçersiz veri');
      }
    } catch {
      await queueBreakdown(body);
      await registerBackgroundSync();
      bumpQueuedCount();
      toast.warning(
        'Çevrimdışı kaydedildi',
        'Bağlantı yok. Arıza bu cihazda saklandı; internet gelince otomatik gönderilecek.',
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <h1 className="page-title">Yeni Arıza Kaydı</h1>
      <p className="muted">
        Arızayı mümkün olduğunca ayrıntılı girin. Kayıt oluşturulduğunda yöneticilere bildirim
        gönderilir.
      </p>
      {queuedCount > 0 && (
        <div className="notice">
          {queuedCount} kayıt bağlantı bekliyor, otomatik gönderilecek.
        </div>
      )}
      {offHours && (
        <div className="card critical-dispatch-card" style={{ marginTop: 16 }}>
          <label className="critical-dispatch-row">
            <input
              type="checkbox"
              className="critical-dispatch-checkbox"
              checked={criticalDispatch}
              onChange={(e) => setCriticalDispatch(e.target.checked)}
            />
            <span>
              <b>🚨 Arıza kritik, üretim kaybı yaşanabilir</b>
              <p className="muted" style={{ margin: '4px 0 0' }}>
                Şu an mesai dışı (20:00–06:00 veya hafta sonu). Bu kutuyu işaretlerseniz nöbetçi
                teknisyen <b>anında ve otomatik olarak</b> bu arızaya atanır, teknisyen evinden yola
                çıkar. İşaretlemezseniz kayıt açık kalır ve yönetici sabah mesaiye başladığında
                manuel olarak atar — yedek ekipmanla üretime devam edilebiliyorsa bunu tercih edin.
              </p>
            </span>
          </label>
        </div>
      )}
      <div className="card form" style={{ marginTop: 16 }}>
        <BreakdownCoreFields
          motors={motors}
          cats={cats}
          values={f}
          onChange={set}
          titlePlaceholder="Örn. Turbo yağ basıncı düşük"
          descriptionPlaceholder="Belirti, alarm, gözlem ve arızanın ne zaman başladığını yazın..."
        />
        <div className="notice">
          Seçilen motorun mevcut merkezi çalışma saati formda referans olarak kullanılabilir. Arıza
          anındaki gerçek saati gerekiyorsa aşağıdaki alanı güncelleyin.
        </div>
        {recurrenceLevel && priorCount !== null && (
          <div className={`recurrence-banner recurrence-${recurrenceLevel}`} role="note">
            <span className="recurrence-icon" aria-hidden>
              {recurrenceLevel === 'yuksek' ? '⚠️' : '↻'}
            </span>
            <div>
              <b>{recurrenceLabel[recurrenceLevel]}</b>
              <p className="muted" style={{ margin: '2px 0 0' }}>
                Bu motor + kategori ikilisinde son {RECURRENCE_WINDOW_DAYS} günde{' '}
                <b>{priorCount}</b> arıza daha açılmış. Devam etmeden önce kalıcı bir kök neden olup
                olmadığını değerlendirin.
              </p>
            </div>
          </div>
        )}
        <BreakdownHoursFields values={f} onChange={set} />
        <div className="row">
          <button className="btn" onClick={() => r.push(homePath())}>
            Vazgeç
          </button>
          <button
            disabled={
              busy ||
              !f.motorId ||
              !f.categoryId ||
              f.title.length < 3 ||
              f.description.length < 3
            }
            className="btn primary"
            onClick={save}
          >
            {busy ? 'Kaydediliyor…' : 'Arızayı Oluştur'}
          </button>
        </div>
      </div>
    </>
  );
}
