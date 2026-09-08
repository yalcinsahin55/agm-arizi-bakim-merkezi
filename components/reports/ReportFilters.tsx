'use client';
export default function ReportFilters({ motors, cats, techs, f, setF, load, csv, loading }: {
    motors: any[];
    cats: any[];
    techs: any[];
    f: any;
    setF: any;
    load: () => void;
    csv: () => void;
    loading: boolean;
}) { const statuses = [['acik', 'Açık'], ['atandi', 'Atandı'], ['devam_ediyor', 'Devam Ediyor'], ['onay_bekliyor', 'Onay Bekliyor'], ['revizyon', 'Revizyon'], ['onaylandi', 'Onaylandı'], ['iptal', 'İptal']], priorities = [['kritik', 'Kritik'], ['yuksek', 'Yüksek'], ['orta', 'Orta'], ['dusuk', 'Düşük']]; return <div className="card form" style={{ marginTop: 16 }}><div className="report-filters">{[['from', 'Başlangıç', 'date'], ['to', 'Bitiş', 'date']].map(([k, l, t]) => <label key={k}>{l}<input type={t} value={f[k]} onChange={e => setF({ ...f, [k]: e.target.value })}/></label>)}<Select label="Motor" value={f.motor} onChange={(v: string) => setF({ ...f, motor: v })} options={motors}/><Select label="Kategori" value={f.category} onChange={(v: string) => setF({ ...f, category: v })} options={cats}/><Select label="Teknisyen" value={f.technician} onChange={(v: string) => setF({ ...f, technician: v })} options={techs}/><Select label="Durum" value={f.status} onChange={(v: string) => setF({ ...f, status: v })} options={statuses}/><Select label="Öncelik" value={f.priority} onChange={(v: string) => setF({ ...f, priority: v })} options={priorities}/></div><div className="row"><button className="btn primary" onClick={load}>{loading ? 'Hesaplanıyor…' : 'Raporu Oluştur'}</button><button className="btn" onClick={csv}>CSV / Excel'e Uygun İndir</button></div></div>; }
function Select({ label, value, onChange, options }: {
    label: string;
    value: string;
    onChange: (v: string) => void;
    options: any[];
}) { return <label>{label}<select value={value} onChange={e => onChange(e.target.value)}><option value="">Tümü</option>{options.map((x: any) => <option key={x._id || x[0]} value={x._id || x[0]}>{x.name || x[1]}</option>)}</select></label>; }

