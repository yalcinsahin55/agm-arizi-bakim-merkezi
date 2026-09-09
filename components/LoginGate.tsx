'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';
export default function LoginGate({ children }: {
    children: React.ReactNode;
}) {
    const p = usePathname();
    const r = useRouter();
    useEffect(() => {
        if (p === '/')
            r.replace('/giris');
    }, [p]);
    if (p === '/giris')
        return <>{children}</>;
    return <div className="login"><div className="card"><h1 className="page-title">Oturum bulunamadı</h1><p className="muted">Bu sayfayı görüntülemek için giriş yapmanız gerekiyor.</p><Link className="btn primary" href={`/giris?next=${encodeURIComponent(p || '/')}`}>Giriş yap</Link></div></div>;
}
