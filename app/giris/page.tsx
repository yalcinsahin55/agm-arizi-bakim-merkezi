'use client';

import { useState } from 'react';
import Logo from '@/components/Logo';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const x = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      if (x.ok) {
        const raw = new URLSearchParams(window.location.search).get('next') || '/';
        const next =
          raw.startsWith('/') && !raw.startsWith('//') && !raw.startsWith('/giris') ? raw : '/';
        window.location.assign(next);
      } else {
        const j = await x.json().catch(() => ({}));
        setError(j.error || 'Giriş başarısız');
      }
    } catch {
      setError('Bağlantı hatası. Tekrar deneyin.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="login-screen">
      <div className="login-card">
        <div className="login-brand">
          <Logo size={56} className="login-logo" />
          <div>
            <div className="login-eyebrow">AVCIKORU SANTRALİ</div>
            <h1 className="login-title">AGM Arızi Bakım</h1>
            <p className="login-sub">Arıza yönetimi · Teknisyen müdahale merkezi</p>
          </div>
        </div>

        <form className="form login-form" onSubmit={submit}>
          <label>
            Kullanıcı adı (telefon)
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="text"
              inputMode="tel"
              placeholder="05xx xxx xx xx"
              required
              autoComplete="username"
              autoCapitalize="off"
            />
          </label>
          <label>
            Şifre
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type="password"
              required
              autoComplete="current-password"
              placeholder="••••••••"
            />
          </label>
          {error ? <div className="form-error">{error}</div> : null}
          <button className="btn primary login-submit" disabled={busy} type="submit">
            {busy ? 'Giriş yapılıyor…' : 'Giriş yap'}
          </button>
        </form>

        <p className="login-foot muted">
          Yetkili personel içindir. Sorun yaşarsanız sistem yöneticinize başvurun.
        </p>
      </div>
    </div>
  );
}
