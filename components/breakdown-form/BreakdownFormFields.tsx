import type { Category, EquipmentType, Motor } from '@/types';

const equipmentTypeLabel: Record<EquipmentType, string> = {
  motor: 'Motor', booster: 'Booster', pompa: 'Pompa', kompresor: 'Kompresör',
  jenerator: 'Jeneratör', alternator: 'Alternatör', diger: 'Ekipman',
};

export type BreakdownFormValues = {
  motorId: string;
  categoryId: string;
  subcategoryId: string;
  priority: string;
  title: string;
  description: string;
  motorHours: string | number | null | undefined;
  downtimeStartedAt: string | null | undefined;
};

/**
 * Ekipman / kategori / alt kategori / öncelik / başlık / açıklama alanları.
 * "Yeni arıza" ve "arıza düzenle" formlarının ortak çekirdeği.
 */
export function BreakdownCoreFields({
  motors,
  cats,
  values,
  onChange,
  titleLabel = 'Arıza Başlığı',
  descriptionLabel = 'Arıza Açıklaması',
  titlePlaceholder,
  descriptionPlaceholder,
}: {
  motors: Motor[];
  cats: Category[];
  values: BreakdownFormValues;
  onChange: (key: keyof BreakdownFormValues, value: string) => void;
  titleLabel?: string;
  descriptionLabel?: string;
  titlePlaceholder?: string;
  descriptionPlaceholder?: string;
}) {
  const parents = cats.filter((x) => !x.parentId);
  const children = cats.filter((x) => String(x.parentId) === values.categoryId);

  return (
    <>
      <div className="report-filters">
        <label>
          Ekipman
          <select value={values.motorId} onChange={(e) => onChange('motorId', e.target.value)}>
            <option value="">Ekipman seçiniz</option>
            {motors.map((x) => (
              <option key={String(x._id)} value={String(x._id)}>
                {x.name} · {equipmentTypeLabel[x.equipmentType ?? 'motor']} · {Number(x.currentHours ?? x.hours ?? 0).toLocaleString('tr-TR')} saat
              </option>
            ))}
          </select>
        </label>
        <label>
          Ana Kategori
          <select
            value={values.categoryId}
            onChange={(e) => {
              onChange('categoryId', e.target.value);
              onChange('subcategoryId', '');
            }}
          >
            <option value="">Kategori seçiniz</option>
            {parents.map((x) => (
              <option key={String(x._id)} value={String(x._id)}>
                {x.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Alt Kategori
          <select
            value={values.subcategoryId}
            disabled={!values.categoryId}
            onChange={(e) => onChange('subcategoryId', e.target.value)}
          >
            <option value="">Alt kategori seçiniz</option>
            {children.map((x) => (
              <option key={String(x._id)} value={String(x._id)}>
                {x.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Öncelik
          <select value={values.priority} onChange={(e) => onChange('priority', e.target.value)}>
            <option value="kritik">Kritik</option>
            <option value="yuksek">Yüksek</option>
            <option value="orta">Orta</option>
            <option value="dusuk">Düşük</option>
          </select>
        </label>
      </div>
      <label>
        {titleLabel}
        <input
          value={values.title}
          onChange={(e) => onChange('title', e.target.value)}
          maxLength={160}
          placeholder={titlePlaceholder}
        />
      </label>
      <label>
        {descriptionLabel}
        <textarea
          value={values.description}
          onChange={(e) => onChange('description', e.target.value)}
          maxLength={5000}
          rows={7}
          placeholder={descriptionPlaceholder}
        />
      </label>
    </>
  );
}

/** Ekipman çalışma saati + duruş başlangıcı alanları (isteğe bağlı bilgiler). */
export function BreakdownHoursFields({
  values,
  onChange,
}: {
  values: Pick<BreakdownFormValues, 'motorHours' | 'downtimeStartedAt'>;
  onChange: (key: keyof BreakdownFormValues, value: string) => void;
}) {
  return (
    <div className="report-filters">
      <label>
        Ekipman Çalışma Saati
        <input
          type="number"
          min="0"
          value={values.motorHours ?? ''}
          onChange={(e) => onChange('motorHours', e.target.value)}
          placeholder="Opsiyonel"
        />
      </label>
      <label>
        Duruş Başlangıcı
        <input
          type="datetime-local"
          value={values.downtimeStartedAt || ''}
          onChange={(e) => onChange('downtimeStartedAt', e.target.value)}
        />
      </label>
    </div>
  );
}

/** İki alt bileşenin tamamını art arda basan kısayol (araya içerik eklenmeyecekse). */
export default function BreakdownFormFields(props: Parameters<typeof BreakdownCoreFields>[0]) {
  return (
    <>
      <BreakdownCoreFields {...props} />
      <BreakdownHoursFields values={props.values} onChange={props.onChange} />
    </>
  );
}
