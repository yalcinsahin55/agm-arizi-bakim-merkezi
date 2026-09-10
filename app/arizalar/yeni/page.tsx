'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  flushQueue,
  listQueued,
  queueBreakdown,
  registerBackgroundSync,
} from '@/lib/offline-queue';
import { useToast } from '@/components/ui/Toaster';
import { homePath } from '@/lib/home-path';
import type { Category, Motor, Priority } from '@/types';

export default function NewBreakdown() {
  const r = useRouter();
  const toast = useToast();
  const [motors, setMotors] = useState<Motor[]>([]);
  const [cats, setCats] = useState<Category[]>([]);
  const [f, setF] = useState({
    motorId: '',
    categoryId: '',
    subcategoryId: '',
    priority: 'orta' as Priority,
    title: '',
    description: '',
    motorHours: '',
    downtimeStartedAt: '',
  });
  const [busy, setBusy] = useState(false);
  const [queuedCount, setQueuedCount] = useState(0);

  useEffect(() => {
    Promise.all([
      fetch('/api/motors').then((x) => x.json()),
      fetch('/api/categories').then((x) => x.json()),
    ]).then(([m, c]) => {
      setMotors(m);
      setCats(c);
    });
  }, []);

  useEffect(() => {
    if ('serviceWorker' in navigator)
      navigator.serviceWorker.register('/sw.js').catch(() => undefined);
    const refresh = () => listQueued().then((items) => setQueuedCount(items.length));
    refresh();
    const onFlushed = (e: MessageEvent) => {
      if (e.data?.type === 'offline-queue-flushed') refresh();
    };
    const onOnline = () => flushQueue().then(refresh);
    navigator.serviceWorker?.addEventListener('message', onFlushed);
    window.addEventListener('online', onOnline);
    if (navigator.onLine) onOnline();
    return () => {
      navigator.serviceWorker?.removeEventListener('message', onFlushed);
      window.removeEventListener('online', onOnline);
    };
  }, []);

  const parents = cats.filter((x) => !x.parentId);
  const children = cats.filter((x) => String(x.parentId) === f.categoryId);
  const set = <K extends keyof typeof f>(key: K, value: (typeof f)[K]) => setF((x) => ({ ...x, [key]: value }));

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
      setQueuedCount((n) => n + 1);
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
        <div className="report-filters">
          <label>
            Motor
            <select value={f.motorId} onChange={(e) => set('motorId', e.target.value)}>
              <option value="">Motor seçiniz</option>
              {motors.map((x) => (
                <option key={String(x._id)} value={String(x._id)}>
                  {x.name} · {Number(x.hours || 0).toLocaleString('tr-TR')} saat
                </option>
              ))}
            </select>
          </label>
          <label>
            Ana Kategori
            <select
              value={f.categoryId}
              onChange={(e) => {
                set('categoryId', e.target.value);
                set('subcategoryId', '');
              }}
            >
              <option value="">Kategori seçiniz</option>
              {parents.map((x) => (
                <option key={String(x._id)} value={String(x._id)}>
                  {x.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Alt Kategori
            <select
              value={f.subcategoryId}
              disabled={!f.categoryId}
              onChange={(e) => set('subcategoryId', e.target.value)}
            >
              <option value="">Alt kategori seçiniz</option>
              {children.map((x) => (
                <option key={String(x._id)} value={String(x._id)}>
                  {x.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Öncelik
            <select value={f.priority} onChange={(e) => set('priority', e.target.value as Priority)}>
              <option value="kritik">Kritik</option>
              <option value="yuksek">Yüksek</option>
              <option value="orta">Orta</option>
              <option value="dusuk">Düşük</option>
            </select>
          </label>
        </div>
        <label>
          Arıza Başlığı
          <input
            value={f.title}
            onChange={(e) => set('title', e.target.value)}
            maxLength={160}
            placeholder="Örn. Turbo yağ basıncı düşük"
          />
        </label>
        <label>
          Arıza Açıklaması
          <textarea
            value={f.description}
            onChange={(e) => set('description', e.target.value)}
            maxLength={5000}
            rows={7}
            placeholder="Belirti, alarm, gözlem ve arızanın ne zaman başladığını yazın..."
          />
        </label>
        <div className="notice">
          Seçilen motorun mevcut merkezi çalışma saati formda referans olarak kullanılabilir. Arıza
          anındaki gerçek saati gerekiyorsa aşağıdaki alanı güncelleyin.
        </div>
        <div className="report-filters">
          <label>
            Motor Çalışma Saati
            <input
              type="number"
              min="0"
              value={f.motorHours}
              onChange={(e) => set('motorHours', e.target.value)}
              placeholder="Opsiyonel"
            />
          </label>
          <label>
            Duruş Başlangıcı
            <input
              type="datetime-local"
              value={f.downtimeStartedAt}
              onChange={(e) => set('downtimeStartedAt', e.target.value)}
            />
          </label>
        </div>
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
