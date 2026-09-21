import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

/**
 * /motorlar/gecmis sayfası için: motor_hour_history koleksiyonunu
 * motorId ve/veya tarih aralığına göre filtreleyip sayfalı döndürür.
 *
 * Not: recordDateKey alanı bu özellik eklenmeden önce yazılan eski
 * kayıtlarda yoktur — böyle kayıtlar tarih filtresi uygulandığında
 * listede görünmez (ama motor filtresi tek başına uygulanırsa görünür).
 */
export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Giriş gerekli' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const motorId = searchParams.get('motorId') || '';
  const from = searchParams.get('from') || '';
  const to = searchParams.get('to') || '';
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
  const pageSize = Math.min(200, Math.max(1, parseInt(searchParams.get('pageSize') || '50', 10)));

  const query: Record<string, unknown> = {};
  if (motorId) query.motorId = motorId;
  if (from || to) {
    query.recordDateKey = {
      ...(from ? { $gte: from } : {}),
      ...(to ? { $lte: to } : {}),
    };
  }

  const database = await db();
  const col = database.collection('motor_hour_history');
  const [rows, total] = await Promise.all([
    col
      .find(query)
      .sort({ recordDateKey: -1, motorName: 1, createdAt: -1 })
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .toArray(),
    col.countDocuments(query),
  ]);

  return NextResponse.json({
    rows: rows.map((r) => ({
      _id: String(r._id),
      motorId: r.motorId,
      motorName: r.motorName,
      recordDateKey: r.recordDateKey || (r.createdAt ? new Date(r.createdAt).toISOString().slice(0, 10) : null),
      hours: r.newHours ?? null,
      load: r.newLoad ?? null,
      source: r.source,
      updatedByName: r.updatedByName,
      createdAt: r.createdAt,
    })),
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  });
}
