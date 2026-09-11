import { randomUUID } from 'node:crypto';
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { rateLimit, rateLimitResponse } from '@/lib/security';
import { getCurrentUser } from '@/lib/auth';
import { writeAudit } from '@/lib/audit';
import type { EquipmentType, Motor } from '@/types';

const equipmentTypes: EquipmentType[] = [
  'motor', 'booster', 'pompa', 'kompresor', 'jenerator', 'alternator', 'diger',
];

function validNumber(value: unknown, min = 0, max = Number.POSITIVE_INFINITY) {
  return typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max;
}

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Giriş gerekli' }, { status: 401 });

  const motors = await (await db()).collection<Motor>('motors')
    .find({ active: true })
    .sort({ equipmentType: 1, name: 1 })
    .toArray();

  return NextResponse.json(motors.map((item) => ({ ...item, _id: String(item._id) })));
}

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user || user.role !== 'yonetici') {
    return NextResponse.json({ error: 'Yetkisiz' }, { status: 403 });
  }

  const limit = await rateLimit(req, 'equipment:write', user, 20);
  if (!limit.ok) return rateLimitResponse(limit.retryAfter);

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  const equipmentType = String(body.equipmentType ?? 'motor') as EquipmentType;

  if (name.length < 2 || name.length > 120) {
    return NextResponse.json({ error: 'Ekipman adı 2-120 karakter olmalıdır.' }, { status: 400 });
  }
  if (!equipmentTypes.includes(equipmentType)) {
    return NextResponse.json({ error: 'Geçersiz ekipman türü.' }, { status: 400 });
  }
  if (body.hours !== undefined && !validNumber(body.hours)) {
    return NextResponse.json({ error: 'Çalışma saati geçersiz.' }, { status: 400 });
  }
  if (body.load !== undefined && !validNumber(body.load, 0, 99999)) {
    return NextResponse.json({ error: 'Yük (kW) geçersiz.' }, { status: 400 });
  }

  const database = await db();
  const duplicate = await database.collection<Motor>('motors').findOne({
    name: { $regex: `^${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, $options: 'i' },
    active: true,
  });
  if (duplicate) {
    return NextResponse.json({ error: 'Aynı isimde aktif bir ekipman zaten var.' }, { status: 409 });
  }

  const now = new Date();
  const motor: Motor = {
    _id: randomUUID(),
    name,
    active: true,
    equipmentType,
    location: typeof body.location === 'string' ? body.location.trim() : undefined,
    description: typeof body.description === 'string' ? body.description.trim() : undefined,
    hours: typeof body.hours === 'number' ? body.hours : 0,
    load: typeof body.load === 'number' ? body.load : 0,
    currentHours: typeof body.hours === 'number' ? body.hours : 0,
    currentLoad: typeof body.load === 'number' ? body.load : 0,
    source: 'local',
    createdAt: now,
    updatedAt: now,
  };

  await database.collection<Motor>('motors').insertOne(motor);
  await writeAudit(database, {
    breakdownId: null,
    eventId: `equipment:${motor._id}:${Date.now()}`,
    type: 'equipment_created',
    actorId: user._id,
    actorName: user.name,
    note: `${name} ekipman envanterine eklendi`,
    fieldChanges: { name: { from: null, to: name }, equipmentType: { from: null, to: equipmentType } },
    createdAt: now,
  });

  return NextResponse.json({ ...motor, _id: String(motor._id) }, { status: 201 });
}
