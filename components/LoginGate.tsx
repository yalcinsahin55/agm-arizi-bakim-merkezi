'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import Logo from '@/components/Logo';

export default function LoginGate({ children }: { children: React.ReactNode }) {
  const p = usePathname();
  const r = useRouter();

  useEffect(() => {
    if (p === '/') r.replace('/giris');
  }, [p, r]);

  if (p === '/giris') return <>{children}</>;

  return (
    <div className="login-screen">
      <div className="login-card">
        <div className="login-brand">
          <Logo size={56} className="login-logo" />
          <div>
            <div className="login-eyebrow">OTURUM</div>
            <h1 className="login-title">Giriş gerekli</h1>
            <p className="login-sub">Bu sayfayı görmek için oturum açmalısınız.</p>
          </div>
        </div>
        <Link className="btn primary login-submit" href={`/giris?next=${encodeURIComponent(p || '/')}`}>
          Giriş yap
        </Link>
      </div>
    </div>
  );
}
