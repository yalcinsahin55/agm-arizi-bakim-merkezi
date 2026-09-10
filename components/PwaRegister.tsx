'use client';

import { useEffect, useState } from 'react';

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

export default function PwaRegister() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Service worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => undefined);
    }

    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      // iOS
      ('standalone' in navigator && Boolean((navigator as Navigator & { standalone?: boolean }).standalone));
    if (isStandalone) {
      queueMicrotask(() => setInstalled(true));
      return;
    }

    const dismissed = localStorage.getItem('agm_pwa_dismissed');
    if (dismissed && Date.now() - Number(dismissed) < 7 * 86400000) return;

    const onBip = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
      setVisible(true);
    };
    const onInstalled = () => {
      setInstalled(true);
      setVisible(false);
      setDeferred(null);
    };
    window.addEventListener('beforeinstallprompt', onBip);
    window.addEventListener('appinstalled', onInstalled);

    // iOS: show soft tip if not standalone
    const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
    if (isIOS && !isStandalone) {
      setTimeout(() => setVisible(true), 2500);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', onBip);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  if (installed || !visible) return null;

  async function install() {
    if (deferred) {
      await deferred.prompt();
      const choice = await deferred.userChoice;
      if (choice.outcome === 'accepted') {
        setVisible(false);
      } else {
        localStorage.setItem('agm_pwa_dismissed', String(Date.now()));
        setVisible(false);
      }
      setDeferred(null);
      return;
    }
    // iOS fallback: just show instructions remain
  }

  function dismiss() {
    localStorage.setItem('agm_pwa_dismissed', String(Date.now()));
    setVisible(false);
  }

  const isIOS =
    typeof navigator !== 'undefined' && /iphone|ipad|ipod/i.test(navigator.userAgent);

  return (
    <div className="pwa-banner" role="dialog" aria-label="Uygulamayı yükle">
      <div className="pwa-banner-icon" aria-hidden>
        <img src="/icon-72.png" alt="" width={40} height={40} />
      </div>
      <div className="pwa-banner-body">
        <b>AGM Arızi’yi yükle</b>
        {isIOS && !deferred ? (
          <span>
            Safari’de Paylaş → <b>Ana Ekrana Ekle</b> ile uygulama gibi kullanın.
          </span>
        ) : (
          <span>Masaüstü veya telefona uygulama olarak ekleyin. Çevrimdışı arıza bildirimi dahil.</span>
        )}
      </div>
      <div className="pwa-banner-actions">
        {deferred && (
          <button type="button" className="btn primary btn-sm" onClick={install}>
            Yükle
          </button>
        )}
        <button type="button" className="btn btn-sm" onClick={dismiss}>
          Sonra
        </button>
      </div>
    </div>
  );
}
