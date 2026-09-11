'use client';

import { useEffect, useState } from 'react';
import { useToast } from '@/components/ui/Toaster';

export default function Cats() {
  const toast = useToast();
  const [rows, setRows] = useState<import('@/types').Category[]>([]);
  const [name, setName] = useState('');
  const [parentId, setParentId] = useState('');

  async function load() {
    const r = await fetch('/api/categories');
    if (r.ok) setRows(await r.json());
  }
  useEffect(() => {
    queueMicrotask(load);
  }, []);

  async function add() {
    const r = await fetch('/api/categories', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name, parentId: parentId || null }),
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) {
      toast.error('Kategori eklenemedi', j.error);
      return;
    }
    toast.success('Kategori eklendi');
    setName('');
    load();
  }

  async function edit(x: import('@/types').Category) {
    const n = prompt('Kategori adı', x.name);
    if (!n || n === x.name) return;
    const r = await fetch('/api/categories', {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ id: String(x._id), name: n }),
    });
    if (!r.ok) {
      const err = await r.json().catch(() => ({}));
      toast.error('Güncellenemedi', err.error);
    } else {
      toast.success('Kategori güncellendi');
    }
    load();
  }

  async function del(x: import('@/types').Category) {
    if (!confirm(`${x.name} pasifleştirilsin mi?`)) return;
    const r = await fetch('/api/categories', {
      method: 'DELETE',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ id: String(x._id) }),
    });
    if (!r.ok) {
      const err = await r.json().catch(() => ({}));
      toast.error('İşlem başarısız', err.error);
    } else {
      toast.success('Kategori pasifleştirildi');
    }
    load();
  }

  const roots = rows.filter((x) => !x.parentId);
  const children = (id: string) => rows.filter((x) => String(x.parentId) === id);

  return (
    <>
      <h1 className="page-title">Arıza Kategorileri</h1>
      <p className="muted">
        Yönetici ilk kurulumda ana kategori ve alt kategorileri tanımlar; daha sonra düzenleyebilir
        veya pasifleştirebilir.
      </p>
      <div className="card form" style={{ marginTop: 16 }}>
        <label>
          Kategori adı
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Örn. Mekanik veya Turbo"
          />
        </label>
        <label>
          Üst kategori
          <select value={parentId} onChange={(e) => setParentId(e.target.value)}>
            <option value="">Ana kategori</option>
            {roots.map((x) => (
              <option key={String(x._id)} value={String(x._id)}>
                {x.name}
              </option>
            ))}
          </select>
        </label>
        <button className="btn primary" onClick={add}>
          Kategori Ekle
        </button>
      </div>
      <div className="card" style={{ marginTop: 16 }}>
        <h2>Tanımlı Kategoriler</h2>
        {roots.map((root) => (
          <div key={String(root._id)} style={{ marginBottom: 18 }}>
            <div className="row" style={{ justifyContent: 'space-between' }}>
              <b>{root.name}</b>
              <span className="row">
                <button className="btn" onClick={() => edit(root)}>
                  Düzenle
                </button>
                <button className="btn danger" onClick={() => del(root)}>
                  Sil / Pasifleştir
                </button>
              </span>
            </div>
            {children(String(root._id)).map((c) => (
              <div
                className="row"
                style={{
                  justifyContent: 'space-between',
                  padding: '8px 0 8px 22px',
                  borderBottom: '1px solid var(--line)',
                }}
                key={String(c._id)}
              >
                <span>↳ {c.name}</span>
                <span className="row">
                  <button className="btn" onClick={() => edit(c)}>
                    Düzenle
                  </button>
                  <button className="btn danger" onClick={() => del(c)}>
                    Pasifleştir
                  </button>
                </span>
              </div>
            ))}
          </div>
        ))}
      </div>
    </>
  );
}
