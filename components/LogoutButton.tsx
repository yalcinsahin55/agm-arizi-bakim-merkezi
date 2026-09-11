'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LogoutButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function logout() {
    if (busy) return;
    setBusy(true);
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch {
      /* ignore */
    }
    router.push('/giris');
    router.refresh();
  }

  return (
    <button type="button" className="btn btn-sm logout-btn" disabled={busy} onClick={logout}>
      {busy ? '…' : 'Çıkış'}
    </button>
  );
}
