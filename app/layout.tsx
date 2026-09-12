import './globals.css';
import Link from 'next/link';
import { DM_Sans, Manrope, JetBrains_Mono } from 'next/font/google';

const fontSans = DM_Sans({
  subsets: ['latin', 'latin-ext'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-sans',
  display: 'swap',
});

const fontDisplay = Manrope({
  subsets: ['latin', 'latin-ext'],
  weight: ['500', '600', '700', '800'],
  variable: '--font-display',
  display: 'swap',
});

const fontMono = JetBrains_Mono({
  subsets: ['latin', 'latin-ext'],
  weight: ['500', '600', '700'],
  variable: '--font-mono',
  display: 'swap',
});

import type { Metadata, Viewport } from 'next';
import { getCurrentUser } from '@/lib/auth';
import NotificationPulse from '@/components/NotificationPulse';
import LogoutButton from '@/components/LogoutButton';
import LoginGate from '@/components/LoginGate';
import Providers from '@/components/Providers';
import MobileNav from '@/components/MobileNav';
import PwaRegister from '@/components/PwaRegister';
import Logo from '@/components/Logo';
import GlobalSearch from '@/components/GlobalSearch';

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
    <html lang="tr" className={`${fontSans.variable} ${fontDisplay.variable} ${fontMono.variable}`}>
      <body className="app-body">
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
                  <GlobalSearch />
                  <Link href="/profil" className="account-btn" title="Hesabım" aria-label="Hesabım">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="8" r="3.4" />
                      <path d="M5 20c0-3.6 3.1-6 7-6s7 2.4 7 6" />
                    </svg>
                  </Link>
                  <Link href="/profil" className="top-user-meta" title="Hesabım">
                    <span className="top-user-name">{u.name}</span>
                    <span className="top-user-role">{roleLabel[u.role] || u.role}</span>
                  </Link>
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
                        <Link href="/motorlar">Ekipman Envanteri</Link>
                        <Link href="/yonetim/kategoriler">Kategoriler</Link>
                        <Link href="/yonetim/kullanicilar">Kullanıcılar</Link>
                        <Link href="/yonetim/nobet">Nöbetçi Planı</Link>
                        <Link href="/yonetim/oturumlar">Aktif Oturumlar</Link>
                        <Link href="/yonetim/audit">Denetim Günlüğü</Link>
                      </>
                    )}
                    {u.role === 'goruntuleyici' && (
                      <>
                        <Link href="/">Genel Görünüm</Link>
                        <Link href="/arizalar">Arıza Kayıtları</Link>
                        <Link href="/raporlar">Raporlama Merkezi</Link>
                        <Link href="/motorlar">Ekipman Envanteri</Link>
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
                    <Link href="/profil">Hesabım</Link>
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
