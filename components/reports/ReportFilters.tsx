'use client';

import type { Dispatch, SetStateAction } from 'react';
import type { Category, Motor, User } from '@/types';

export interface ReportFiltersState {
  from: string;
  to: string;
  motor: string;
  category: string;
  technician: string;
  status: string;
  priority: string;
}

type Option = Pick<Motor, '_id' | 'name'> | Pick<Category, '_id' | 'name'> | Pick<User, '_id' | 'name'> | readonly [string, string];

interface Props {
  motors: Motor[];
  cats: Category[];
  techs: User[];
  f: ReportFiltersState;
  setF: Dispatch<SetStateAction<ReportFiltersState>>;
  load: () => void;
  csvHref: string;
  pdfHref: string;
  loading: boolean;
}

export default function ReportFilters({ motors, cats, techs, f, setF, load, csvHref, pdfHref, loading }: Props) {
  const statuses = [
    ['acik', 'Açık'], ['atandi', 'Atandı'], ['devam_ediyor', 'Devam Ediyor'],
    ['onay_bekliyor', 'Onay Bekliyor'], ['revizyon', 'Revizyon'],
    ['onaylandi', 'Onaylandı'], ['iptal', 'İptal'],
  ] as const;
  const priorities = [['kritik', 'Kritik'], ['yuksek', 'Yüksek'], ['orta', 'Orta'], ['dusuk', 'Düşük']] as const;

  return (
    <div className="card form" style={{ marginTop: 16 }}>
      <div className="report-filters">
        {(['from', 'to'] as const).map((key) => (
          <label key={key}>
            {key === 'from' ? 'Başlangıç' : 'Bitiş'}
            <input type="date" value={f[key]} onChange={(e) => setF((x) => ({ ...x, [key]: e.target.value }))} />
          </label>
        ))}
        <Select label="Motor" value={f.motor} onChange={(v) => setF((x) => ({ ...x, motor: v }))} options={motors} />
        <Select label="Kategori" value={f.category} onChange={(v) => setF((x) => ({ ...x, category: v }))} options={cats} />
        <Select label="Teknisyen" value={f.technician} onChange={(v) => setF((x) => ({ ...x, technician: v }))} options={techs} />
        <Select label="Durum" value={f.status} onChange={(v) => setF((x) => ({ ...x, status: v }))} options={statuses} />
        <Select label="Öncelik" value={f.priority} onChange={(v) => setF((x) => ({ ...x, priority: v }))} options={priorities} />
      </div>
      <div className="row" style={{ flexWrap: 'wrap', gap: 8 }}>
        <button className="btn primary" onClick={load}>{loading ? 'Hesaplanıyor…' : 'Raporu Oluştur'}</button>
        <a className="btn" href={csvHref}>CSV / Excel&apos;e Uygun İndir</a>
        <a className="btn primary" href={pdfHref} target="_blank" rel="noopener">PDF Rapor İndir</a>
      </div>
    </div>
  );
}

function Select({ label, value, onChange, options }: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: readonly Option[];
}) {
  return (
    <label>
      {label}
      <select value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">Tümü</option>
        {options.map((option) => {
          if (Array.isArray(option)) {
            const [idValue, text] = option;
            return <option key={idValue} value={idValue}>{text}</option>;
          }
          const obj = option as Exclude<Option, readonly [string, string]>;
          const idValue = String(obj._id);
          return <option key={idValue} value={idValue}>{obj.name}</option>;
        })}
      </select>
    </label>
  );
}
