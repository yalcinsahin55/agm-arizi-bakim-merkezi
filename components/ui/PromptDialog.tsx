'use client';

import { useEffect, useRef, useState } from 'react';

type Props = {
  open: boolean;
  title: string;
  description?: string;
  label?: string;
  initialValue?: string;
  placeholder?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  busy?: boolean;
  onConfirm: (value: string) => void;
  onCancel: () => void;
};

export default function PromptDialog({
  open,
  title,
  description,
  label,
  initialValue = '',
  placeholder,
  confirmLabel = 'Kaydet',
  cancelLabel = 'Vazgeç',
  busy = false,
  onConfirm,
  onCancel,
}: Props) {
  const [value, setValue] = useState(initialValue);
  const [prevOpen, setPrevOpen] = useState(open);
  const inputRef = useRef<HTMLInputElement>(null);

  // "open" false -> true geçişinde değeri sıfırlamak için: bunu bir efekt
  // yerine render sırasında yapıyoruz (React'in "adjusting state when a prop
  // changes" deseni) — bir efekt içinden senkron setState çağırmak
  // kademeli (cascading) render'lara yol açabileceğinden önerilmiyor.
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) setValue(initialValue);
  }

  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    }, 10);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !busy) onCancel();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      clearTimeout(t);
      window.removeEventListener('keydown', onKey);
    };
  }, [open, busy, onCancel]);

  if (!open) return null;

  const trimmed = value.trim();
  const submit = () => {
    if (!trimmed || busy) return;
    onConfirm(trimmed);
  };

  return (
    <div className="modal-backdrop" role="presentation" onClick={() => !busy && onCancel()}>
      <div
        className="modal-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="prompt-title"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="prompt-title" className="modal-title">
          {title}
        </h2>
        {description ? <p className="muted modal-desc">{description}</p> : null}
        <form
          className="form"
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
        >
          <label>
            {label}
            <input
              ref={inputRef}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder={placeholder}
              disabled={busy}
            />
          </label>
          <div className="row modal-actions">
            <button type="button" className="btn" disabled={busy} onClick={onCancel}>
              {cancelLabel}
            </button>
            <button type="submit" className="btn primary" disabled={busy || !trimmed}>
              {busy ? 'Kaydediliyor…' : confirmLabel}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
