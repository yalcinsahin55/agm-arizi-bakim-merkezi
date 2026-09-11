'use client';
import { useEffect, useState } from 'react';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
type Session = {
    _id: string;
    userName: string;
    userEmail: string;
    createdAt: string;
    lastSeenAt: string;
    expiresAt: string;
    userAgent?: string;
    ip?: string;
};
export default function SessionsPage() {
    const [sessions, setSessions] = useState<Session[]>([]);
    const [busy, setBusy] = useState('');
    const [error, setError] = useState('');
    const [revokeTarget, setRevokeTarget] = useState<Session | null>(null);
    async function load() {
        const response = await fetch('/api/sessions', { cache: 'no-store' });
        if (!response.ok) {
            setError('Oturumlar yüklenemedi.');
            return;
        }
        setSessions(await response.json());
    }
    useEffect(() => {
        queueMicrotask(load);
    }, []);
    async function confirmRevoke() {
        if (!revokeTarget) return;
        const id = revokeTarget._id;
        setBusy(id);
        const response = await fetch('/api/sessions', {
            method: 'DELETE',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ id }),
        });
        setBusy('');
        if (!response.ok) {
            const data = await response.json().catch(() => ({}));
            setError(data.error || 'Oturum kapatılamadı.');
            setRevokeTarget(null);
            return;
        }
        setRevokeTarget(null);
        await load();
    }
    return (<>
      <h1 className="page-title">Aktif Oturumlar</h1>
      <p className="muted">
        Çalınan veya yetkisiz kullanılan cihazlardaki oturumları yönetici olarak uzaktan kapatabilirsiniz.
      </p>
      {error && <p className="form-error">{error}</p>}
      <div className="card" style={{ marginTop: 16, overflowX: 'auto' }}>
        <table className="table">
          <thead>
            <tr>
              <th>Kullanıcı</th>
              <th>Cihaz</th>
              <th>IP</th>
              <th>Son Aktivite</th>
              <th>Bitiş</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {sessions.map((session) => (<tr key={session._id}>
                <td>
                  <b>{session.userName}</b>
                  <small className="cell-sub">{session.userEmail}</small>
                </td>
                <td>{session.userAgent || 'Bilinmiyor'}</td>
                <td>{session.ip || 'Bilinmiyor'}</td>
                <td>{new Date(session.lastSeenAt).toLocaleString('tr-TR')}</td>
                <td>{new Date(session.expiresAt).toLocaleString('tr-TR')}</td>
                <td>
                  <button className="btn" disabled={busy === session._id} onClick={() => setRevokeTarget(session)}>
                    {busy === session._id ? 'Kapatılıyor…' : 'Oturumu Kapat'}
                  </button>
                </td>
              </tr>))}
          </tbody>
        </table>
        {!sessions.length && <div className="empty-compact">Aktif oturum bulunmuyor.</div>}
      </div>

      <ConfirmDialog
        open={!!revokeTarget}
        title="Oturum Uzaktan Kapatılsın mı?"
        description={
          revokeTarget
            ? `"${revokeTarget.userName}" kullanıcısının bu cihazdaki aktif oturumu kapatılacak; kullanıcı tekrar giriş yapması gerekecek.`
            : undefined
        }
        confirmLabel="Oturumu Kapat"
        danger
        busy={!!busy}
        onConfirm={confirmRevoke}
        onCancel={() => setRevokeTarget(null)}
      />
    </>);
}
