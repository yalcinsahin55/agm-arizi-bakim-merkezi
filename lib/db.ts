import { Db, MongoClient } from 'mongodb';
const uri = process.env.MONGODB_URI;
if (!uri)
    throw new Error('MONGODB_URI eksik');
const globalForMongo = globalThis as unknown as {
    mongo?: MongoClient;
};
const client = globalForMongo.mongo ?? new MongoClient(uri);
if (!globalForMongo.mongo)
    globalForMongo.mongo = client;
export async function db(): Promise<Db> {
    await client.connect();
    return client.db(process.env.MONGODB_DB || 'agm_arizi_bakim');
}
export async function indexes() {
    const database = await db();
    await Promise.all([
        database.collection('users').createIndex({ email: 1 }, { unique: true }),
        database.collection('users').createIndex({ role: 1, active: 1 }),
        database.collection('breakdowns').createIndex({ status: 1, createdAt: -1 }),
        database.collection('motors').createIndex({ active: 1, equipmentType: 1, name: 1 }),
        database.collection('motors').createIndex({ legacyKey: 1 }, { sparse: true }),
        database.collection('breakdowns').createIndex({ motorId: 1, createdAt: -1 }),
        database.collection('breakdowns').createIndex({ assignedTechnicianId: 1, status: 1, createdAt: -1 }),
        database.collection('breakdowns').createIndex({ status: 1, assignedAt: 1, seenAt: 1, escalationLevel: 1 }),
        database.collection('breakdowns').createIndex({ archived: 1, status: 1, createdAt: -1 }),
        database.collection('notifications').createIndex({ recipientId: 1, createdAt: -1 }),
        database.collection('notifications').createIndex({ eventId: 1 }, { unique: true }),
        database.collection('notifications').createIndex({ breakdownId: 1, recipientId: 1, createdAt: -1 }),
        database.collection('notifications').createIndex({ pushStatus: 1, attempts: 1, lastPushAt: 1 }),
        database.collection('breakdown_events').createIndex({ breakdownId: 1, createdAt: 1 }),
        database.collection('breakdown_events').createIndex({ eventId: 1 }, { unique: true }),
        database.collection('breakdown_events').createIndex({ actorId: 1, createdAt: -1 }),
        database.collection('breakdown_attachments').createIndex({ breakdownId: 1, createdAt: -1 }),
        database.collection('push_subscriptions').createIndex({ userId: 1 }),
        database.collection('login_attempts').createIndex({ updatedAt: 1 }, { expireAfterSeconds: 1800 }),
        database.collection('rate_limits').createIndex({ windowStart: 1 }, { expireAfterSeconds: 120 }),
        database.collection('sessions').createIndex({ userId: 1, lastSeenAt: -1 }),
        database.collection('sessions').createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }),
    ]);
}

