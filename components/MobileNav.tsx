'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { Role } from '@/types';

type Item = {
  href: string;
  label: string;
  match?: string[];
  icon: 'home' | 'list' | 'plus' | 'chart' | 'bell' | 'queue' | 'motor' | 'more';
};

type ExtraLink = { href: string; label: string };

function Icon({ name, active }: { name: Item['icon']; active: boolean }) {
  const stroke = active ? '#f0b429' : '#91a4ac';
  const common = {
    width: 22,
    height: 22,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke,
    strokeWidth: 1.8,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  };
  switch (name) {
    case 'home':
      return (
        <svg {...common}>
          <path d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1v-9.5z" />
        </svg>
      );
    case 'list':
      return (
        <svg {...common}>
          <path d="M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01" />
        </svg>
      );
    case 'plus':
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="9" />
          <path d="M12 8v8M8 12h8" />
        </svg>
      );
    case 'chart':
      return (
        <svg {...common}>
          <path d="M4 19h16M7 16V9M12 16V5M17 16v-6" />
        </svg>
      );
    case 'bell':
      return (
        <svg {...common}>
          <path d="M6 9a6 6 0 1 1 12 0c0 7 3 7 3 7H3s3 0 3-7" />
          <path d="M10 19a2 2 0 0 0 4 0" />
        </svg>
      );
    case 'queue':
      return (
        <svg {...common}>
          <rect x="4" y="5" width="16" height="4" rx="1" />
          <rect x="4" y="11" width="16" height="4" rx="1" />
          <rect x="4" y="17" width="12" height="3" rx="1" />
        </svg>
      );
    case 'motor':
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="3" />
          <path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1 7 17M17 7l2.1-2.1" />
        </svg>
      );
    case 'more':
      return (
        <svg {...common}>
          <circle cx="5" cy="12" r="1.6" fill={stroke} />
          <circle cx="12" cy="12" r="1.6" fill={stroke} />
          <circle cx="19" cy="12" r="1.6" fill={stroke} />
        </svg>
      );
  }
}

function itemsFor(role: Role): Item[] {
  if (role === 'teknisyen') {
    return [
      { href: '/', label: 'Özet', icon: 'home' },
      { href: '/teknisyen', label: 'Kuyruk', icon: 'queue', match: ['/teknisyen', '/arizalar'] },
      { href: '/bildirimler', label: 'Bildirim', icon: 'bell' },
    ];
  }
  if (role === 'operator') {
    return [
      { href: '/', label: 'Özet', icon: 'home' },
      { href: '/arizalar', label: 'Arızalar', icon: 'list' },
      { href: '/arizalar/yeni', label: 'Yeni', icon: 'plus' },
      { href: '/bildirimler', label: 'Bildirim', icon: 'bell' },
    ];
  }
  if (role === 'goruntuleyici') {
    return [
      { href: '/', label: 'Özet', icon: 'home' },
      { href: '/arizalar', label: 'Arızalar', icon: 'list' },
      { href: '/raporlar', label: 'Rapor', icon: 'chart' },
      { href: '/motorlar', label: 'Motor', icon: 'motor' },
    ];
  }
  return [
    { href: '/', label: 'Özet', icon: 'home' },
    { href: '/arizalar', label: 'Arızalar', icon: 'list' },
    { href: '/arizalar/yeni', label: 'Yeni', icon: 'plus' },
    { href: '/raporlar', label: 'Rapor', icon: 'chart' },
    { href: '/bildirimler', label: 'Bildirim', icon: 'bell' },
  ];
}

// Masaüstü kenar menüsünde bulunup mobil alt menüde yer almayan bağlantılar.
// Bunlar "Diğer" panelinde gösterilir.
function extraLinksFor(role: Role): ExtraLink[] {
  if (role === 'yonetici') {
    return [
      { href: '/yonetim/kullanicilar', label: 'Kullanıcılar' },
      { href: '/yonetim/nobet', label: 'Nöbetçi Planı' },
      { href: '/yonetim/kategoriler', label: 'Kategoriler' },
      { href: '/motorlar', label: 'Ekipman Envanteri' },
      { href: '/arizalar/arsiv', label: 'Arşiv' },
      { href: '/yonetim/audit', label: 'Denetim Günlüğü' },
      { href: '/yonetim/oturumlar', label: 'Aktif Oturumlar' },
      { href: '/profil', label: 'Hesabım' },
    ];
  }
  if (role === 'goruntuleyici') {
    return [{ href: '/motorlar', label: 'Ekipman Envanteri' }, { href: '/profil', label: 'Hesabım' }];
  }
  if (role === 'teknisyen') {
    return [{ href: '/raporlar', label: 'Raporlar' }, { href: '/profil', label: 'Hesabım' }];
  }
  return [{ href: '/profil', label: 'Hesabım' }];
}

export default function MobileNav({ role }: { role: Role }) {
  const pathname = usePathname() || '/';
  const items = itemsFor(role);
  const extraLinks = extraLinksFor(role);
  const [moreOpen, setMoreOpen] = useState(false);

  function active(item: Item) {
    if (item.match)
      return item.match.some((m) => pathname === m || pathname.startsWith(m + '/'));
    if (item.href === '/') return pathname === '/';
    return pathname === item.href || pathname.startsWith(item.href + '/');
  }

  function openSearch() {
    setMoreOpen(false);
    window.dispatchEvent(new Event('agm:open-search'));
  }

  return (
    <>
      <nav className="mobile-nav" aria-label="Mobil menü">
        {items.map((item) => {
          const isActive = active(item);
          return (
            <Link
              key={item.href + item.label}
              href={item.href}
              className={`mobile-nav-item ${isActive ? 'active' : ''}`}
            >
              <Icon name={item.icon} active={isActive} />
              <span>{item.label}</span>
            </Link>
          );
        })}
        <button
          type="button"
          className={`mobile-nav-item mobile-nav-more-trigger ${moreOpen ? 'active' : ''}`}
          onClick={() => setMoreOpen(true)}
        >
          <Icon name="more" active={moreOpen} />
          <span>Diğer</span>
        </button>
      </nav>

      {moreOpen && (
        <div
          className="modal-backdrop mobile-more-backdrop"
          role="presentation"
          onClick={() => setMoreOpen(false)}
        >
          <div
            className="mobile-more-sheet"
            role="dialog"
            aria-modal="true"
            aria-label="Diğer menü"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mobile-more-handle" />
            <button type="button" className="mobile-more-row mobile-more-search" onClick={openSearch}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="7" />
                <path d="m21 21-4.35-4.35" />
              </svg>
              Ara
            </button>
            {extraLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="mobile-more-row"
                onClick={() => setMoreOpen(false)}
              >
                {link.label}
              </Link>
            ))}
            <button type="button" className="mobile-more-row mobile-more-cancel" onClick={() => setMoreOpen(false)}>
              Kapat
            </button>
          </div>
        </div>
      )}
    </>
  );
}
