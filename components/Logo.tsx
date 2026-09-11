'use client';

import { useId } from 'react';

type LogoProps = {
  size?: number;
  className?: string;
};

/**
 * Marka logosu — satır içi SVG olarak render edilir (public/logo.png'ye
 * bağımlı DEĞİL). Bu sayede dağıtım/önbellek/yol sorunları logonun
 * kaybolmasına asla yol açmaz; ayrıca her ekran yoğunluğunda keskin görünür.
 */
export default function Logo({ size = 40, className }: LogoProps) {
  const gradId = useId();
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      className={className}
      role="img"
      aria-label="AGM"
      style={{ flex: '0 0 auto' }}
    >
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#f9d67a" />
          <stop offset="100%" stopColor="#e0930f" />
        </linearGradient>
      </defs>
      <rect x="1.5" y="1.5" width="61" height="61" rx="16" fill="#0d171c" stroke="#33474f" strokeWidth="1.5" />
      <text
        x="32"
        y="30"
        fontFamily="'Barlow Condensed', Arial, sans-serif"
        fontWeight={700}
        fontSize="21"
        letterSpacing="0.5"
        fill={`url(#${gradId})`}
        textAnchor="middle"
      >
        AGM
      </text>
      <path
        d="M17 39 L25.5 39 L28.5 33.5 L34 45.5 L37 39 L47 39"
        fill="none"
        stroke={`url(#${gradId})`}
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
