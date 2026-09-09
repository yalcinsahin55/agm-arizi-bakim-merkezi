'use client';
import { useEffect, useState } from 'react';
const labels: any = { yonetici: 'Yönetici', teknisyen: 'Teknisyen', operator: 'Operatör', goruntuleyici: 'Üst Düzey / Görüntüleyici' };
export default function Users() {
    const [rows, setRows] = useState<any[]>([]), [form, setForm] = useState({ name: '', phone: '', password: '', role: 'goruntuleyici' });
    const [editId, setEditId] = useState<string | null>(null);
    const [ef, setEf] = useState({ name: '', phone: '', password: '', role: 'goruntuleyici' });
    async function load() {
        const r = await fetch('/api/users');
        if (r.ok)
            setRows(await r.json());
    }
    useEffect(() => { load(); }, []);
    async function add() {
        const r = await fetch('/api/users', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(form) });
        const j = await r.json();
        if (!r.ok)
            return alert(j.error);
        setForm({ name: '', phone: '', password: '', role: 'goruntuleyici' });
        load();
    }
    async function toggle(x: any) {
        const r = await fetch('/api/users', { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ id: String(x._id), active: !x.active }) });
        if (!r.ok)
            alert((await r.json()).error);
        load();
    }
    async function del(x: any) {
        if (!window.confirm(`${x.name} kullanıcısı KALICI olarak silinsin mi?`))
            return;
        const r = await fetch('/api/users', { method: 'DELETE', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ id: String(x._id) }) });
        if (!r.ok)
            alert((await r.json()).error);
        load();
    }
    function startEdit(x: any) {
        setEditId(String(x._id));
        setEf({ name: x.name || '', phone: x.phoneNumber || '', password: '', role: x.role || 'goruntuleyici' });
    }
    async function saveEdit(id: string) {
        const body: any = { id, name: ef.name, phone: ef.phone, role: ef.role };
        if (ef.password)
            body.password = ef.password;
        const r = await fetch('/api/users', { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
        if (!r.ok)
            alert((await r.json()).error);
        setEditId(null);
        load();
    }
    return <><h1 className="page-title">Kullanıcı Yönetimi</h1><p className="muted">Yönetici; yönetici, teknisyen, operatör ve üst düzey görüntüleyici kullanıcıları tanımlayabilir. Kullanıcı adı olarak telefon numarası kullanılır; WhatsApp bildirimleri bu numaraya gider.</p><div className="card form" style={{ marginTop: 16 }}><h2>Yeni Kullanıcı</h2><input placeholder="Ad Soyad" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}/><input placeholder="Telefon (örn: 0535 027 88 55) — aynı zamanda kullanıcı adı" type="tel" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })}/><input placeholder="Geçici şifre (en az 8 karakter)" type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })}/><select value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}>{Object.entries(labels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select><button className="btn primary" onClick={add}>Kullanıcı Oluştur</button></div><div className="card" style={{ marginTop: 16 }}><h2>Kullanıcılar</h2>{rows.map(x => <div key={String(x._id)} style={{ padding: '12px 0', borderBottom: '1px solid var(--line)' }}><div className="row" style={{ justifyContent: 'space-between' }}><div><b>{x.name}</b><div className="muted">{x.phoneNumber || 'Telefon yok'} · {labels[x.role] || x.role} · {x.active ? 'Aktif' : 'Pasif'}{x.whatsappEnabled === false ? ' · WhatsApp kapalı' : ''}</div></div><div style={{ display: 'flex', gap: 8 }}><button className="btn" onClick={() => startEdit(x)}>Düzenle</button><button className="btn" onClick={() => toggle(x)}>{x.active ? 'Pasifleştir' : 'Aktifleştir'}</button><button className="btn danger" onClick={() => del(x)}>Sil</button></div></div>{editId === String(x._id) && <div className="form" style={{ marginTop: 12, display: 'grid', gap: 8 }}><input placeholder="Ad Soyad" value={ef.name} onChange={e => setEf({ ...ef, name: e.target.value })}/><input placeholder="Telefon (örn: 0535 027 88 55)" type="tel" value={ef.phone} onChange={e => setEf({ ...ef, phone: e.target.value })}/><input placeholder="Yeni şifre (değiştirmeyecekseniz boş bırakın)" type="password" value={ef.password} onChange={e => setEf({ ...ef, password: e.target.value })}/><select value={ef.role} onChange={e => setEf({ ...ef, role: e.target.value })}>{Object.entries(labels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select><div style={{ display: 'flex', gap: 8 }}><button className="btn primary" onClick={() => saveEdit(String(x._id))}>Kaydet</button><button className="btn" onClick={() => setEditId(null)}>Vazgeç</button></div></div>}</div>)}</div></>;
}
