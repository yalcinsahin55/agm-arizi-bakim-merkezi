export default function Loading() {
  return (
    <div className="page-enter" style={{ padding: 8 }}>
      <div className="skeleton" style={{ width: 220, height: 14, marginBottom: 12 }} />
      <div className="skeleton" style={{ width: 320, height: 28, marginBottom: 20 }} />
      <div className="grid cards">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="card">
            <div className="skeleton" style={{ width: '40%', height: 12, marginBottom: 10 }} />
            <div className="skeleton" style={{ width: '70%', height: 22, marginBottom: 8 }} />
            <div className="skeleton" style={{ width: '55%', height: 12 }} />
          </div>
        ))}
      </div>
    </div>
  );
}
