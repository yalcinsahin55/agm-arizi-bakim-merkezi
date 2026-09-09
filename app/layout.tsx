import './globals.css';
import Link from 'next/link';
import { getCurrentUser } from '@/lib/auth';
import NotificationPulse from '@/components/NotificationPulse';
import LogoutButton from '@/components/LogoutButton';
export const metadata = {
    title: 'Avcıkoru Santrali Arızi Bakım Merkezi',
    description: 'Arıza yönetimi ve teknisyen müdahale merkezi',
};
export default async function Layout({ children }: {
    children: React.ReactNode;
}) {
    const u = await getCurrentUser();
    return <div className="shell"><header className="top"><div className="brand">AGM <span>Arızi Bakım Merkezi</span><small>BREAKDOWN CONTROL</small></div>{u ? <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}><span>{u.name} · {u.role}</span><LogoutButton /></div> : <Link className="btn primary" href="/giris">Giriş Yap</Link>}</header>{u ? <div className="layout"><aside className="side"><nav className="nav">{(u.role === 'yonetici' || u.role === 'operator') && <Link className="btn primary" style={{ display: 'block', width: '100%', boxSizing: 'border-box', textAlign: 'center', marginBottom: 14 }} href="/arizalar/yeni">+ Yeni Arıza Aç</Link>}{u.role === 'yonetici' && <><Link href="/">Kontrol Merkezi</Link><Link href="/arizalar">Arıza Kayıtları</Link><Link href="/raporlar">Gelişmiş Raporlar</Link><Link href="/motorlar">Motor Envanteri</Link><Link href="/yonetim/kategoriler">Kategoriler</Link><Link href="/yonetim/kullanicilar">Kullanıcılar</Link><Link href="/yonetim/oturumlar">Aktif Oturumlar</Link><Link href="/yonetim/audit">Denetim Günlüğü</Link></>}
        {u.role === 'goruntuleyici' && <><Link href="/">Genel Görünüm</Link><Link href="/arizalar">Arıza Kayıtları</Link><Link href="/raporlar">Raporlama Merkezi</Link><Link href="/motorlar">Motor Envanteri</Link></>}{u.role === 'operator' && <><Link href="/">Arıza Merkezi</Link><Link href="/arizalar">Arıza Kayıtlarım</Link></>}{u.role === 'teknisyen' && <><Link href="/">Teknisyen Merkezi</Link><Link href="/teknisyen">Atanan Arızalar</Link></>}{u.role !== 'goruntuleyici' && <Link href="/bildirimler">Bildirimler</Link>}</nav></aside><main className="main">{children}</main><NotificationPulse /></div> : <div className="login"><div className="card"><h1 className="page-title">Oturum bulunamadı</h1><p className="muted">Bu sayfayı görüntülemek için giriş yapmanız gerekiyor.</p><Link className="btn primary" href="/giris">Giriş yap</Link></div></div>}</div>;
}
