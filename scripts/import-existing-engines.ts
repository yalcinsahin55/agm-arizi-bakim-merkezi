import fs from 'node:fs';
import { randomUUID } from 'node:crypto';
import { db, indexes } from '../lib/db';

interface MaintenanceType {
  key?: unknown;
  label?: unknown;
  perEngine?: Record<string, { lastHour?: unknown; period?: unknown } | undefined>;
}

interface EngineSnapshot {
  name?: unknown;
  engineName?: unknown;
  key?: unknown;
  legacyKey?: unknown;
  active?: unknown;
  hours?: unknown;
  currentHours?: unknown;
  load?: unknown;
  currentLoad?: unknown;
}

interface MotorSnapshotFile {
  sourceUpdateDate?: unknown;
  updateDate?: unknown;
  motors?: EngineSnapshot[];
  engines?: Record<string, EngineSnapshot>;
  oil?: Record<string, { brand?: unknown; changeHour?: unknown; maxHours?: unknown } | undefined>;
  maintTypes?: MaintenanceType[];
}

const file = process.argv[2];
if (!file) {
  console.error('Kullanım: npm run import:engines -- /path/seed_data.json');
  process.exit(1);
}

const src = JSON.parse(fs.readFileSync(file, 'utf8')) as MotorSnapshotFile;
const database = await db();
await indexes();

let imported = 0;
let skipped = 0;

// New standalone snapshot format: { sourceUpdateDate, motors: [...] }
if (Array.isArray(src.motors)) {
  for (const value of src.motors) {
    const legacyKey = String(value.legacyKey ?? value.key ?? value.name ?? '').trim();
    const name = String(value.name ?? legacyKey).trim();
    if (!legacyKey || !name) {
      skipped++;
      continue;
    }

    const hours = Number(value.hours ?? value.currentHours ?? 0) || 0;
    const load = Number(value.load ?? value.currentLoad ?? 0) || 0;

    await database.collection('motors').updateOne(
      { legacyKey },
      {
        $set: {
          name,
          legacyKey,
          active: value.active !== false,
          source: String('agm-bakim-merkezi'),
          currentHours: hours,
          currentLoad: load,
          sourceUpdateDate: src.sourceUpdateDate ?? src.updateDate ?? null,
          updatedAt: new Date(),
        },
        $setOnInsert: {
          _id: randomUUID(),
          hours,
          load,
          createdAt: new Date(),
          importedAt: new Date(),
        },
      },
      { upsert: true },
    );
    imported++;
  }
} else {
  const engines = src.engines ?? {};
  const oil = src.oil ?? {};
  const maintTypes = src.maintTypes ?? [];

  for (const [key, value] of Object.entries(engines)) {
    const name = String(value?.name ?? value?.engineName ?? key).trim();
    if (!name) {
      skipped++;
      continue;
    }

    const maintenanceSnapshot = maintTypes
      .map((maintenance) => {
        const item = maintenance.perEngine?.[key];
        return item
          ? {
              key: String(maintenance.key ?? ''),
              label: String(maintenance.label ?? ''),
              lastHour: Number(item.lastHour ?? 0) || 0,
              period: Number(item.period ?? 0) || 0,
            }
          : null;
      })
      .filter((item): item is NonNullable<typeof item> => item !== null);

    const oilInfo = oil[key];
    await database.collection('motors').updateOne(
      { legacyKey: key },
      {
        $set: {
          name,
          legacyKey: key,
          active: true,
          source: 'agm-bakim-merkezi',
          currentHours: Number(value?.hours ?? 0) || 0,
          currentLoad: Number(value?.load ?? 0) || 0,
          oil: oilInfo
            ? {
                brand: String(oilInfo.brand ?? ''),
                changeHour: Number(oilInfo.changeHour ?? 0) || 0,
                maxHours: Number(oilInfo.maxHours ?? 0) || 0,
              }
            : null,
          maintenanceSnapshot,
          sourceUpdateDate: src.updateDate ?? null,
          updatedAt: new Date(),
        },
        $setOnInsert: {
          _id: randomUUID(),
          createdAt: new Date(),
        },
      },
      { upsert: true },
    );
    imported++;
  }
}

console.log(`Motor aktarımı tamamlandı: ${imported}${skipped ? ` (atlanan: ${skipped})` : ''}`);
