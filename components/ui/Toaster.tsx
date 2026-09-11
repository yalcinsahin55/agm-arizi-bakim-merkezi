'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export type ToastItem = {
  id: string;
  type: ToastType;
  title: string;
  description?: string;
  duration?: number;
};

type ToastInput = Omit<ToastItem, 'id'> & { id?: string };

type ToastContextValue = {
  toast: (input: ToastInput) => void;
  success: (title: string, description?: string) => void;
  error: (title: string, description?: string) => void;
  info: (title: string, description?: string) => void;
  warning: (title: string, description?: string) => void;
  dismiss: (id: string) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

let idCounter = 0;
function nextId() {
  idCounter += 1;
  return `t-${Date.now()}-${idCounter}`;
}

const ICONS: Record<ToastType, string> = {
  success: '✓',
  error: '!',
  info: 'i',
  warning: '⚠',
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);

  const dismiss = useCallback((id: string) => {
    setItems((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback(
    (input: ToastInput) => {
      const id = input.id || nextId();
      const item: ToastItem = {
        id,
        type: input.type || 'info',
        title: input.title,
        description: input.description,
        duration: input.duration ?? 4200,
      };
      setItems((prev) => [...prev.slice(-4), item]);
    },
    [],
  );

  const api = useMemo<ToastContextValue>(
    () => ({
      toast,
      success: (title, description) => toast({ type: 'success', title, description }),
      error: (title, description) => toast({ type: 'error', title, description }),
      info: (title, description) => toast({ type: 'info', title, description }),
      warning: (title, description) => toast({ type: 'warning', title, description }),
      dismiss,
    }),
    [toast, dismiss],
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="toaster" aria-live="polite" aria-relevant="additions">
        {items.map((t) => (
          <ToastCard key={t.id} item={t} onDismiss={dismiss} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function ToastCard({
  item,
  onDismiss,
}: {
  item: ToastItem;
  onDismiss: (id: string) => void;
}) {
  useEffect(() => {
    if (!item.duration || item.duration <= 0) return;
    const timer = window.setTimeout(() => onDismiss(item.id), item.duration);
    return () => window.clearTimeout(timer);
  }, [item.id, item.duration, onDismiss]);

  return (
    <div className={`toast toast-${item.type}`} role="status">
      <div className="toast-icon" aria-hidden>
        {ICONS[item.type]}
      </div>
      <div className="toast-body">
        <div className="toast-title">{item.title}</div>
        {item.description ? <div className="toast-desc">{item.description}</div> : null}
      </div>
      <button
        type="button"
        className="toast-close"
        aria-label="Kapat"
        onClick={() => onDismiss(item.id)}
      >
        ×
      </button>
    </div>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    // SSR / missing provider fallback — no-op to avoid crashes
    return {
      toast: () => undefined,
      success: () => undefined,
      error: () => undefined,
      info: () => undefined,
      warning: () => undefined,
      dismiss: () => undefined,
    } as ToastContextValue;
  }
  return ctx;
}
