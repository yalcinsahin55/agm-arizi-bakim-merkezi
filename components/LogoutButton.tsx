'use client';

import { useState } from 'react';

export default function LogoutButton() {
  const [busy, setBusy] = useState(false);

  async function logout() {
    if (busy) return;
    setBusy(true);
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch {
      /* ignore */
    }
    window.location.href = '/giris';
  }

  return (
    <button type="button" className="btn btn-sm logout-btn" disabled={busy} onClick={logout}>
      {busy ? '…' : 'Çıkış'}
    </button>
  );
}
