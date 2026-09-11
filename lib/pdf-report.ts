import PDFDocument from 'pdfkit';
import path from 'node:path';
import type { ReportPayload, ReportRow, ReportStats } from '@/types';

const FONT_REG = path.join(process.cwd(), 'public/fonts/NotoSans-Regular.ttf');
const FONT_BOLD = path.join(process.cwd(), 'public/fonts/NotoSans-Bold.ttf');

type FilterMeta = {
  from?: string;
  to?: string;
  motor?: string;
  category?: string;
  technician?: string;
  status?: string;
  priority?: string;
};

function fmtDate(v: unknown): string {
  if (!v) return '—';
  const d = new Date(String(v));
  if (Number.isNaN(d.getTime())) return String(v);
  return d.toLocaleString('tr-TR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function fmtMin(m: number | null | undefined): string {
  if (m == null || !Number.isFinite(m)) return '—';
  const h = Math.floor(m / 60);
  const min = m % 60;
  if (h <= 0) return `${min} dk`;
  return `${h} sa ${min} dk`;
}

function statusTr(s: string): string {
  const map: Record<string, string> = {
    acik: 'Açık',
    atandi: 'Atandı',
    devam_ediyor: 'Devam Ediyor',
    revizyon: 'Revizyon',
    onay_bekliyor: 'Onay Bekliyor',
    onaylandi: 'Onaylandı',
    iptal: 'İptal',
  };
  return map[s] || s;
}

function priorityTr(s: string): string {
  const map: Record<string, string> = {
    kritik: 'Kritik',
    yuksek: 'Yüksek',
    orta: 'Orta',
    dusuk: 'Düşük',
  };
  return map[s] || s;
}

export async function buildReportPdf(
  payload: ReportPayload,
  filters: FilterMeta = {},
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: 'A4',
      margin: 40,
      bufferPages: true,
      info: {
        Title: 'AGM Arızi Bakım Merkezi — Rapor',
        Author: 'AGM Arızi Bakım Merkezi',
        Subject: 'Arıza ve bakım performans raporu',
      },
    });

    const chunks: Buffer[] = [];
    doc.on('data', (c) => chunks.push(c as Buffer));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    try {
      doc.registerFont('Noto', FONT_REG);
      doc.registerFont('NotoBold', FONT_BOLD);
    } catch {
      // Fallback if fonts missing in some environments
      doc.font('Helvetica');
    }

    const pageW = doc.page.width;
    const left = 40;
    const right = pageW - 40;
    const contentW = right - left;

    function setFontRegular(size = 10) {
      try {
        doc.font('Noto').fontSize(size);
      } catch {
        doc.font('Helvetica').fontSize(size);
      }
    }
    function setFontBold(size = 10) {
      try {
        doc.font('NotoBold').fontSize(size);
      } catch {
        doc.font('Helvetica-Bold').fontSize(size);
      }
    }

    // —— Header ——
    doc.rect(0, 0, pageW, 72).fill('#0f2744');
    setFontBold(16);
    doc.fillColor('#ffffff').text('AGM ARIZİ BAKIM MERKEZİ', left, 18, { width: contentW });
    setFontRegular(10);
    doc.fillColor('#c8d6e5').text('Profesyonel Arıza & Performans Raporu', left, 40, { width: contentW });
    setFontRegular(8);
    doc.text(`Oluşturma: ${new Date().toLocaleString('tr-TR')}`, left, 54, { width: contentW, align: 'right' });

    let y = 90;
    doc.fillColor('#111827');

    // —— Filter summary ——
    setFontBold(11);
    doc.text('Rapor Kapsamı', left, y);
    y += 16;
    setFontRegular(9);
    const filterLines: string[] = [];
    if (filters.from || filters.to) {
      filterLines.push(`Tarih: ${filters.from || '…'} — ${filters.to || '…'}`);
    } else {
      filterLines.push('Tarih: Tüm dönem');
    }
    if (filters.motor) filterLines.push(`Motor ID: ${filters.motor}`);
    if (filters.category) filterLines.push(`Kategori: ${filters.category}`);
    if (filters.technician) filterLines.push(`Teknisyen: ${filters.technician}`);
    if (filters.status) filterLines.push(`Durum: ${statusTr(filters.status)}`);
    if (filters.priority) filterLines.push(`Öncelik: ${priorityTr(filters.priority)}`);
    doc.text(filterLines.join('  ·  '), left, y, { width: contentW });
    y += 22;

    // —— KPI boxes ——
    const stats = payload.stats as ReportStats;
    const kpis: Array<[string, string]> = [
      ['Toplam Arıza', String(stats.total ?? 0)],
      ['Aktif', String(stats.active ?? 0)],
      ['Kritik', String(stats.critical ?? 0)],
      ['Onay Bekleyen', String(stats.waiting ?? 0)],
      ['Kapanan', String(stats.closed ?? 0)],
      ['Ort. MTTR', fmtMin(stats.avgMttr)],
      ['Ort. Bildirim', fmtMin(stats.avgResponse)],
      ['Ort. Müdahale', fmtMin(stats.avgIntervention)],
    ];

    const col = 4;
    const boxW = (contentW - 12 * (col - 1)) / col;
    const boxH = 42;
    kpis.forEach((kpi, i) => {
      const colIdx = i % col;
      const rowIdx = Math.floor(i / col);
      const x = left + colIdx * (boxW + 12);
      const by = y + rowIdx * (boxH + 8);
      doc.roundedRect(x, by, boxW, boxH, 4).lineWidth(0.5).strokeColor('#d1d5db').stroke();
      setFontRegular(8);
      doc.fillColor('#6b7280').text(kpi[0], x + 8, by + 8, { width: boxW - 16 });
      setFontBold(12);
      doc.fillColor('#111827').text(kpi[1], x + 8, by + 20, { width: boxW - 16 });
    });
    y += Math.ceil(kpis.length / col) * (boxH + 8) + 16;

    function ensureSpace(need: number) {
      if (y + need > doc.page.height - 50) {
        doc.addPage();
        y = 40;
      }
    }

    function sectionTitle(title: string) {
      ensureSpace(28);
      setFontBold(11);
      doc.fillColor('#0f2744').text(title, left, y);
      y += 6;
      doc
        .moveTo(left, y)
        .lineTo(right, y)
        .strokeColor('#0f2744')
        .lineWidth(1)
        .stroke();
      y += 10;
      doc.fillColor('#111827');
    }

    function simpleTable(
      headers: string[],
      rows: string[][],
      colWidths: number[],
    ) {
      ensureSpace(30);
      const rowH = 16;
      // header
      setFontBold(8);
      doc.fillColor('#ffffff');
      doc.rect(left, y, contentW, rowH).fill('#0f2744');
      let x = left;
      headers.forEach((h, i) => {
        doc.text(h, x + 3, y + 4, { width: colWidths[i] - 6, ellipsis: true });
        x += colWidths[i];
      });
      y += rowH;

      setFontRegular(8);
      rows.forEach((row, ri) => {
        ensureSpace(rowH + 2);
        if (ri % 2 === 0) {
          doc.rect(left, y, contentW, rowH).fill('#f3f4f6');
        }
        doc.fillColor('#111827');
        x = left;
        row.forEach((cell, i) => {
          doc.text(cell, x + 3, y + 4, { width: colWidths[i] - 6, ellipsis: true });
          x += colWidths[i];
        });
        y += rowH;
      });
      y += 12;
    }

    // —— By Motor ——
    if (payload.byMotor?.length) {
      sectionTitle('Motor Bazlı Arıza Dağılımı');
      const rows = payload.byMotor.slice(0, 20).map((g) => [g.name, String(g.count)]);
      simpleTable(['Motor', 'Adet'], rows, [contentW * 0.75, contentW * 0.25]);
    }

    // —— By Category ——
    if (payload.byCategory?.length) {
      sectionTitle('Kategori Dağılımı');
      const rows = payload.byCategory.slice(0, 15).map((g) => [g.name, String(g.count)]);
      simpleTable(['Kategori', 'Adet'], rows, [contentW * 0.75, contentW * 0.25]);
    }

    // —— By Technician ——
    if (payload.byTechnician?.length) {
      sectionTitle('Teknisyen İş Yükü');
      const rows = payload.byTechnician.slice(0, 15).map((g) => [g.name, String(g.count)]);
      simpleTable(['Teknisyen', 'Adet'], rows, [contentW * 0.75, contentW * 0.25]);
    }

    // —— Priority ——
    if (payload.priority?.length) {
      sectionTitle('Öncelik Dağılımı');
      const rows = payload.priority.map((g) => [priorityTr(g.name), String(g.count)]);
      simpleTable(['Öncelik', 'Adet'], rows, [contentW * 0.75, contentW * 0.25]);
    }

    // —— Predictive ——
    if (payload.predictive?.length) {
      sectionTitle('Motor Risk / Öngörü (son 90 gün ağırlıklı)');
      const rows = payload.predictive.slice(0, 15).map((p) => [
        p.name,
        String(p.count),
        String(p.recent90Days),
        p.averageHoursPerBreakdown != null ? String(p.averageHoursPerBreakdown) : '—',
        p.riskLabel,
      ]);
      simpleTable(
        ['Motor', 'Toplam', '90g', 'Ort.Saat/Arıza', 'Risk'],
        rows,
        [contentW * 0.32, contentW * 0.14, contentW * 0.12, contentW * 0.22, contentW * 0.2],
      );
    }

    // —— Root causes ——
    if (payload.rootCauses?.length) {
      sectionTitle('Tekrarlayan Kök Nedenler');
      const rows = payload.rootCauses.slice(0, 12).map((g) => [g.name, String(g.count)]);
      simpleTable(['Kök Neden', 'Adet'], rows, [contentW * 0.8, contentW * 0.2]);
    }

    // —— Detail rows (limited) ——
    const detailRows = (payload.rows || []) as ReportRow[];
    if (detailRows.length) {
      sectionTitle(`Arıza Listesi (ilk ${Math.min(40, detailRows.length)} / ${detailRows.length})`);
      const rows = detailRows.slice(0, 40).map((r) => [
        String(r.code || ''),
        fmtDate(r.createdAt).slice(0, 16),
        String(r.motorName || '').slice(0, 18),
        priorityTr(String(r.priority || '')),
        statusTr(String(r.status || '')),
        String(r.assignedTechnicianName || '—').slice(0, 14),
      ]);
      simpleTable(
        ['Kod', 'Tarih', 'Motor', 'Öncelik', 'Durum', 'Teknisyen'],
        rows,
        [
          contentW * 0.14,
          contentW * 0.18,
          contentW * 0.22,
          contentW * 0.12,
          contentW * 0.16,
          contentW * 0.18,
        ],
      );
    }

    // —— Footer on all pages ——
    const range = doc.bufferedPageRange();
    for (let i = 0; i < range.count; i++) {
      doc.switchToPage(range.start + i);
      const bottom = doc.page.height - 28;
      doc
        .moveTo(left, bottom - 8)
        .lineTo(right, bottom - 8)
        .strokeColor('#d1d5db')
        .lineWidth(0.5)
        .stroke();
      setFontRegular(7);
      doc.fillColor('#6b7280');
      doc.text('AGM Arızi Bakım Merkezi — Gizli / Şirket İçi Kullanım', left, bottom - 2, {
        width: contentW * 0.65,
      });
      doc.text(`Sayfa ${i + 1} / ${range.count}`, left, bottom - 2, {
        width: contentW,
        align: 'right',
      });
    }

    doc.end();
  });
}
