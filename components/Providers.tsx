'use client';

import type { ReactNode } from 'react';
import { ToastProvider } from '@/components/ui/Toaster';

export default function Providers({ children }: { children: ReactNode }) {
  return <ToastProvider>{children}</ToastProvider>;
}
