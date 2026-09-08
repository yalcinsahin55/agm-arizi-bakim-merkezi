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
        if (x.ok)
            r.push('/');
        else
            setError((await x.json()).error || 'Giriş başarısız');
    }
    return <div className="login"><div className="card"><h1 className="page-title">Giriş</h1><form className="form" onSubmit={submit}><label>E-posta<input value={email} onChange={e => setEmail(e.target.value)} type="email" required/></label><label>Şifre<input value={password} onChange={e => setPassword(e.target.value)} type="password" required/></label>{error && <div className="priority-critical">{error}</div>}<button className="btn primary">Giriş yap</button></form></div></div>;
}

