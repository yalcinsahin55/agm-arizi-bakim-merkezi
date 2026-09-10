import type { Db } from 'mongodb';
export type FieldChange = {
    from: unknown;
    to: unknown;
};
export type FieldChanges = Record<string, FieldChange>;
export function diffFields(before: Record<string, unknown>, after: Record<string, unknown>, fields: readonly string[]): FieldChanges {
    const changes: FieldChanges = {};
    for (const field of fields) {
        const from = before[field] ?? null;
        const to = after[field] ?? null;
        if (JSON.stringify(from) !== JSON.stringify(to))
            changes[field] = { from, to };
    }
    return changes;
}
export async function writeAudit(db: Db, event: Record<string, unknown>) {
    await db.collection('breakdown_events').insertOne({ ...event, createdAt: event.createdAt ?? new Date() });
}

