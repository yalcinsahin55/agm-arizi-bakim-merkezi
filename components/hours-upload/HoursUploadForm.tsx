'use client';

import { useState, useRef } from 'react';
import { useToast } from '@/components/ui/Toaster';

export default function HoursUploadForm() {
  const toast = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{
    updated: number;
    skipped: number;
    errors: string[];
    totalRows: number;
  } | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const file = inputRef.current?.files?.[0];
    if (!file) {
      toast.error('Dosya seçin', 'Excel veya CSV dosyası yükleyin.');
      return;
    }
    setBusy(true);
    setResult(null);
    try {
      const form = new FormData();
      form.append('file', file);
      const res = await fetch('/api/motors/hours', { method: 'POST', body: form });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error('Yükleme başarısız', data.error || 'Hata');
        return;
      }
      setResult(data);
      toast.success(
        'Saatler güncellendi',
        `${data.updated} ekipman güncellendi${data.errors?.length ? `, ${data.errors.length} hata` : ''}.`,
      );
      if (inputRef.current) inputRef.current.value = '';
    } catch {
      toast.error('Bağlantı hatası');
    } finally {
      setBusy(false);
    }
  }

  function downloadTemplate() {
    const csv =
      'MOTOR,MOTOR ÇALIŞMA SAATİ,YÜK\nAGM 1,8746,1405\nAGM 2,9374,1413\n';
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'motor-saat-sablonu.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div>
      <form className="form" onSubmit={onSubmit}>
        <p className="muted">
          Excel (.xlsx) veya CSV dosyası ile motor çalışma saatlerini toplu güncelleyin.
          Sütun başlıkları: <b>MOTOR</b>, <b>MOTOR ÇALIŞMA SAATİ</b>, isteğe bağlı <b>YÜK</b> (kW). Excel (.xlsx) dosyanızı doğrudan yükleyebilirsiniz.
        </p>
        <div className="row" style={{ gap: 12, flexWrap: 'wrap', marginTop: 12 }}>
          <label className="btn" style={{ cursor: 'pointer' }}>
            Dosya seç
            <input
              ref={inputRef}
              type="file"
              accept=".xlsx,.xls,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv"
              style={{ display: 'none' }}
            />
          </label>
          <button type="button" className="btn" onClick={downloadTemplate}>
            Şablon indir (CSV)
          </button>
          <button className="btn primary" disabled={busy} type="submit">
            {busy ? 'Yükleniyor…' : 'Saatleri Güncelle'}
          </button>
        </div>
      </form>

      {result && (
        <div className="card" style={{ marginTop: 16 }}>
          <h3>Sonuç</h3>
          <p>
            Toplam satır: <b>{result.totalRows}</b> · Güncellenen: <b>{result.updated}</b> · Atlanan:{' '}
            <b>{result.skipped}</b>
          </p>
          {result.errors?.length > 0 && (
            <div className="notice" style={{ marginTop: 8 }}>
              <b>Hatalar / bulunamayanlar:</b>
              <ul style={{ margin: '8px 0 0', paddingLeft: 18 }}>
                {result.errors.slice(0, 30).map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
              </ul>
              {result.errors.length > 30 && <p className="muted">… ve {result.errors.length - 30} tane daha</p>}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
