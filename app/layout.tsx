import './globals.css';
import Link from 'next/link';
import type { Metadata, Viewport } from 'next';
import { getCurrentUser } from '@/lib/auth';
import NotificationPulse from '@/components/NotificationPulse';
import LogoutButton from '@/components/LogoutButton';
import LoginGate from '@/components/LoginGate';
import Providers from '@/components/Providers';
import MobileNav from '@/components/MobileNav';
import PwaRegister from '@/components/PwaRegister';
import Logo from '@/components/Logo';

export const metadata: Metadata = {
  title: 'Avcıkoru Santrali Arızi Bakım Merkezi',
  description: 'Arıza yönetimi ve teknisyen müdahale merkezi',
  applicationName: 'AGM Arızi',
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'AGM Arızi',
  },
  icons: {
    icon: [
      { url: '/favicon.ico' },
      { url: '/icon-32.png', sizes: '32x32', type: 'image/png' },
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [{ url: '/apple-touch-icon.png', sizes: '180x180' }],
  },
  other: {
    'mobile-web-app-capable': 'yes',
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: dark)', color: '#0b151a' },
    { media: '(prefers-color-scheme: light)', color: '#0b151a' },
  ],
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  viewportFit: 'cover',
};

const roleLabel: Record<string, string> = {
  yonetici: 'Yönetici',
  teknisyen: 'Teknisyen',
  operator: 'Operatör',
  goruntuleyici: 'Görüntüleyici',
};

export default async function Layout({ children }: { children: React.ReactNode }) {
  const u = await getCurrentUser();
  return (
    <html lang="tr">
      <body>
        <Providers>
          <div className="shell">
            <header className="top">
              <Link href={u ? '/' : '/giris'} className="brand">
                <Logo size={32} className="brand-icon" />
                <span className="brand-text">
                  <span className="brand-name">AGM Arızi</span>
                  <span className="brand-tag">Bakım Merkezi</span>
                </span>
              </Link>
              {u ? (
                <div className="top-user">
                  <div className="top-user-meta">
                    <span className="top-user-name">{u.name}</span>
                    <span className="top-user-role">{roleLabel[u.role] || u.role}</span>
                  </div>
                  <LogoutButton />
                </div>
              ) : (
                <Link className="btn primary btn-sm" href="/giris">
                  Giriş
                </Link>
              )}
            </header>
            {u ? (
              <div className="layout">
                <aside className="side">
                  <nav className="nav">
                    {(u.role === 'yonetici' || u.role === 'operator') && (
                      <Link className="btn primary side-cta" href="/arizalar/yeni">
                        + Yeni Arıza Aç
                      </Link>
                    )}
                    {u.role === 'yonetici' && (
                      <>
                        <Link href="/">Kontrol Merkezi</Link>
                        <Link href="/arizalar">Arıza Kayıtları</Link>
                        <Link href="/arizalar/arsiv">Arşiv</Link>
                        <Link href="/raporlar">Gelişmiş Raporlar</Link>
                        <Link href="/motorlar">Motor Envanteri</Link>
                        <Link href="/yonetim/kategoriler">Kategoriler</Link>
                        <Link href="/yonetim/kullanicilar">Kullanıcılar</Link>
                        <Link href="/yonetim/oturumlar">Aktif Oturumlar</Link>
                        <Link href="/yonetim/audit">Denetim Günlüğü</Link>
                      </>
                    )}
                    {u.role === 'goruntuleyici' && (
                      <>
                        <Link href="/">Genel Görünüm</Link>
                        <Link href="/arizalar">Arıza Kayıtları</Link>
                        <Link href="/raporlar">Raporlama Merkezi</Link>
                        <Link href="/motorlar">Motor Envanteri</Link>
                      </>
                    )}
                    {u.role === 'operator' && (
                      <>
                        <Link href="/">Arıza Merkezi</Link>
                        <Link href="/arizalar">Arıza Kayıtlarım</Link>
                      </>
                    )}
                    {u.role === 'teknisyen' && (
                      <>
                        <Link href="/">Teknisyen Merkezi</Link>
                        <Link href="/teknisyen">Atanan Arızalar</Link>
                      </>
                    )}
                    {u.role !== 'goruntuleyici' && <Link href="/bildirimler">Bildirimler</Link>}
                  </nav>
                </aside>
                <main className="main">{children}</main>
                <NotificationPulse />
                <MobileNav role={u.role} />
              </div>
            ) : (
              <LoginGate>{children}</LoginGate>
            )}
            <PwaRegister />
          </div>
        </Providers>
      </body>
    </html>
  );
}
