'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
export default function EditBreakdown() {
    const { id } = useParams<{
        id: string;
    }>();
    const r = useRouter();
    const [b, setB] = useState<any>(null), [busy, setBusy] = useState(false);
    useEffect(() => {
        fetch('/api/breakdowns').then(x => x.json()).then(rows => {
            const found = rows.find((x: any) => String(x._id) === id);
            if (found)
                setB(found);
            else
                r.replace('/arizalar');
        });
    }, [id, r]);
    if (!b)
        return <div className="card">Kayıt yükleniyor...</div>;
    if (b.status !== 'acik')
        return <div className="card">Bu kayıt artık düzenlenemez.</div>;
    async function save() {
        setBusy(true);
        const x = await fetch('/api/breakdowns', { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ id, title: b.title, description: b.description, priority: b.priority, categoryId: b.categoryId, categoryName: b.categoryName, subcategoryName: b.subcategoryName }) });
        setBusy(false);
        if (x.ok)
            r.push(`/arizalar/${id}`);
        else
            alert((await x.json()).error);
    }
    return <><h1 className="page-title">{b.code} Düzenle</h1><div className="card form" style={{ marginTop: 16 }}><label>Başlık<input value={b.title} onChange={e => setB({ ...b, title: e.target.value })}/></label><label>Öncelik<select value={b.priority} onChange={e => setB({ ...b, priority: e.target.value })}><option value="kritik">Kritik</option><option value="yuksek">Yüksek</option><option value="orta">Orta</option><option value="dusuk">Düşük</option></select></label><label>Açıklama<textarea value={b.description} onChange={e => setB({ ...b, description: e.target.value })}/></label><div className="row"><button className="btn" onClick={() => r.back()}>Vazgeç</button><button disabled={busy} className="btn primary" onClick={save}>Kaydet</button></div></div></>;
}

