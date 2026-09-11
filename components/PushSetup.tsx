'use client';

import { useCallback, useEffect, useState } from 'react';
import { pushSupported, urlBase64ToUint8Array } from '@/lib/push-client';
import { useToast } from '@/components/ui/Toaster';

type Status = {
  configured: boolean;
  publicKey: string | null;
  count: number;
  endpoints: string[];
};

export default function PushSetup({ compact = false }: { compact?: boolean }) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission | 'unsupported'>(
    'default',
  );
  const [localSub, setLocalSub] = useState(false);
  const [status, setStatus] = useState<Status | null>(null);

  const refresh = useCallback(async () => {
    if (!pushSupported()) {
      setPermission('unsupported');
      return;
    }
    setPermission(Notification.permission);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      setLocalSub(!!sub);
    } catch {
      setLocalSub(false);
    }
    try {
      const r = await fetch('/api/push/subscribe', { cache: 'no-store' });
      if (r.ok) setStatus(await r.json());
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    queueMicrotask(refresh);
  }, [refresh]);

  async function enable() {
    setBusy(true);
    try {
      if (!pushSupported()) {
        toast.error('Desteklenmiyor', 'Bu tarayıcı Web Push desteklemiyor.');
        return;
      }
      const perm = await Notification.requestPermission();
      setPermission(perm);
      if (perm !== 'granted') {
        toast.warning('İzin gerekli', 'Bildirim iznini tarayıcı ayarlarından açın.');
        return;
      }

      let reg = await navigator.serviceWorker.getRegistration();
      if (!reg) reg = await navigator.serviceWorker.register('/sw.js');
      await navigator.serviceWorker.ready;

      const key =
        status?.publicKey ||
        process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ||
        '';
      if (!key) {
        // try fetch status again
        const st = await fetch('/api/push/subscribe').then((r) => r.json()).catch(() => null);
        if (!st?.publicKey) {
          toast.error(
            'VAPID anahtarı yok',
            'Sunucuda NEXT_PUBLIC_VAPID_PUBLIC_KEY ve VAPID_* tanımlayın.',
          );
          return;
        }
        setStatus(st);
      }
      const publicKey =
        (status?.publicKey ||
          process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ||
          (await fetch('/api/push/subscribe').then((r) => r.json()).then((j) => j.publicKey))) as string;

      const existing = await reg!.pushManager.getSubscription();
      const sub =
        existing ||
        (await reg!.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicKey) as BufferSource,
        }));

      const x = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(sub.toJSON()),
      });
      if (!x.ok) {
        const err = await x.json().catch(() => ({}));
        toast.error('Kayıt başarısız', err.error || 'Sunucu aboneliği kaydedemedi');
        return;
      }
      toast.success('Bildirimler açık', 'Bu cihaz push için kayıtlı.');
      await refresh();
    } catch (e) {
      console.error(e);
      toast.error('Kurulum başarısız', e instanceof Error ? e.message : 'Bilinmeyen hata');
    } finally {
      setBusy(false);
    }
  }

  async function disable() {
    setBusy(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        const endpoint = sub.endpoint;
        await sub.unsubscribe();
        await fetch('/api/push/subscribe', {
          method: 'DELETE',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ endpoint }),
        });
      } else {
        await fetch('/api/push/subscribe', {
          method: 'DELETE',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({}),
        });
      }
      toast.info('Bildirimler kapatıldı');
      await refresh();
    } catch {
      toast.error('Kapatılamadı');
    } finally {
      setBusy(false);
    }
  }

  async function test() {
    setBusy(true);
    try {
      const r = await fetch('/api/push/test', { method: 'POST' });
      if (r.ok) toast.success('Test gönderildi', 'Birkaç saniye içinde bildirim gelmeli.');
      else {
        const err = await r.json().catch(() => ({}));
        toast.error('Test başarısız', err.error || 'Push gönderilemedi');
      }
    } catch {
      toast.error('Bağlantı hatası');
    } finally {
      setBusy(false);
    }
  }

  if (permission === 'unsupported') {
    if (compact) return null;
    return (
      <div className="card" style={{ marginTop: 16 }}>
        <b>Push bildirimleri</b>
        <p className="muted">Bu tarayıcı Web Push desteklemiyor (iOS Safari 16.4+ veya Chrome kullanın).</p>
      </div>
    );
  }

  const on = localSub && permission === 'granted';

  return (
    <div className="card push-setup" style={{ marginTop: compact ? 0 : 16 }}>
      <div className="row" style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <b>Push bildirimleri</b>
          <div className="muted">
            Arıza ataması, kabul, rapor ve onay olaylarında anlık bildirim
          </div>
          <div className="push-status-line">
            <span className={`push-dot ${on ? 'on' : 'off'}`} />
            {on
              ? `Aktif · ${status?.count || 1} cihaz`
              : permission === 'denied'
                ? 'Tarayıcı izni reddedildi'
                : status?.configured === false
                  ? 'Sunucu VAPID yapılandırılmamış'
                  : 'Kapalı'}
          </div>
        </div>
        <div className="row">
          {on ? (
            <>
              <button type="button" className="btn btn-sm" disabled={busy} onClick={test}>
                Test et
              </button>
              <button type="button" className="btn btn-sm danger" disabled={busy} onClick={disable}>
                Kapat
              </button>
            </>
          ) : (
            <button
              type="button"
              className="btn primary btn-sm"
              disabled={busy || status?.configured === false}
              onClick={enable}
            >
              {busy ? 'Kuruluyor…' : 'Bildirimleri Aç'}
            </button>
          )}
        </div>
      </div>
      {!compact && (
        <p className="muted" style={{ marginTop: 10, fontSize: 12 }}>
          PWA olarak yüklediğinizde arka planda da çalışır. iPhone’da: Safari → Ana Ekrana Ekle →
          uygulamayı açıp bildirimi etkinleştirin.
        </p>
      )}
    </div>
  );
}
