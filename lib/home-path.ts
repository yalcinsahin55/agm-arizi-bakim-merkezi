import type { Role } from '@/types';

/** Role-based ana sayfa / dashboard yolu */
export function homePath(role?: Role | string | null): string {
  if (role === 'teknisyen') return '/teknisyen';
  return '/';
}
