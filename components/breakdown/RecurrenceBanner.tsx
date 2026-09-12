import Link from 'next/link';
import { recurrenceLabel, RECURRENCE_WINDOW_DAYS, type RecurrenceLevel } from '@/lib/recurrence';

export default function RecurrenceBanner({
  level,
  priorCount,
  motorName,
  categoryLabel,
  historyHref,
}: {
  level: Exclude<RecurrenceLevel, null>;
  priorCount: number;
  motorName: string;
  categoryLabel: string;
  historyHref: string;
}) {
  return (
    <div className={`recurrence-banner recurrence-${level}`} role="note">
      <span className="recurrence-icon" aria-hidden>
        {level === 'yuksek' ? '⚠️' : '↻'}
      </span>
      <div>
        <b>{recurrenceLabel[level]}</b>
        <p className="muted" style={{ margin: '2px 0 0' }}>
          {motorName} motorunda son {RECURRENCE_WINDOW_DAYS} günde {categoryLabel} kategorisinde bu
          kayıt dışında <b>{priorCount}</b> arıza daha açılmış. Kök nedeni kalıcı çözmek için geçmiş
          kayıtları incelemek isteyebilirsiniz.
        </p>
        <Link className="btn btn-sm" href={historyHref} style={{ marginTop: 8 }}>
          Geçmiş Kayıtları Gör
        </Link>
      </div>
    </div>
  );
}
