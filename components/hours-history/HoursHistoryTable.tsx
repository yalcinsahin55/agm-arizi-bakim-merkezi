'use client';

import { useEffect, useState } from 'react';

type MotorOption = { _id: string; name: string };

type HistoryRow = {
  _id: string;
  motorId: string;
  motorName: string;
  recordDateKey: string | null;
  hours: number | null;
  load: number | null;
  source: string;
  updatedByName: string;
  createdAt: string;
};

type HistoryResponse = {
  rows: HistoryRow[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

export default function HoursHistoryTable({ motors }: { motors: MotorOption[] }) {
  const [motorId, setMotorId] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState<HistoryResponse | null>(null);
  const [loading, setLoading] = useState(false);

  async function load(p = page) {
    setLoading(true);
    try {
      const qs = new URLSearchParams();
      if (motorId) qs.set('motorId', motorId);
      if (from) qs.set('from', from);
      if (to) qs.set('to', to);
      qs.set('page', String(p));
      const res = await fetch(`/api/motors/hours/history?${qs.toString()}`, { cache: 'no-store' });
      if (!res.ok) return;
      setData((await res.json()) as HistoryResponse);
      setPage(p);
    } finally {
      setLoading(false);
    }
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { void load(1); }, []);

  function applyFilters(e: React.FormEvent) {
    e.preventDefault();
    void load(1);
  }

  function quickToday() {
    const t = todayKey();
    setFrom(t);
    setTo(t);
    void load(1);
  }

  function quickLast7Days() {
    const t = new Date();
    const from7 = new Date(t.getTime() - 6 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    setFrom(from7);
    setTo(todayKey());
    void load(1);
  }

  function clearFilters() {
    setMotorId('');
    setFrom('');
    setTo('');
    void load(1);
  }

  return (
    <div>
      <form className="report-filters" onSubmit={applyFilters} style={{ alignItems: 'end' }}>
        <label>
          Motor
          <select value={motorId} onChange={(e) => setMotorId(e.target.value)}>
            <option value="">Tüm motorlar</option>
            {motors.map((m) => (
              <option key={m._id} value={m._id}>{m.name}</option>
            ))}
          </select>
        </label>
        <label>
          Başlangıç tarihi
          <input type="date" value={from} max={to || undefined} onChange={(e) => setFrom(e.target.value)} />
        </label>
        <label>
          Bitiş tarihi
          <input type="date" value={to} min={from || undefined} max={todayKey()} onChange={(e) => setTo(e.target.value)} />
        </label>
        <button className="btn primary" type="submit" disabled={loading}>
          {loading ? 'Yükleniyor…' : 'Filtrele'}
        </button>
      </form>
      <div className="row" style={{ gap: 8, marginTop: 10 }}>
        <button type="button" className="btn btn-sm" onClick={quickToday}>Bugün</button>
        <button type="button" className="btn btn-sm" onClick={quickLast7Days}>Son 7 gün</button>
        <button type="button" className="btn btn-sm" onClick={clearFilters}>Filtreyi temizle</button>
      </div>

      {data && (
        <>
          <p className="muted" style={{ marginTop: 14 }}>
            {data.total} kayıt bulundu{motorId ? '' : ' — motora göre daraltmak için yukarıdan seç'}.
          </p>
          <div className="table-wrap" style={{ marginTop: 8 }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Tarih</th>
                  <th>Motor</th>
                  <th>Saat</th>
                  <th>Yük (kW)</th>
                  <th>Güncelleyen</th>
                </tr>
              </thead>
              <tbody>
                {data.rows.map((r) => (
                  <tr key={r._id}>
                    <td>{r.recordDateKey ? new Date(r.recordDateKey + 'T00:00:00').toLocaleDateString('tr-TR') : '—'}</td>
                    <td><b>{r.motorName}</b></td>
                    <td>{r.hours != null ? Number(r.hours).toLocaleString('tr-TR') : '—'}</td>
                    <td>{r.load != null ? Number(r.load).toLocaleString('tr-TR') : '—'}</td>
                    <td>{r.updatedByName || '—'}</td>
                  </tr>
                ))}
                {data.rows.length === 0 && (
                  <tr>
                    <td colSpan={5} className="muted" style={{ textAlign: 'center', padding: 20 }}>
                      Bu filtrelerle kayıt bulunamadı.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          {data.totalPages > 1 && (
            <div className="row" style={{ justifyContent: 'flex-end', gap: 8, marginTop: 10 }}>
              <button className="btn btn-sm" disabled={page <= 1 || loading} onClick={() => load(page - 1)}>
                ← Önceki
              </button>
              <span className="muted" style={{ fontSize: 13, alignSelf: 'center' }}>
                Sayfa {data.page} / {data.totalPages}
              </span>
              <button className="btn btn-sm" disabled={page >= data.totalPages || loading} onClick={() => load(page + 1)}>
                Sonraki →
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
