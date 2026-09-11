 'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { EquipmentType, Motor } from '@/types';
import { useToast } from '@/components/ui/Toaster';

export const EQUIPMENT_TYPES: Array<{ value: EquipmentType; label: string }> = [
  { value: 'motor', label: 'Motor' },
  { value: 'booster', label: 'Booster' },
  { value: 'pompa', label: 'Pompa' },
  { value: 'kompresor', label: 'Kompresör' },
  { value: 'jenerator', label: 'Jeneratör' },
  { value: 'alternator', label: 'Alternatör' },
  { value: 'diger', label: 'Diğer Ekipman' },
];

type Props = {
  equipment?: Motor;
  compact?: boolean;
  onSaved?: () => void;
};

export default function EquipmentForm({ equipment, compact = false, onSaved }: Props) {
  const router = useRouter();
  const toast = useToast();
  const [name, setName] = useState(equipment?.name ?? '');
  const [type, setType] = useState<EquipmentType>(equipment?.equipmentType ?? 'motor');
  const [hours, setHours] = useState(String(equipment?.currentHours ?? equipment?.hours ?? ''));
  const [load, setLoad] = useState(String(equipment?.currentLoad ?? equipment?.load ?? ''));
  const [location, setLocation] = useState(equipment?.location ?? '');
  const [description, setDescription] = useState(equipment?.description ?? '');
  const [busy, setBusy] = useState(false);

  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (name.trim().length < 2) {
      toast.error('Ekipman adı gerekli');
      return;
    }
    setBusy(true);
    try {
      const payload = {
        name: name.trim(),
        equipmentType: type,
        hours: hours === '' ? undefined : Number(hours),
        load: load === '' ? undefined : Number(load),
        location: location.trim() || undefined,
        description: description.trim() || undefined,
      };
      const response = await fetch(equipment ? `/api/motors/${equipment._id}` : '/api/motors', {
        method: equipment ? 'PATCH' : 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        toast.error('Kaydedilemedi', result.error || 'Beklenmeyen hata');
        return;
      }
      toast.success(equipment ? 'Ekipman güncellendi' : 'Ekipman eklendi');
      onSaved?.();
      router.refresh();
      if (!equipment) {
        setName('');
        setHours('');
        setLoad('');
        setLocation('');
        setDescription('');
        setType('motor');
      }
    } catch {
      toast.error('Bağlantı hatası', 'Ekipman kaydedilemedi.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="form" onSubmit={save}>
      <div className={compact ? 'split' : 'grid cards'}>
        <label>
          Ekipman adı *
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Örn. JENBACHER 1" />
        </label>
        <label>
          Ekipman türü *
          <select value={type} onChange={(e) => setType(e.target.value as EquipmentType)}>
            {EQUIPMENT_TYPES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
          </select>
        </label>
        <label>
          Çalışma saati
          <input type="number" min="0" step="0.1" value={hours} onChange={(e) => setHours(e.target.value)} placeholder="Örn. 12500" />
        </label>
        <label>
          Yük (kW)
          <input type="number" min="0" max="99999" step="0.1" value={load} onChange={(e) => setLoad(e.target.value)} placeholder="Örn. 1405" />
        </label>
      </div>
      <label>
        Konum / Ünite
        <input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Örn. Motorhane / Ünite 1" />
      </label>
      <label>
        Açıklama
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Ekipmanla ilgili kısa teknik bilgi..." />
      </label>
      <div className="row">
        <button className="btn primary" disabled={busy}>{busy ? 'Kaydediliyor…' : equipment ? 'Değişiklikleri Kaydet' : 'Ekipmanı Ekle'}</button>
      </div>
    </form>
  );
}
