'use client';

import { useState, type FormEvent } from 'react';
import { useToast } from '@/components/ui/Toaster';

export default function ChangePasswordForm() {
  const toast = useToast();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (newPassword.length < 8) {
      toast.warning('Şifre çok kısa', 'Yeni şifre en az 8 karakter olmalı.');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.warning('Şifreler eşleşmiyor', 'Yeni şifre ve tekrarı aynı olmalı.');
      return;
    }
    setBusy(true);
    try {
      const r = await fetch('/api/profile/password', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) {
        toast.error('Şifre değiştirilemedi', j.error || 'Bir hata oluştu');
        return;
      }
      toast.success('Şifreniz güncellendi', 'Bir sonraki girişte yeni şifrenizi kullanın.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch {
      toast.error('Bağlantı hatası', 'İstek tamamlanamadı.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="form" onSubmit={submit}>
      <label>
        Mevcut Şifre
        <input
          type="password"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          autoComplete="current-password"
          required
        />
      </label>
      <label>
        Yeni Şifre
        <input
          type="password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          autoComplete="new-password"
          minLength={8}
          placeholder="En az 8 karakter"
          required
        />
      </label>
      <label>
        Yeni Şifre (Tekrar)
        <input
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          autoComplete="new-password"
          minLength={8}
          required
        />
      </label>
      <div className="row">
        <button className="btn primary" type="submit" disabled={busy}>
          {busy ? 'Kaydediliyor…' : 'Şifreyi Güncelle'}
        </button>
      </div>
    </form>
  );
}
