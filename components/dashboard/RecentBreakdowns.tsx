import Link from 'next/link';
import { priorityLabel, statusLabel } from '@/lib/labels';

export default function RecentBreakdowns({ recent }: { recent: import('@/types').Breakdown[] }) {
  return (
    <section className="card">
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <div>
          <h2>Son Arıza Kayıtları</h2>
          <p className="muted">Öncelik ve süreç durumu</p>
        </div>
        <Link className="btn" href="/arizalar">
          Tümünü Gör
        </Link>
      </div>
      {recent.length === 0 ? (
        <div className="empty-compact" style={{ marginTop: 14 }}>
          Henüz arıza kaydı yok.
        </div>
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Kod</th>
                <th>Motor</th>
                <th>Öncelik</th>
                <th>Durum</th>
                <th>Teknisyen</th>
              </tr>
            </thead>
            <tbody>
              {recent.map((x: import('@/types').Breakdown) => (
                <tr key={String(x._id)}>
                  <td>
                    <Link href={`/arizalar/${x._id}`}>
                      <b>{x.code}</b>
                    </Link>
                  </td>
                  <td>
                    {x.motorName}
                    <small className="cell-sub">{x.categoryName}</small>
                  </td>
                  <td>
                    <span className={`badge priority-${x.priority}`}>
                      {priorityLabel[x.priority] || x.priority}
                    </span>
                  </td>
                  <td>
                    <span className="status-chip">
                      <i className={`dot ${x.status}`} />
                      {statusLabel[x.status] || x.status}
                    </span>
                  </td>
                  <td>{x.assignedTechnicianName || 'Atanmadı'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
