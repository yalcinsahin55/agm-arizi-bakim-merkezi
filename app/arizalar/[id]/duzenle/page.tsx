'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useToast } from '@/components/ui/Toaster';
import { homePath } from '@/lib/home-path';

type FormState = {
  _id: string;
  code?: string;
  status: string;
  motorId: string;
  categoryId: string;
  subcategoryId?: string;
  priority: string;
  title: string;
  description: string;
  motorHours?: number | string | null;
  downtimeStartedAt?: string | null;
};

export default function EditBreakdown() {
  const { id } = useParams<{ id: string }>();
  const r = useRouter();
  const toast = useToast();
  const [b, setB] = useState<FormState | null>(null);
  const [motors, setMotors] = useState<import('@/types').Motor[]>([]);
  const [cats, setCats] = useState<import('@/types').Category[]>([]);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [rows, m, c] = await Promise.all([
          fetch('/api/breakdowns').then((x) => x.json()),
          fetch('/api/motors').then((x) => x.json()),
          fetch('/api/categories').then((x) => x.json()),
        ]);
        if (cancelled) return;
        setMotors(Array.isArray(m) ? m : []);
        setCats(Array.isArray(c) ? c : []);
        const found = (Array.isArray(rows) ? rows : []).find(
          (x) => String(x._id) === id,
        );
        if (!found) {
          toast.error('Kayıt bulunamadı');
          r.replace('/arizalar');
          return;
        }
        setB({
          _id: String(found._id),
          code: found.code,
          status: found.status,
          motorId: String(found.motorId || ''),
          categoryId: String(found.categoryId || ''),
          subcategoryId: found.subcategoryId ? String(found.subcategoryId) : '',
          priority: found.priority || 'orta',
          title: found.title || '',
          description: found.description || '',
          motorHours: found.motorHours ?? '',
          downtimeStartedAt: found.downtimeStartedAt
            ? new Date(found.downtimeStartedAt).toISOString().slice(0, 16)
            : '',
        });
      } catch {
        if (!cancelled) toast.error('Kayıt yüklenemedi');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [id, r, toast]);

  if (loading || !b) {
    return <div className="card">Kayıt yükleniyor...</div>;
  }

  // Operatör: yalnızca açık kayıt; yönetici API tarafında daha geniş yetkiye sahip
  if (b.status !== 'acik') {
    return (
      <div className="card">
        <h2>Düzenleme kapalı</h2>
        <p className="muted">
          Bu kayıt artık <b>{b.status}</b> durumunda; düzenlenemez. Yanlış motor seçildiyse
          yönetici ile iletişime geçin veya yeni bir kayıt açın.
        </p>
        <div className="row" style={{ marginTop: 12 }}>
          <button className="btn" onClick={() => r.push(`/arizalar/${id}`)}>
            Detaya Dön
          </button>
          <button className="btn primary" onClick={() => r.push(homePath())}>
            Ana Sayfa
          </button>
        </div>
      </div>
    );
  }

  const parents = cats.filter((x) => !x.parentId);
  const children = cats.filter((x) => String(x.parentId) === b.categoryId);

  function setField(key: keyof FormState, value: string) {
    setB((prev) => (prev ? { ...prev, [key]: value } : prev));
  }

  async function save() {
    if (!b) return;
    if (!b.motorId || !b.categoryId) {
      toast.warning('Eksik alan', 'Motor ve ana kategori zorunludur.');
      return;
    }
    if (b.title.trim().length < 3 || b.description.trim().length < 3) {
      toast.warning('Eksik alan', 'Başlık ve açıklama en az 3 karakter olmalı.');
      return;
    }
    setBusy(true);
    try {
      const body: Record<string, unknown> = {
        id,
        motorId: b.motorId,
        categoryId: b.categoryId,
        subcategoryId: b.subcategoryId || undefined,
        priority: b.priority,
        title: b.title.trim(),
        description: b.description.trim(),
      };
      if (b.motorHours !== '' && b.motorHours != null) {
        body.motorHours = Number(b.motorHours);
      }
      if (b.downtimeStartedAt) {
        body.downtimeStartedAt = new Date(b.downtimeStartedAt).toISOString();
      }
      const x = await fetch('/api/breakdowns', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (x.ok) {
        toast.success('Kayıt güncellendi', 'Değişiklikler kaydedildi. Ana sayfaya dönülüyor.');
        r.push(homePath());
      } else {
        const err = await x.json().catch(() => ({}));
        toast.error('Güncelleme başarısız', err.error || 'Kayıt değiştirilemedi');
      }
    } catch {
      toast.error('Bağlantı hatası', 'İstek tamamlanamadı.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <h1 className="page-title">{b.code || 'Arıza'} Düzenle</h1>
      <p className="muted">
        Yanlış motor veya kategori seçildiyse buradan düzeltebilirsiniz. Kayıt hâlâ açık
        (atanmamış) durumdayken düzenlenebilir.
      </p>
      <div className="card form" style={{ marginTop: 16 }}>
        <div className="report-filters">
          <label>
            Motor
            <select value={b.motorId} onChange={(e) => setField('motorId', e.target.value)}>
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
              value={b.categoryId}
              onChange={(e) => {
                setField('categoryId', e.target.value);
                setField('subcategoryId', '');
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
              value={b.subcategoryId || ''}
              disabled={!b.categoryId}
              onChange={(e) => setField('subcategoryId', e.target.value)}
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
            <select value={b.priority} onChange={(e) => setField('priority', e.target.value)}>
              <option value="kritik">Kritik</option>
              <option value="yuksek">Yüksek</option>
              <option value="orta">Orta</option>
              <option value="dusuk">Düşük</option>
            </select>
          </label>
        </div>
        <label>
          Başlık
          <input
            value={b.title}
            onChange={(e) => setField('title', e.target.value)}
            maxLength={160}
          />
        </label>
        <label>
          Açıklama
          <textarea
            value={b.description}
            onChange={(e) => setField('description', e.target.value)}
            rows={6}
            maxLength={5000}
          />
        </label>
        <div className="report-filters">
          <label>
            Motor Çalışma Saati
            <input
              type="number"
              min="0"
              value={b.motorHours ?? ''}
              onChange={(e) => setField('motorHours', e.target.value)}
              placeholder="Opsiyonel"
            />
          </label>
          <label>
            Duruş Başlangıcı
            <input
              type="datetime-local"
              value={b.downtimeStartedAt || ''}
              onChange={(e) => setField('downtimeStartedAt', e.target.value)}
            />
          </label>
        </div>
        <div className="row">
          <button className="btn" onClick={() => r.back()} disabled={busy}>
            Vazgeç
          </button>
          <button className="btn" onClick={() => r.push(homePath())} disabled={busy}>
            Ana Sayfa
          </button>
          <button disabled={busy} className="btn primary" onClick={save}>
            {busy ? 'Kaydediliyor…' : 'Kaydet ve Ana Sayfaya Dön'}
          </button>
        </div>
      </div>
    </>
  );
}
