import { NextResponse } from 'next/server';
import { ObjectId, type Filter } from 'mongodb';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { csvEscape, dateEnd, dateStart } from '@/lib/report-utils';

interface AuditEventDocument {
  _id: ObjectId;
  eventId: string;
  breakdownId?: ObjectId | null;
  type: string;
  actorId: string;
  actorName?: string;
  note?: string;
  fieldChanges?: Record<string, { from: unknown; to: unknown }>;
  createdAt: Date;
}

interface BreakdownLookup {
  _id: ObjectId;
  code?: string;
  motorName?: string;
  title?: string;
}

export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user || user.role !== 'yonetici') {
    return NextResponse.json({ error: 'Yetkisiz' }, { status: 403 });
  }

  const params = new URL(req.url).searchParams;
  const query: Filter<AuditEventDocument> = {};
  const from = dateStart(params.get('from'));
  const to = dateEnd(params.get('to'));
  if (from || to) {
    query.createdAt = {
      ...(from ? { $gte: from } : {}),
      ...(to ? { $lte: to } : {}),
    };
  }
  if (params.get('type')) query.type = params.get('type')!;
  if (params.get('actorId')) query.actorId = params.get('actorId')!;

  if (params.get('breakdownId')) {
    try {
      query.breakdownId = new ObjectId(params.get('breakdownId')!);
    } catch {
      return NextResponse.json({ error: 'Geçersiz arıza kimliği' }, { status: 400 });
    }
  }

  const database = await db();
  const rows = await database
    .collection<AuditEventDocument>('breakdown_events')
    .find(query)
    .sort({ createdAt: -1 })
    .limit(2000)
    .toArray();

  const breakdownIds = rows
    .map((row) => row.breakdownId)
    .filter((id): id is ObjectId => id instanceof ObjectId);

  const breakdowns = await database
    .collection<BreakdownLookup>('breakdowns')
    .find({ _id: { $in: breakdownIds } })
    .project({ code: 1, motorName: 1, title: 1 })
    .toArray();

  const byId = new Map(breakdowns.map((item) => [String(item._id), item]));

  if (params.get('format') === 'csv') {
    const header = ['Tarih', 'İşlem', 'Arıza No', 'Motor', 'Kullanıcı', 'Değişiklik', 'Not'];
    const lines = [
      header,
      ...rows.map((row) => {
        const breakdown = byId.get(String(row.breakdownId));
        return [
          row.createdAt.toLocaleString('tr-TR'),
          row.type,
          breakdown?.code ?? '',
          breakdown?.motorName ?? '',
          row.actorName ?? '',
          JSON.stringify(row.fieldChanges ?? {}),
          row.note ?? '',
        ].map(csvEscape);
      }),
    ].map((row) => row.join(','));

    return new NextResponse(`\uFEFF${lines.join('\n')}`, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': 'attachment; filename="denetim-gunlugu.csv"',
        'Cache-Control': 'no-store',
      },
    });
  }

  const events = rows.map((row) => {
    const breakdown = byId.get(String(row.breakdownId));
    return {
      ...row,
      _id: String(row._id),
      breakdownId: row.breakdownId ? String(row.breakdownId) : '',
      breakdownCode: breakdown?.code ?? '',
      motorName: breakdown?.motorName ?? '',
      createdAt: row.createdAt.toISOString(),
    };
  });

  const types = [...new Set(rows.map((row) => row.type).filter(Boolean))].sort();
  const actors = [...new Map(
    rows.map((row) => [row.actorId, row.actorName || row.actorId] as const),
  ).entries()]
    .map(([id, name]) => ({ id, name }))
    .sort((a, b) => a.name.localeCompare(b.name, 'tr'));

  return NextResponse.json({
    events,
    types,
    actors,
    count: events.length,
    breakdownIds: [...new Set(rows.map((row) => String(row.breakdownId)).filter(Boolean))],
  });
}
