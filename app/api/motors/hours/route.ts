import { NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import { db } from '@/lib/db';
import { rateLimit, rateLimitResponse } from '@/lib/security';
import { getCurrentUser } from '@/lib/auth';
import { writeAudit } from '@/lib/audit';
import type { Motor } from '@/types';

type HourRow = {
  name?: string;
  hours?: number;
  load?: number;
  motorId?: string;
};


function nextMapValue(map: Record<string, unknown>, needles: string[]): unknown {
  for (const [k, v] of Object.entries(map)) {
    if (needles.some((n) => k.includes(n))) return v;
  }
  return undefined;
}

function normalizeHeader(h: string) {
  return String(h || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/ı/g, 'i')
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ş/g, 's')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c');
}

function parseWorkbook(buffer: ArrayBuffer): HourRow[] {
  const wb = XLSX.read(buffer, { type: 'array' });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  if (!sheet) return [];
  const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' });
  return raw.map((row) => {
    const map: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(row)) {
      map[normalizeHeader(k)] = v;
    }
    const name =
      (map['motor'] as string) ||
      (map['motoraadi'] as string) ||
      (map['ekipman'] as string) ||
      (map['ad'] as string) ||
      (map['name'] as string) ||
      (map['isim'] as string) ||
      '';
    const hoursRaw =
      map['saat'] ??
      map['calismasaati'] ??
      map['motorcalismasaati'] ??
      map['calismaasaati'] ??
      map['hours'] ??
      map['currenthours'] ??
      map['guncelsaat'] ??
      map['guncealsaat'] ??
      nextMapValue(map, ['saat']);
    const loadRaw =
      map['yuk'] ??
      map['load'] ??
      map['currentload'] ??
      map['kw'] ??
      nextMapValue(map, ['yuk', 'load', 'kw']);
    const idRaw = map['id'] ?? map['motorid'] ?? map['_id'];
    const hours = hoursRaw === '' || hoursRaw == null ? undefined : Number(hoursRaw);
    const load = loadRaw === '' || loadRaw == null ? undefined : Number(loadRaw);
    return {
      name: String(name || '').trim(),
      hours: Number.isFinite(hours) ? hours : undefined,
      load: Number.isFinite(load) ? load : undefined,
      motorId: idRaw ? String(idRaw).trim() : undefined,
    };
  });
}

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user || user.role !== 'yonetici') {
    return NextResponse.json({ error: 'Yetkisiz' }, { status: 403 });
  }

  const limit = await rateLimit(req, 'motors:hours', user, 10);
  if (!limit.ok) return rateLimitResponse(limit.retryAfter);

  const contentType = req.headers.get('content-type') || '';
  let rows: HourRow[] = [];

  try {
    if (contentType.includes('multipart/form-data')) {
      const form = await req.formData();
      const file = form.get('file');
      if (!(file instanceof File)) {
        return NextResponse.json({ error: 'Excel dosyası gerekli (file alanı).' }, { status: 400 });
      }
      const name = file.name.toLowerCase();
      if (!name.endsWith('.xlsx') && !name.endsWith('.xls') && !name.endsWith('.csv')) {
        return NextResponse.json({ error: 'Sadece .xlsx, .xls veya .csv dosyaları kabul edilir.' }, { status: 400 });
      }
      const buffer = await file.arrayBuffer();
      if (name.endsWith('.csv')) {
        const text = new TextDecoder('utf-8').decode(buffer);
        const wb = XLSX.read(text, { type: 'string' });
        const sheet = wb.Sheets[wb.SheetNames[0]];
        const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' });
        rows = raw.map((row) => {
          const map: Record<string, unknown> = {};
          for (const [k, v] of Object.entries(row)) map[normalizeHeader(k)] = v;
          const n =
            (map['motor'] as string) ||
            (map['motoraadi'] as string) ||
            (map['ekipman'] as string) ||
            (map['ad'] as string) ||
            (map['name'] as string) ||
            '';
          const hoursRaw =
            map['saat'] ??
            map['calismasaati'] ??
            map['motorcalismasaati'] ??
            map['hours'] ??
            map['guncelsaat'] ??
            nextMapValue(map, ['saat']);
          const loadRaw =
            map['yuk'] ?? map['load'] ?? map['kw'] ?? nextMapValue(map, ['yuk', 'load', 'kw']);
          const hours = hoursRaw === '' || hoursRaw == null ? undefined : Number(hoursRaw);
          const load = loadRaw === '' || loadRaw == null ? undefined : Number(loadRaw);
          return {
            name: String(n || '').trim(),
            hours: Number.isFinite(hours) ? hours : undefined,
            load: Number.isFinite(load) ? load : undefined,
          };
        });
      } else {
        rows = parseWorkbook(buffer);
      }
    } else {
      const body = (await req.json().catch(() => ({}))) as { rows?: HourRow[] };
      if (!Array.isArray(body.rows)) {
        return NextResponse.json({ error: 'JSON body.rows veya multipart file gerekli.' }, { status: 400 });
      }
      rows = body.rows;
    }
  } catch (e) {
    return NextResponse.json({ error: 'Dosya okunamadı', detail: String(e) }, { status: 400 });
  }

  if (!rows.length) {
    return NextResponse.json({ error: 'Dosyada satır bulunamadı.' }, { status: 400 });
  }

  const database = await db();
  const motors = await database.collection<Motor>('motors').find({ active: true }).toArray();
  const byName = new Map(motors.map((m) => [m.name.trim().toLowerCase(), m]));
  const byId = new Map(motors.map((m) => [String(m._id), m]));

  const now = new Date();
  const sourceUpdateDate = now.toISOString();
  let updated = 0;
  let skipped = 0;
  const errors: string[] = [];
  const historyDocs: Array<Record<string, unknown>> = [];

  for (const row of rows) {
    if (row.hours == null && row.load == null) {
      skipped += 1;
      continue;
    }
    if (row.hours != null && (row.hours < 0 || !Number.isFinite(row.hours))) {
      errors.push(`${row.name || row.motorId || '?'}: geçersiz saat`);
      continue;
    }
    if (row.load != null && (row.load < 0 || row.load > 10000 || !Number.isFinite(row.load))) {
      // load can be >100 in some systems (kW?), allow higher
      errors.push(`${row.name || row.motorId || '?'}: geçersiz yük`);
      continue;
    }

    let motor: Motor | undefined;
    if (row.motorId) motor = byId.get(row.motorId);
    if (!motor && row.name) motor = byName.get(row.name.toLowerCase());

    if (!motor) {
      errors.push(`Bulunamadı: ${row.name || row.motorId || '?'}`);
      continue;
    }

    const set: Record<string, unknown> = {
      updatedAt: now,
      sourceUpdateDate,
    };
    if (row.hours != null) {
      set.hours = row.hours;
      set.currentHours = row.hours;
    }
    if (row.load != null) {
      set.load = row.load;
      set.currentLoad = row.load;
    }

    await database.collection('motors').updateOne({ _id: motor._id as any }, { $set: set });

    historyDocs.push({
      motorId: String(motor._id),
      motorName: motor.name,
      previousHours: motor.currentHours ?? motor.hours ?? null,
      newHours: row.hours ?? motor.currentHours ?? motor.hours ?? null,
      previousLoad: motor.currentLoad ?? motor.load ?? null,
      newLoad: row.load ?? motor.currentLoad ?? motor.load ?? null,
      updatedBy: user._id,
      updatedByName: user.name,
      source: 'excel-upload',
      createdAt: now,
    });
    updated += 1;
  }

  if (historyDocs.length) {
    await database.collection('motor_hour_history').insertMany(historyDocs);
  }

  await writeAudit(database, {
    breakdownId: null,
    eventId: `motors:hours:${Date.now()}`,
    type: 'motors_hours_bulk_update',
    actorId: user._id,
    actorName: user.name,
    meta: { updated, skipped, errorCount: errors.length },
  });

  return NextResponse.json({
    ok: true,
    updated,
    skipped,
    errors,
    totalRows: rows.length,
  });
}

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Giriş gerekli' }, { status: 401 });

  const database = await db();
  const motors = await database
    .collection<Motor>('motors')
    .find({ active: true })
    .project({ name: 1, currentHours: 1, hours: 1, currentLoad: 1, load: 1, equipmentType: 1 })
    .sort({ name: 1 })
    .toArray();

  return NextResponse.json(
    motors.map((m) => ({
      _id: String(m._id),
      name: m.name,
      hours: m.currentHours ?? m.hours ?? 0,
      load: m.currentLoad ?? m.load ?? null,
      equipmentType: m.equipmentType ?? 'motor',
    })),
  );
}
