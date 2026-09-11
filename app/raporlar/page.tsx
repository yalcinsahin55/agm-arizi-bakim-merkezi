'use client';

import { useEffect, useState } from 'react';
import ReportFilters, { type ReportFiltersState } from '@/components/reports/ReportFilters';
import ReportCards from '@/components/reports/ReportCards';
import ReportLists from '@/components/reports/ReportLists';
import ReportTable from '@/components/reports/ReportTable';
import type { Category, Motor, ReportPayload, User } from '@/types';

export default function Reports() {
  const [motors, setMotors] = useState<Motor[]>([]);
  const [cats, setCats] = useState<Category[]>([]);
  const [techs, setTechs] = useState<User[]>([]);
  const [f, setF] = useState<ReportFiltersState>({
    from: '', to: '', motor: '', category: '', technician: '', status: '', priority: '',
  });
  const [report, setReport] = useState<ReportPayload | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    void Promise.all([
      fetch('/api/motors').then((x) => x.json() as Promise<Motor[]>),
      fetch('/api/categories').then((x) => x.json() as Promise<Category[]>),
      fetch('/api/technicians').then((x) => x.json() as Promise<User[]>),
    ]).then(([m, c, t]) => {
      setMotors(m);
      setCats(c.filter((x) => !x.parentId));
      setTechs(t);
    });
  }, []);

  async function load() {
    setLoading(true);
    try {
      const qs = new URLSearchParams(
        Object.entries(f).filter(([, value]) => Boolean(value)),
      );
      const response = await fetch(`/api/reports?${qs.toString()}`, { cache: 'no-store' });
      if (!response.ok) return;
      setReport(await response.json() as ReportPayload);
    } finally {
      setLoading(false);
    }
  }

  // Bilinçli olarak yalnızca ilk yüklemede çalışır; filtre değiştiğinde
  // yeniden veri çekme işi "Raporu Oluştur" butonuna (load prop'u) bırakılmıştır.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { queueMicrotask(load); }, []);

  function csvHref() {
    const qs = new URLSearchParams(Object.entries(f).filter(([, value]) => Boolean(value)));
    qs.set('format', 'csv');
    return `/api/reports?${qs.toString()}`;
  }

  return (
    <>
      <h1 className="page-title">Gelişmiş Arıza Raporları</h1>
      <p className="muted">CEO/Görüntüleyici ve yöneticiler için filtrelenebilir yönetim raporları.</p>
      <ReportFilters motors={motors} cats={cats} techs={techs} f={f} setF={setF} load={load} csvHref={csvHref()} loading={loading} />
      {report && (
        <>
          <ReportCards stats={report.stats} />
          <ReportLists report={report} />
          <ReportTable rows={report.rows} />
        </>
      )}
    </>
  );
}
