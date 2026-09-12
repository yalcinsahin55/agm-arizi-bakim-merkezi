export default function ReportCards({ stats }: {
    stats: import('@/types').ReportStats;
}) {
    const duration = (m: number | null) => m === null ? '—' : `${Math.floor(m / 60)}s ${m % 60}dk`;
    return <>
      <div className="grid cards" style={{ marginTop: 16 }}>{[['Toplam Arıza', stats.total], ['Aktif', stats.active], ['Kritik', stats.critical], ['Onay Bekleyen', stats.waiting], ['Kapanan', stats.closed], ['Ort. Bildirim Süresi (Mesai İçi)', duration(stats.avgResponse)], ['Ort. Müdahale (Mesai İçi)', duration(stats.avgIntervention)], ['Ort. MTTR (Mesai İçi)', duration(stats.avgMttr)]].map(([n, c]) => <div className="card" key={String(n)}>{n}<div className="metric">{c}</div></div>)}</div>
      {stats.offHours.count > 0 && <div className="card" style={{ marginTop: 16 }}>
        <h2>Mesai Dışı / Nöbetçi Performansı</h2>
        <p className="muted">
          Hafta içi 20:00-06:00 veya hafta sonu açılıp nöbetçiye giden {stats.offHours.count} kayıt.
          Süreler, teknisyenin tanımlı ulaşım süresi mahsup edildikten sonra hesaplanmıştır; bu
          yüzden mesai içi ortalamalarla doğrudan kıyaslanmamalıdır.
        </p>
        <div className="grid cards">
          <div className="card">Ort. Bildirim Süresi<div className="metric">{duration(stats.offHours.avgResponse)}</div></div>
          <div className="card">Ort. Müdahale<div className="metric">{duration(stats.offHours.avgIntervention)}</div></div>
          <div className="card">Ort. MTTR<div className="metric">{duration(stats.offHours.avgMttr)}</div></div>
        </div>
      </div>}
    </>;
}
