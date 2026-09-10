import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import type { ReportRow } from '@/types';
import { getCurrentUser } from '@/lib/auth';
import { average, csvEscape, dateEnd, dateStart, minutesBetween } from '@/lib/report-utils';
function groupBy(rows: ReportRow[], idField: string, nameField: string) {
    const map = new Map<string, {
        id: string;
        name: string;
        count: number;
    }>();
    for (const row of rows) {
        const id = String(row[idField] ?? '');
        const name = String(row[nameField] ?? 'Tanımsız');
        if (!id)
            continue;
        const old = map.get(id);
        map.set(id, { id, name, count: (old?.count || 0) + 1 });
    }
    return [...map.values()].sort((a, b) => b.count - a.count);
}
export async function GET(req: Request) {
    const user = await getCurrentUser();
    if (!user || !['yonetici', 'goruntuleyici'].includes(user.role)) {
        return NextResponse.json({ error: 'Yetkisiz' }, { status: 403 });
    }
    const url = new URL(req.url);
    const params = url.searchParams;
    const query: Record<string, unknown> = { archived: { $ne: true } };
    const from = dateStart(params.get('from'));
    const to = dateEnd(params.get('to'));
    if (from || to) {
        query.createdAt = {
            ...(from ? { $gte: from } : {}),
            ...(to ? { $lte: to } : {}),
        };
    }
    const filters: Array<[
        string,
        string
    ]> = [
        ['motorId', 'motor'],
        ['categoryId', 'category'],
        ['assignedTechnicianId', 'technician'],
        ['status', 'status'],
        ['priority', 'priority'],
    ];
    for (const [field, parameter] of filters) {
        const value = params.get(parameter);
        if (value)
            query[field] = value;
    }
    const database = await db();
    const rows = await database
        .collection('breakdowns')
        .find(query)
        .sort({ createdAt: -1 })
        .limit(5000)
        .toArray();
    const typedRows = rows as unknown as ReportRow[];
    const mttrValues = typedRows
        .map((row) => minutesBetween(row.startedAt, row.closedAt))
        .filter((value): value is number => value !== null);
    const responseValues = typedRows
        .map((row) => minutesBetween(row.createdAt, row.seenAt))
        .filter((value): value is number => value !== null);
    const interventionValues = typedRows
        .map((row) => minutesBetween(row.startedAt, row.submittedAt))
        .filter((value): value is number => value !== null);
    const stats = {
        total: rows.length,
        critical: rows.filter((row) => row.priority === 'kritik').length,
        closed: rows.filter((row) => row.status === 'onaylandi').length,
        waiting: rows.filter((row) => row.status === 'onay_bekliyor').length,
        active: rows.filter((row) => ['acik', 'atandi', 'devam_ediyor', 'revizyon'].includes(String(row.status))).length,
        avgMttr: average(mttrValues),
        avgResponse: average(responseValues),
        avgIntervention: average(interventionValues),
    };
    const monthly = (() => {
        const map = new Map<string, number>();
        for (const row of typedRows) {
            const date = new Date(String(row.createdAt));
            if (Number.isNaN(date.getTime()))
                continue;
            const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            map.set(key, (map.get(key) || 0) + 1);
        }
        return [...map.entries()]
            .sort((a, b) => a[0].localeCompare(b[0]))
            .slice(-12)
            .map(([name, count]) => ({ name, count }));
    })();
    const priority = (() => {
        const map = new Map<string, number>();
        for (const row of typedRows) {
            const key = String(row.priority || 'tanımsız');
            map.set(key, (map.get(key) || 0) + 1);
        }
        return [...map.entries()]
            .map(([name, count]) => ({ name, count }))
            .sort((a, b) => b.count - a.count);
    })();
    const byMotor = groupBy(typedRows, 'motorId', 'motorName');
    const byCategory = groupBy(typedRows, 'categoryId', 'categoryName');
    const byTechnician = groupBy(typedRows, 'assignedTechnicianId', 'assignedTechnicianName');
    const rootCauses = (() => {
        const map = new Map<string, number>();
        for (const row of typedRows) {
            const rootCause = String(row.rootCause || '').trim();
            if (!rootCause)
                continue;
            map.set(rootCause, (map.get(rootCause) || 0) + 1);
        }
        return [...map.entries()]
            .map(([name, count]) => ({ name, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 20);
    })();
    const predictive = byMotor.slice(0, 20).map((motor) => {
        const motorRows = typedRows.filter((row) => String(row.motorId) === motor.id);
        const hours = motorRows
            .map((row) => Number(row.motorHours))
            .filter((value) => Number.isFinite(value) && value >= 0)
            .sort((a, b) => a - b);
        const observedHours = hours.length >= 2 ? Math.max(0, hours[hours.length - 1] - hours[0]) : null;
        const perHour = observedHours && observedHours > 0 ? motor.count / observedHours : null;
        const recent90 = motorRows.filter((row) => {
            const created = new Date(String(row.createdAt)).getTime();
            return created >= Date.now() - 90 * 24 * 60 * 60 * 1000;
        }).length;
        const riskScore = Math.min(100, recent90 * 12 + motorRows.filter((row) => row.priority === 'kritik').length * 5);
        return {
            ...motor,
            recent90Days: recent90,
            observedHours,
            breakdownsPerHour: perHour,
            averageHoursPerBreakdown: perHour && perHour > 0 ? Math.round(1 / perHour) : null,
            riskScore,
            riskLabel: riskScore >= 70 ? 'yüksek' : riskScore >= 40 ? 'orta' : 'düşük',
        };
    });
    const payload = {
        stats,
        monthly,
        priority,
        rootCauses,
        byMotor,
        byCategory,
        byTechnician,
        predictive,
        rows: rows.map((row) => ({
            ...row,
            _id: String(row._id),
            createdAt: row.createdAt instanceof Date ? row.createdAt.toISOString() : row.createdAt,
        })),
    };
    if (params.get('format') === 'csv') {
        const header = [
            'Arıza No',
            'Tarih',
            'Motor',
            'Kategori',
            'Alt Kategori',
            'Öncelik',
            'Başlık',
            'Durum',
            'Teknisyen',
            'Bildirim Görüldü',
            'İşe Başlama',
            'Rapor Gönderim',
            'Kapanış',
        ];
        const lines = [
            header,
            ...typedRows.map((row) => [
                row.code,
                row.createdAt instanceof Date ? row.createdAt.toLocaleString('tr-TR') : row.createdAt,
                row.motorName,
                row.categoryName,
                row.subcategoryName,
                row.priority,
                row.title,
                row.status,
                row.assignedTechnicianName,
                row.seenAt,
                row.startedAt,
                row.submittedAt,
                row.closedAt,
            ].map(csvEscape)),
        ].map((row) => row.join(','));
        return new NextResponse(`\uFEFF${lines.join('\n')}`, {
            headers: {
                'Content-Type': 'text/csv; charset=utf-8',
                'Content-Disposition': 'attachment; filename="ariza-raporu.csv"',
            },
        });
    }
    return NextResponse.json(payload);
}

