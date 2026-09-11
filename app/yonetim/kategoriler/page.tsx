'use client';

import { useEffect, useMemo, useState } from 'react';
import { useToast } from '@/components/ui/Toaster';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import PromptDialog from '@/components/ui/PromptDialog';
import type { Category } from '@/types';

export default function Cats() {
  const toast = useToast();
  const [rows, setRows] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [parentId, setParentId] = useState('');
  const [adding, setAdding] = useState(false);

  const [editTarget, setEditTarget] = useState<Category | null>(null);
  const [editBusy, setEditBusy] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<Category | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  const [quickParent, setQuickParent] = useState<Category | null>(null);
  const [quickBusy, setQuickBusy] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const r = await fetch('/api/categories');
      if (r.ok) setRows(await r.json());
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    queueMicrotask(load);
  }, []);

  const roots = useMemo(() => rows.filter((x) => !x.parentId), [rows]);
  const children = (id: string) => rows.filter((x) => String(x.parentId) === id);

  async function createCategory(payload: { name: string; parentId: string | null }) {
    const r = await fetch('/api/categories', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) {
      toast.error('Kategori eklenemedi', j.error);
      return false;
    }
    return true;
  }

  async function add() {
    const trimmed = name.trim();
    if (trimmed.length < 2) {
      toast.warning('Kategori adı çok kısa', 'En az 2 karakter girin.');
      return;
    }
    setAdding(true);
    try {
      const ok = await createCategory({ name: trimmed, parentId: parentId || null });
      if (!ok) return;
      toast.success('Kategori eklendi');
      setName('');
      load();
    } finally {
      setAdding(false);
    }
  }

  async function addSubcategory(value: string) {
    if (!quickParent) return;
    setQuickBusy(true);
    try {
      const ok = await createCategory({ name: value, parentId: String(quickParent._id) });
      if (!ok) return;
      toast.success('Alt kategori eklendi');
      setQuickParent(null);
      load();
    } finally {
      setQuickBusy(false);
    }
  }

  async function saveEdit(value: string) {
    if (!editTarget) return;
    if (value === editTarget.name) {
      setEditTarget(null);
      return;
    }
    setEditBusy(true);
    try {
      const r = await fetch('/api/categories', {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ id: String(editTarget._id), name: value }),
      });
      if (!r.ok) {
        const err = await r.json().catch(() => ({}));
        toast.error('Güncellenemedi', err.error);
      } else {
        toast.success('Kategori güncellendi');
        setEditTarget(null);
      }
      load();
    } finally {
      setEditBusy(false);
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleteBusy(true);
    try {
      const r = await fetch('/api/categories', {
        method: 'DELETE',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ id: String(deleteTarget._id) }),
      });
      if (!r.ok) {
        const err = await r.json().catch(() => ({}));
        toast.error('İşlem başarısız', err.error);
      } else {
        toast.success('Kategori pasifleştirildi');
        setDeleteTarget(null);
      }
      load();
    } finally {
      setDeleteBusy(false);
    }
  }

  return (
    <>
      <h1 className="page-title">Arıza Kategorileri</h1>
      <p className="muted">
        Yönetici ilk kurulumda ana kategori ve alt kategorileri tanımlar; daha sonra düzenleyebilir
        veya pasifleştirebilir.
      </p>

      <div className="card form" style={{ marginTop: 16 }}>
        <h2 style={{ margin: 0 }}>Yeni Kategori</h2>
        <label>
          Kategori adı
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Örn. Mekanik veya Turbo"
            onKeyDown={(e) => e.key === 'Enter' && add()}
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
        <button className="btn primary" onClick={add} disabled={adding}>
          {adding ? 'Ekleniyor…' : 'Kategori Ekle'}
        </button>
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <h2>Tanımlı Kategoriler</h2>

        {loading && <div className="empty-compact">Yükleniyor…</div>}
        {!loading && !roots.length && (
          <div className="empty-compact">Henüz kategori tanımlanmadı.</div>
        )}

        {!loading &&
          roots.map((root) => (
            <div key={String(root._id)} className="cat-group">
              <div className="row cat-row cat-row-root">
                <b>{root.name}</b>
                <span className="row row-actions">
                  <button className="btn btn-sm" onClick={() => setQuickParent(root)}>
                    + Alt Kategori
                  </button>
                  <button className="btn btn-sm" onClick={() => setEditTarget(root)}>
                    Düzenle
                  </button>
                  <button className="btn btn-sm danger" onClick={() => setDeleteTarget(root)}>
                    Sil / Pasifleştir
                  </button>
                </span>
              </div>
              {children(String(root._id)).map((c) => (
                <div className="row cat-row cat-row-child" key={String(c._id)}>
                  <span>↳ {c.name}</span>
                  <span className="row row-actions">
                    <button className="btn btn-sm" onClick={() => setEditTarget(c)}>
                      Düzenle
                    </button>
                    <button className="btn btn-sm danger" onClick={() => setDeleteTarget(c)}>
                      Pasifleştir
                    </button>
                  </span>
                </div>
              ))}
            </div>
          ))}
      </div>

      <PromptDialog
        open={!!editTarget}
        title="Kategori Adını Düzenle"
        label="Kategori adı"
        initialValue={editTarget?.name || ''}
        busy={editBusy}
        onConfirm={saveEdit}
        onCancel={() => setEditTarget(null)}
      />

      <PromptDialog
        open={!!quickParent}
        title={`${quickParent?.name ?? ''} — Alt Kategori Ekle`}
        label="Alt kategori adı"
        placeholder="Örn. Turbo"
        confirmLabel="Ekle"
        busy={quickBusy}
        onConfirm={addSubcategory}
        onCancel={() => setQuickParent(null)}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        title="Kategori Pasifleştirilsin mi?"
        description={
          deleteTarget
            ? `"${deleteTarget.name}" kategorisi pasifleştirilecek ve yeni arıza kayıtlarında görünmeyecek. Alt kategorisi varsa önce onları pasifleştirmeniz gerekir.`
            : undefined
        }
        confirmLabel="Pasifleştir"
        danger
        busy={deleteBusy}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </>
  );
}
