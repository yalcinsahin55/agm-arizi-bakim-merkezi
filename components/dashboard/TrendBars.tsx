type DayPoint = { label: string; count: number; closed?: number };

export default function TrendBars({
  title,
  subtitle,
  points,
  showClosed = false,
}: {
  title: string;
  subtitle?: string;
  points: DayPoint[];
  showClosed?: boolean;
}) {
  const max = Math.max(
    1,
    ...points.map((p) => Math.max(p.count, showClosed ? p.closed || 0 : 0)),
  );
  const totalOpen = points.reduce((s, p) => s + p.count, 0);
  const totalClosed = points.reduce((s, p) => s + (p.closed || 0), 0);

  return (
    <section className="card trend-card">
      <div className="row" style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h2>{title}</h2>
          {subtitle ? <p className="muted">{subtitle}</p> : null}
        </div>
        <div className="trend-total">
          <strong>{totalOpen}</strong>
          <small>açılan</small>
          {showClosed ? (
            <>
              <strong className="trend-closed-num">{totalClosed}</strong>
              <small>kapanan</small>
            </>
          ) : null}
        </div>
      </div>
      {showClosed && (
        <div className="trend-legend">
          <span>
            <i className="lg-open" /> Açılan
          </span>
          <span>
            <i className="lg-closed" /> Kapanan
          </span>
        </div>
      )}
      <div className="trend-bars" role="img" aria-label={title}>
        {points.map((p) => (
          <div key={p.label} className="trend-col">
            <div className="trend-bar-wrap dual">
              {showClosed ? (
                <div
                  className="trend-bar closed"
                  style={{
                    height: `${Math.max(4, Math.round(((p.closed || 0) / max) * 100))}%`,
                  }}
                  title={`Kapanan ${p.label}: ${p.closed || 0}`}
                />
              ) : null}
              <div
                className="trend-bar"
                style={{ height: `${Math.max(4, Math.round((p.count / max) * 100))}%` }}
                title={`Açılan ${p.label}: ${p.count}`}
              />
            </div>
            <span className="trend-count">{p.count}{showClosed ? `/${p.closed || 0}` : ''}</span>
            <span className="trend-label">{p.label}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
