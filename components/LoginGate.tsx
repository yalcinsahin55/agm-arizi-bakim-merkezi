'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
export default function LoginGate() {
    const p = usePathname();
    return <div className="login"><div className="card"><h1 className="page-title">Oturum bulunamadı</h1><p className="muted">Bu sayfayı görüntülemek için giriş yapmanız gerekiyor.</p><Link className="btn primary" href={`/giris?next=${encodeURIComponent(p || '/')}`}>Giriş yap</Link></div></div>;
}
