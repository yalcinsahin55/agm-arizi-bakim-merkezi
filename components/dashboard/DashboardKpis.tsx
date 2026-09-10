interface KpiItem {
  label: string;
  value: string | number;
  hint: string;
  danger?: boolean;
}

export default function DashboardKpis({
  open, critical, approval, closed, notSeen, avgMttr, isManager,
}: {
  open: number;
  critical: number;
  approval: number;
  closed: number;
  notSeen: number;
  avgMttr: number | null;
  isManager: boolean;
}) {
  const fmt = (minutes: number | null) =>
    minutes === null ? '—' : `${Math.floor(minutes / 60)}s ${minutes % 60}dk`;

  const items: KpiItem[] = [
    { label: 'Aktif Arıza', value: open, hint: 'Açık · Atandı · Müdahale · Revizyon' },
    { label: 'Kritik', value: critical, hint: 'Aktif kritik kayıtlar', danger: critical > 0 },
    { label: 'Onay Bekleyen', value: approval, hint: 'Yönetici aksiyonu' },
    { label: 'Kapanan', value: closed, hint: 'Tamamlanan kayıtlar' },
  ];

  if (isManager) {
    items.push({
      label: 'Bildirim Bekleyen',
      value: notSeen,
      hint: 'Teknisyen henüz görmedi',
      danger: notSeen > 0,
    });
  }

  items.push({
    label: 'Ortalama MTTR',
    value: fmt(avgMttr),
    hint: 'Başlangıç → kapanış',
  });

  return (
    <div className="kpi-grid">
      {items.map((item) => (
        <div className="card kpi" key={item.label}>
          <span className="kpi-label">{item.label}</span>
          <strong className={item.danger ? 'priority-critical' : undefined}>{item.value}</strong>
          <small className="kpi-hint">{item.hint}</small>
        </div>
      ))}
    </div>
  );
}
