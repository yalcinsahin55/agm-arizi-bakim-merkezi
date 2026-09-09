'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
export default function Login() {
    const [email, setEmail] = useState(''), [password, setPassword] = useState(''), [error, setError] = useState('');
    const r = useRouter();
    async function submit(e: React.FormEvent) {
        e.preventDefault();
        setError('');
        const x = await fetch('/api/auth/login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email, password }) });
        if (x.ok) {
            const next = new URLSearchParams(window.location.search).get('next') || '/';
            r.push(next);
        }
        else
            setError((await x.json()).error || 'Giriş başarısız');
    }
    return <div className="login"><div className="card"><h1 className="page-title">Giriş</h1><p className="muted">Kullanıcı adınız telefon numaranızdır. Eski hesaplar e-posta ile girmeye devam edebilir.</p><form className="form" onSubmit={submit}><label>Kullanıcı Adı (Telefon Numarası)<input value={email} onChange={e => setEmail(e.target.value)} type="text" inputMode="tel" placeholder="0535 027 88 55" required autoComplete="username"/></label><label>Şifre<input value={password} onChange={e => setPassword(e.target.value)} type="password" required autoComplete="current-password"/></label>{error && <div className="priority-critical">{error}</div>}<button className="btn primary">Giriş yap</button></form></div></div>;
}
