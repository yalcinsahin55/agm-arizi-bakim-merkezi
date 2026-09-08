'use client';
import { useEffect, useState } from 'react';
import ReportFilters from '@/components/reports/ReportFilters';
import ReportCards from '@/components/reports/ReportCards';
import ReportLists from '@/components/reports/ReportLists';
import ReportTable from '@/components/reports/ReportTable';
export default function Reports() {
    const [motors, setMotors] = useState<any[]>([]), [cats, setCats] = useState<any[]>([]), [techs, setTechs] = useState<any[]>([]);
    const [f, setF] = useState({ from: '', to: '', motor: '', category: '', technician: '', status: '', priority: '' });
    const [r, setR] = useState<any | null>(null), [loading, setLoading] = useState(false);
    useEffect(() => { Promise.all([fetch('/api/motors').then(x => x.json()), fetch('/api/categories').then(x => x.json()), fetch('/api/technicians').then(x => x.json())]).then(([m, c, t]) => { setMotors(m); setCats(c.filter((x: any) => !x.parentId)); setTechs(t); }); }, []);
    async function load() {
        setLoading(true);
        const qs = new URLSearchParams(Object.entries(f).filter(([, v]) => v));
        const x = await fetch('/api/reports?' + qs.toString(), { cache: 'no-store' });
        if (x.ok)
            setR(await x.json());
        setLoading(false);
    }
    useEffect(() => { load(); }, []);
    const csv = () => { const qs = new URLSearchParams(Object.entries(f).filter(([, v]) => v)); qs.set('format', 'csv'); window.location.href = '/api/reports?' + qs.toString(); };
    return <><h1 className="page-title">Gelişmiş Arıza Raporları</h1><p className="muted">CEO/Görüntüleyici ve yöneticiler için filtrelenebilir yönetim raporları.</p><ReportFilters {...{ motors, cats, techs, f, setF, load, csv, loading }}/>{r && <><ReportCards stats={r.stats}/><ReportLists report={r}/><ReportTable rows={r.rows}/></>}</>;
}

