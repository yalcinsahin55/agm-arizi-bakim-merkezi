'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function LogoutButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function logout() {
    if (busy) return;
    if (!window.confirm('Çıkış yapmak istediğine emin misin?')) return;
    setBusy(true);
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch {}
    window.location.href = '/giris';
  }

  return (
    <button
      onClick={logout}
      disabled={busy}
      style={{
        padding: '6px 12px',
        borderRadius: 8,
        border: '1px solid #c62828',
        background: busy ? '#eeeeee' : '#ffffff',
        color: '#c62828',
        cursor: busy ? 'wait' : 'pointer',
        fontSize: 13,
        fontWeight: 600,
      }}
    >
      {busy ? 'Çıkılıyor...' : 'Çıkış Yap'}
    </button>
  );
}
