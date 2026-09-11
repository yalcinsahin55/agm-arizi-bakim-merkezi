'use client';

import { useState, useRef } from 'react';
import { useToast } from '@/components/ui/Toaster';

export default function HoursUploadForm() {
  const toast = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [fileSize, setFileSize] = useState<string | null>(null);
  const [result, setResult] = useState<{
    updated: number;
    skipped: number;
    errors: string[];
    totalRows: number;
  } | null>(null);

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) {
      setFileName(null);
      setFileSize(null);
      return;
    }
    setFileName(file.name);
    const kb = file.size / 1024;
    setFileSize(kb < 1024 ? `${kb.toFixed(1)} KB` : `${(kb / 1024).toFixed(2)} MB`);
    setResult(null);
  }

  function clearFile() {
    setFileName(null);
    setFileSize(null);
    setResult(null);
    if (inputRef.current) inputRef.current.value = '';
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const file = inputRef.current?.files?.[0];
    if (!file) {
      toast.error('Dosya seçin', 'Önce Excel veya CSV dosyasını seçin.');
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
      clearFile();
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
          Sütun başlıkları: <b>MOTOR</b>, <b>MOTOR ÇALIŞMA SAATİ</b>, isteğe bağlı <b>YÜK</b> (kW).
        </p>

        <div className="row" style={{ gap: 12, flexWrap: 'wrap', marginTop: 12, alignItems: 'center' }}>
          <label
            className="btn"
            style={{
              cursor: 'pointer',
              border: fileName ? '2px solid var(--ok, #16a34a)' : undefined,
            }}
          >
            {fileName ? 'Dosyayı değiştir' : 'Dosya seç'}
            <input
              ref={inputRef}
              type="file"
              accept=".xlsx,.xls,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv"
              style={{ display: 'none' }}
              onChange={onFileChange}
            />
          </label>
          <button type="button" className="btn" onClick={downloadTemplate}>
            Şablon indir (CSV)
          </button>
          <button className="btn primary" disabled={busy || !fileName} type="submit">
            {busy ? 'Yükleniyor…' : 'Saatleri Güncelle'}
          </button>
        </div>

        {fileName ? (
          <div
            className="notice"
            style={{
              marginTop: 14,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
              flexWrap: 'wrap',
              borderLeft: '4px solid #16a34a',
              background: 'rgba(22, 163, 74, 0.08)',
            }}
          >
            <div>
              <div style={{ fontWeight: 600, color: '#16a34a' }}>✓ Dosya seçildi</div>
              <div style={{ marginTop: 4 }}>
                <b>{fileName}</b>
                {fileSize ? <span className="muted"> · {fileSize}</span> : null}
              </div>
              <div className="muted" style={{ marginTop: 4, fontSize: 13 }}>
                Hazır. Şimdi <b>Saatleri Güncelle</b> butonuna basabilirsiniz.
              </div>
            </div>
            <button type="button" className="btn" onClick={clearFile} disabled={busy}>
              Kaldır
            </button>
          </div>
        ) : (
          <div className="muted" style={{ marginTop: 12, fontSize: 13 }}>
            Henüz dosya seçilmedi. <b>Dosya seç</b> ile Excel dosyanızı seçin.
          </div>
        )}
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
              {result.errors.length > 30 && (
                <p className="muted">… ve {result.errors.length - 30} tane daha</p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
