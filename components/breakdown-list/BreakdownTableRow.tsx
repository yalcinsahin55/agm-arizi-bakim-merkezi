import Link from 'next/link';
import { priorityLabel, relativeTime, statusLabel } from '@/lib/labels';
import type { BreakdownRow } from './helpers';

export default function BreakdownTableRow({
  row,
  canEdit,
  canRemove,
  isManager,
  busy,
  onRequestRemove,
}: {
  row: BreakdownRow;
  canEdit: boolean;
  canRemove: boolean;
  isManager: boolean;
  busy: boolean;
  onRequestRemove: (id: string, code: string) => void;
}) {
  const id = String(row._id);
  return (
    <tr>
      <td>
        <Link href={`/arizalar/${id}`}>
          <b>{row.code}</b>
        </Link>
        <small className="cell-sub">{row.title}</small>
      </td>
      <td>
        <Link href={`/motorlar/${row.motorId}`}>
          <b>{row.motorName}</b>
        </Link>
      </td>
      <td>
        {row.categoryName}
        {row.subcategoryName ? <small className="cell-sub">{row.subcategoryName}</small> : null}
      </td>
      <td>
        <span className={`badge priority-${row.priority}`}>
          {priorityLabel[row.priority] || row.priority}
        </span>
      </td>
      <td>
        <span className="status-chip">
          <i className={`dot ${row.status}`} />
          {statusLabel[row.status] || row.status}
        </span>
      </td>
      <td>{row.assignedTechnicianName || 'Atanmadı'}</td>
      <td>
        <span title={new Date(row.createdAt).toLocaleString('tr-TR')}>
          {relativeTime(row.createdAt)}
        </span>
      </td>
      <td>
        <div className="row-actions">
          <Link className="btn btn-sm" href={`/arizalar/${id}`}>
            Aç
          </Link>
          {canEdit && (
            <Link className="btn btn-sm" href={`/arizalar/${id}/duzenle`}>
              Düzenle
            </Link>
          )}
          {canRemove && (
            <button
              type="button"
              className="btn btn-sm danger"
              disabled={busy}
              onClick={() => onRequestRemove(id, row.code)}
            >
              {isManager ? 'Sil' : 'İptal'}
            </button>
          )}
        </div>
      </td>
    </tr>
  );
}
