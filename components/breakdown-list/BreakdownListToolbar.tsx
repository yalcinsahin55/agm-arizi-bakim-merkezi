import { STATUS_FILTERS } from './helpers';

export default function BreakdownListToolbar({
  q,
  onQChange,
  priority,
  onPriorityChange,
  status,
  onStatusChange,
  counts,
}: {
  q: string;
  onQChange: (value: string) => void;
  priority: string;
  onPriorityChange: (value: string) => void;
  status: string;
  onStatusChange: (value: string) => void;
  counts: Record<string, number>;
}) {
  return (
    <>
      <div className="list-toolbar">
        <div className="list-search">
          <input
            value={q}
            onChange={(e) => onQChange(e.target.value)}
            placeholder="Kod, motor, kategori, başlık veya teknisyen ara…"
            aria-label="Arıza ara"
          />
        </div>
        <div className="list-filters">
          <select value={priority} onChange={(e) => onPriorityChange(e.target.value)} aria-label="Öncelik">
            <option value="all">Tüm öncelikler</option>
            <option value="kritik">Kritik</option>
            <option value="yuksek">Yüksek</option>
            <option value="orta">Orta</option>
            <option value="dusuk">Düşük</option>
          </select>
        </div>
      </div>

      <div className="filter-chips" role="tablist" aria-label="Durum filtresi">
        {STATUS_FILTERS.map((f) => (
          <button
            key={f.key}
            type="button"
            role="tab"
            aria-selected={status === f.key}
            className={`chip ${status === f.key ? 'active' : ''}`}
            onClick={() => onStatusChange(f.key)}
          >
            {f.label}
            <span className="chip-count">{counts[f.key] || 0}</span>
          </button>
        ))}
      </div>
    </>
  );
}
