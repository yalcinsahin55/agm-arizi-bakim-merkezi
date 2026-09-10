'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { queueBreakdown } from '@/lib/offline-queue';
import { useOfflineQueueStatus, registerBackgroundSync } from '@/lib/use-offline-queue-status';
import { useToast } from '@/components/ui/Toaster';
import { homePath } from '@/lib/home-path';
import { BreakdownCoreFields, BreakdownHoursFields, type BreakdownFormValues } from '@/components/breakdown-form/BreakdownFormFields';
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
