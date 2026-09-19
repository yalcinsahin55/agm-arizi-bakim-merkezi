'use client';

import { useEffect, useState } from 'react';

const STORAGE_KEY = 'agm-theme';

type Theme = 'dark' | 'light';

function applyTheme(theme: Theme) {
  document.documentElement.setAttribute('data-theme', theme);
}

/**
 * Sahada güneş ışığı altında koyu tema okunması zor olabiliyor; bu düğme
 * kullanıcının açık temaya geçmesini sağlar. Tercih localStorage'da saklanır,
 * hiçbir şey seçilmediyse sistem tercihi (prefers-color-scheme) geçerli olur
 * — bkz. app/layout.tsx'teki FOUC-önleyici inline script.
 */
export default function ThemeToggle() {
  const [theme, setTheme] = useState<Theme | null>(null);

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY) as Theme | null;
    if (stored === 'light' || stored === 'dark') {
      setTheme(stored);
      return;
    }
    const prefersLight = window.matchMedia('(prefers-color-scheme: light)').matches;
    setTheme(prefersLight ? 'light' : 'dark');
  }, []);

  function toggle() {
    const next: Theme = theme === 'light' ? 'dark' : 'light';
    setTheme(next);
    window.localStorage.setItem(STORAGE_KEY, next);
    applyTheme(next);
  }

  if (theme === null) return null;

  return (
    <button
      type="button"
      className="theme-toggle-btn"
      onClick={toggle}
      title={theme === 'light' ? 'Koyu temaya geç' : 'Açık temaya geç (güneş ışığında daha okunaklı)'}
      aria-label={theme === 'light' ? 'Koyu temaya geç' : 'Açık temaya geç'}
    >
      {theme === 'light' ? (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
        </svg>
      ) : (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="4.5" />
          <path d="M12 3v2M12 19v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M3 12h2M19 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4" />
        </svg>
      )}
    </button>
  );
}
