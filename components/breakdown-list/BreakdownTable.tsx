import Link from 'next/link';
import type { User } from '@/types';
import BreakdownTableRow from './BreakdownTableRow';
import { canEditRow, canRemoveRow, type BreakdownRow } from './helpers';

export default function BreakdownTable({
  filtered,
  total,
  user,
  hasActiveFilter,
  busyId,
  onRequestRemove,
}: {
  filtered: BreakdownRow[];
  total: number;
  user: Pick<User, '_id' | 'role' | 'name'>;
  hasActiveFilter: boolean;
  busyId: string | null;
  onRequestRemove: (id: string, code: string) => void;
}) {
  return (
    <div className="card" style={{ marginTop: 14, overflowX: 'auto' }}>
      {filtered.length === 0 ? (
        <div className="empty">
          <h2>Kayıt bulunamadı</h2>
          <p className="muted">
            {hasActiveFilter
              ? 'Filtrelere uyan arıza yok. Aramayı veya filtreyi temizleyin.'
              : 'Henüz arıza kaydı yok.'}
          </p>
          {(user.role === 'yonetici' || user.role === 'operator') && (
            <Link className="btn primary" href="/arizalar/yeni" style={{ marginTop: 12 }}>
              + Yeni Arıza Aç
            </Link>
          )}
        </div>
      ) : (
        <table className="table table-actions">
          <thead>
            <tr>
              <th>Kod</th>
              <th>Motor</th>
              <th>Kategori</th>
              <th>Öncelik</th>
              <th>Durum</th>
              <th>Teknisyen</th>
              <th>Zaman</th>
              <th style={{ textAlign: 'right' }}>İşlem</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((row) => {
              const id = String(row._id);
              return (
                <BreakdownTableRow
                  key={id}
                  row={row}
                  canEdit={canEditRow(row, user)}
                  canRemove={canRemoveRow(row, user)}
                  isManager={user.role === 'yonetici'}
                  busy={busyId === id}
                  onRequestRemove={onRequestRemove}
                />
              );
            })}
          </tbody>
        </table>
      )}
      <div className="list-footer muted">
        {filtered.length} / {total} kayıt gösteriliyor
      </div>
    </div>
  );
}
