'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { Role } from '@/types';

type Item = {
  href: string;
  label: string;
  match?: string[];
  icon: 'home' | 'list' | 'plus' | 'chart' | 'bell' | 'queue' | 'motor';
};

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

export default function MobileNav({ role }: { role: Role }) {
  const pathname = usePathname() || '/';
  const items = itemsFor(role);

  function active(item: Item) {
    if (item.match)
      return item.match.some((m) => pathname === m || pathname.startsWith(m + '/'));
    if (item.href === '/') return pathname === '/';
    return pathname === item.href || pathname.startsWith(item.href + '/');
  }

  return (
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
    </nav>
  );
}
