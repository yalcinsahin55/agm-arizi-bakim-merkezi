'use client';
import { useEffect, useState } from 'react';
type Item = {
    _id: string;
    fileName: string;
    contentType: string;
    size: number;
    url: string;
    uploadedBy: string;
    uploadedByName: string;
    createdAt: string;
};
export default function BreakdownAttachments({ id, canUpload, canDelete }: {
    id: string;
    canUpload: boolean;
    canDelete: boolean;
}) {
    const [items, setItems] = useState<Item[]>([]), [busy, setBusy] = useState(false), [error, setError] = useState('');
    const load = () => fetch(`/api/breakdowns/${id}/attachments`).then(r => r.ok ? r.json() : Promise.reject()).then(x => setItems(x.items || [])).catch(() => setError('Ekler yüklenemedi.'));
    useEffect(() => { load(); }, [id]);
    const upload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        e.target.value = '';
        if (!file)
            return;
        setError('');
        setBusy(true);
        try {
            const f = new FormData();
            f.append('file', file);
            const r = await fetch(`/api/breakdowns/${id}/attachments`, { method: 'POST', body: f });
            const x = await r.json();
            if (!r.ok)
                throw new Error(x.error || 'Yükleme başarısız');
            setItems(v => [x.item, ...v]);
        }
        catch (err) {
            setError(err instanceof Error ? err.message : 'Yükleme başarısız');
        }
        finally {
            setBusy(false);
        }
    };
    const remove = async (a: Item) => {
        if (!confirm(`${a.fileName} silinsin mi?`))
            return;
        const r = await fetch(`/api/breakdowns/${id}/attachments`, { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ attachmentId: a._id }) });
        if (r.ok)
            setItems(v => v.filter(x => x._id !== a._id));
        else
            setError('Dosya silinemedi.');
    };
    const mb = (n: number) => `${(n / 1024 / 1024).toFixed(2)} MB`;
    return <div className="card" style={{ marginTop: 16 }}><div className="row" style={{ justifyContent: 'space-between' }}><div><h2>Arıza Kanıtları & Ekler</h2><p className="muted">Fotoğraf, PDF ve servis dokümanları · maksimum 6 MB</p></div>{canUpload && <label className="btn primary">{busy ? 'Yükleniyor…' : '+ Dosya Ekle'}<input type="file" accept="image/jpeg,image/png,image/webp,application/pdf" onChange={upload} hidden disabled={busy}/></label>}</div>{error && <p className="form-error">{error}</p>}<div className="attachment-grid">{items.map(a => <div className="attachment" key={a._id}>{a.contentType.startsWith('image/') ? <a href={a.url} target="_blank" rel="noreferrer"><img src={a.url} alt={a.fileName}/></a> : <a className="attachment-file" href={a.url} target="_blank" rel="noreferrer"><b>PDF</b><span>{a.fileName}</span></a>}<div className="attachment-meta"><span title={a.fileName}>{a.fileName}</span><small>{mb(a.size)} · {a.uploadedByName}</small>{canDelete && <button className="link-btn" onClick={() => remove(a)}>Sil</button>}</div></div>)}{!items.length && <div className="empty-compact">Henüz ek dosya yok.</div>}</div></div>;
}

