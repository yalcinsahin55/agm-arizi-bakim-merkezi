import { db, indexes } from '../lib/db';

await indexes();
const database = await db();

const result = await database.collection('motors').updateMany(
  { equipmentType: { $exists: false } },
  { $set: { equipmentType: 'motor', updatedAt: new Date() } },
);

console.log(`Ekipman türü migration tamamlandı. Güncellenen kayıt: ${result.modifiedCount}`);
