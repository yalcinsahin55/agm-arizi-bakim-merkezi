export default function TechnicalReport({ breakdown }: {
    breakdown: import('@/types').Breakdown;
}) {
    if (!breakdown.report && !breakdown.rootCause && !breakdown.correctiveAction)
        return null;
    return <div className="card" style={{ marginTop: 16 }}><h2>Teknik Rapor</h2><div className="report-block"><b>Kök Neden</b><p>{breakdown.rootCause || '—'}</p><b>Teknik Rapor</b><p>{breakdown.report || '—'}</p><b>Düzeltici Faaliyet</b><p>{breakdown.correctiveAction || '—'}</p></div></div>;
}
