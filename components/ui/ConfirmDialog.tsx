'use client';

import { useEffect, useRef } from 'react';

type Props = {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

export default function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'Onayla',
  cancelLabel = 'Vazgeç',
  danger = false,
  busy = false,
  onConfirm,
  onCancel,
}: Props) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !busy) onCancel();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, busy, onCancel]);

  if (!open) return null;

  return (
    <div className="modal-backdrop" role="presentation" onClick={() => !busy && onCancel()}>
      <div
        className="modal-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        ref={panelRef}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="confirm-title" className="modal-title">
          {title}
        </h2>
        {description ? <p className="muted modal-desc">{description}</p> : null}
        <div className="row modal-actions">
          <button type="button" className="btn" disabled={busy} onClick={onCancel}>
            {cancelLabel}
          </button>
          <button
            type="button"
            className={`btn ${danger ? 'danger' : 'primary'}`}
            disabled={busy}
            onClick={onConfirm}
          >
            {busy ? 'İşleniyor…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
