'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

type SearchResult = {
  type: 'breakdown' | 'motor' | 'user';
  id: string;
  title: string;
  subtitle?: string;
  href: string;
};

const typeLabel: Record<SearchResult['type'], string> = {
  breakdown: 'Arıza',
  motor: 'Ekipman',
  user: 'Kullanıcı',
};

export default function GlobalSearch() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [prevOpen, setPrevOpen] = useState(false);
  const [q, setQ] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Modal kapandığında arama kutusunu sıfırlamak için: bir efekt içinden
  // senkron setState çağırmak yerine (kademeli render riski), React'in
  // "adjusting state when a prop changes" desenine uygun olarak bunu
  // render sırasında yapıyoruz.
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (!open) {
      setQ('');
      setResults([]);
    }
  }

  // Ctrl/Cmd+K ile her yerden açılabilir; Escape ile kapanır.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen((v) => !v);
      } else if (e.key === 'Escape') {
        setOpen(false);
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    if (open) {
      const t = setTimeout(() => inputRef.current?.focus(), 10);
      return () => clearTimeout(t);
    }
  }, [open]);

  // Sorgu 2 karakterin altına düştüğünde sonuç listesini sıfırlamak için:
  // bunu bir efekt yerine render sırasında yapıyoruz (bkz. "adjusting state
  // when a prop changes" deseni) — efekt içinden senkron setState kademeli
  // render riski taşır.
  const trimmedQ = q.trim();
  const [prevTrimmedQ, setPrevTrimmedQ] = useState(trimmedQ);
  if (trimmedQ !== prevTrimmedQ) {
    setPrevTrimmedQ(trimmedQ);
    if (trimmedQ.length < 2) setResults([]);
  }

  useEffect(() => {
    if (trimmedQ.length < 2) return;
    let cancelled = false;
    const t = setTimeout(() => {
      if (cancelled) return;
      setLoading(true);
      fetch(`/api/search?q=${encodeURIComponent(trimmedQ)}`, { cache: 'no-store' })
        .then((r) => (r.ok ? r.json() : { results: [] }))
        .then((j) => {
          if (!cancelled) setResults(j.results || []);
        })
        .catch(() => {
          if (!cancelled) setResults([]);
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    }, 200);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [trimmedQ]);

  function go(href: string) {
    setOpen(false);
    router.push(href);
  }

  return (
    <>
      <button
        type="button"
        className="global-search-trigger"
        onClick={() => setOpen(true)}
        aria-label="Ara"
        title="Ara (Ctrl+K)"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="7" />
          <path d="m21 21-4.35-4.35" />
        </svg>
        <span className="global-search-hint">Ara</span>
        <kbd className="global-search-kbd">Ctrl K</kbd>
      </button>

      {open && (
        <div className="modal-backdrop" role="presentation" onClick={() => setOpen(false)}>
          <div
            className="modal-panel search-panel"
            role="dialog"
            aria-modal="true"
            onClick={(e) => e.stopPropagation()}
          >
            <input
              ref={inputRef}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Arıza kodu, motor veya kullanıcı ara…"
              className="search-input"
            />
            <div className="search-results">
              {loading && <div className="empty-compact">Aranıyor…</div>}
              {!loading && q.trim().length >= 2 && results.length === 0 && (
                <div className="empty-compact">Sonuç bulunamadı.</div>
              )}
              {!loading &&
                results.map((r) => (
                  <button
                    key={`${r.type}:${r.id}`}
                    type="button"
                    className="search-result-row"
                    onClick={() => go(r.href)}
                  >
                    <span className="badge search-result-type">{typeLabel[r.type]}</span>
                    <span className="search-result-text">
                      <b>{r.title}</b>
                      {r.subtitle && <small>{r.subtitle}</small>}
                    </span>
                  </button>
                ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
