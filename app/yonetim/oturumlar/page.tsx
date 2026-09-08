'use client';
import { useEffect, useState } from 'react';
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
    async function load() {
        const response = await fetch('/api/sessions', { cache: 'no-store' });
        if (!response.ok) {
            setError('Oturumlar yüklenemedi.');
            return;
        }
        setSessions(await response.json());
    }
    useEffect(() => {
        void load();
    }, []);
    async function revoke(id: string) {
        if (!confirm('Bu aktif oturum uzaktan kapatılsın mı?'))
            return;
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
            return;
        }
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
                  <button className="btn" disabled={busy === session._id} onClick={() => revoke(session._id)}>
                    {busy === session._id ? 'Kapatılıyor…' : 'Oturumu Kapat'}
                  </button>
                </td>
              </tr>))}
          </tbody>
        </table>
        {!sessions.length && <div className="empty-compact">Aktif oturum bulunmuyor.</div>}
      </div>
    </>);
}

