import { NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
function dateStart(v: string | null) {
    if (!v)
        return undefined;
    const d = new Date(`${v}T00:00:00`);
    return Number.isNaN(d.getTime()) ? undefined : d;
}
function dateEnd(v: string | null) {
    if (!v)
        return undefined;
    const d = new Date(`${v}T23:59:59.999`);
    return Number.isNaN(d.getTime()) ? undefined : d;
}
export async function GET(req: Request) {
    const u = await getCurrentUser();
    if (!u || u.role !== 'yonetici')
        return NextResponse.json({ error: 'Yetkisiz' }, { status: 403 });
    const p = new URL(req.url).searchParams, q: any = {};
    const from = dateStart(p.get('from')), to = dateEnd(p.get('to'));
    if (from || to)
        q.createdAt = { ...(from ? { $gte: from } : {}), ...(to ? { $lte: to } : {}) };
    if (p.get('type'))
        q.type = p.get('type');
    if (p.get('actorId'))
        q.actorId = p.get('actorId');
    if (p.get('breakdownId')) {
        try {
            q.breakdownId = new ObjectId(p.get('breakdownId')!);
        }
        catch {
            return NextResponse.json({ error: 'Geçersiz arıza kimliği' }, { status: 400 });
        }
    }
    const d = await db();
    const rows: any[] = await d.collection('breakdown_events').find(q).sort({ createdAt: -1 }).limit(2000).toArray();
    const ids = [...new Set(rows.map(x => String(x.breakdownId)))];
    const breakdowns: any[] = await d.collection('breakdowns').find({ _id: { $in: rows.map((x: any) => x.breakdownId).filter(Boolean) } }).project({ code: 1, motorName: 1, title: 1 }).toArray();
    const byId = new Map<string, any>(breakdowns.map((x: any) => [String(x._id), x]));
    if (p.get('format') === 'csv') {
        const esc = (v: unknown) => { const raw = String(v ?? ''); const safe = /^[=+\-@]/.test(raw) ? `'${raw}` : raw; return /[\",\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe; };
        const header = ['Tarih', 'İşlem', 'Arıza No', 'Motor', 'Kullanıcı', 'Değişiklik', 'Not'];
        const lines = [header, ...rows.map((x: any) => { const b = byId.get(String(x.breakdownId)); return [x.createdAt instanceof Date ? x.createdAt.toLocaleString('tr-TR') : x.createdAt, x.type, b?.code || '', b?.motorName || '', x.actorName || '', JSON.stringify(x.fieldChanges || {}), x.note || ''].map(esc); })].map(r => r.join(','));
        return new NextResponse('\uFEFF' + lines.join('\n'), { headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': 'attachment; filename="denetim-gunlugu.csv"', 'Cache-Control': 'no-store' } });
    }
    const events = rows.map((x: any) => { const b = byId.get(String(x.breakdownId)); return { ...x, _id: String(x._id), breakdownId: String(x.breakdownId), breakdownCode: b?.code || '', motorName: b?.motorName || '' }; });
    const types = [...new Set(rows.map((x: any) => String(x.type || '')))].filter(Boolean).sort();
    const actors = [...new Map<string, string>(rows.map((x: any) => [String(x.actorId), String(x.actorName || x.actorId)])).entries()].map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name, 'tr'));
    return NextResponse.json({ events, types, actors, count: events.length, breakdownIds: ids });
}

