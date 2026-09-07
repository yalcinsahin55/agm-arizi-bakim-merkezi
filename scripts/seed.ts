import bcrypt from 'bcryptjs';
import { db, indexes } from '../lib/db';
import { ObjectId } from 'mongodb';
import { randomUUID } from 'crypto';
import motorData from '../data/agm-motors.json';

await indexes();
const d = await db();
const pass = await bcrypt.hash('ChangeMe123!', 12);

for (const u of [
  { name: 'AGM Yönetici', email: 'admin@agm.local', role: 'yonetici' },
  { name: 'Demo Teknisyen', email: 'teknisyen@agm.local', role: 'teknisyen' },
  { name: 'Demo Operatör', email: 'operator@agm.local', role: 'operator' },
  { name: 'Demo Üst Düzey', email: 'ceo@agm.local', role: 'goruntuleyici' },
]) {
  await d.collection('users').updateOne({ email: u.email }, { $setOnInsert: { _id: new ObjectId(), ...u, passwordHash: pass, active: true, createdAt: new Date() } }, { upsert: true });
}

for (const name of ['Mekanik', 'Elektriksel', 'Elektronik/Kontrol', 'Yakıt', 'Yağlama', 'Soğutma']) {
  await d.collection('categories').updateOne({ name, parentId: null }, { $setOnInsert: { _id: new ObjectId(), name, parentId: null, active: true, createdAt: new Date() } }, { upsert: true });
}

for (const m of motorData.motors) {
  await d.collection('motors').updateOne(
    { legacyKey: m.legacyKey },
    { $set: { name: m.name, legacyKey: m.legacyKey, active: true, source: m.source, updatedAt: new Date() }, $setOnInsert: { _id: randomUUID(), hours: Number(m.hours) || 0, load: Number(m.load) || 0, createdAt: new Date(), importedAt: new Date() } },
    { upsert: true },
  );
}

console.log(`Seed tamamlandı. ${motorData.motors.length} AGM motoru hazır. Demo şifre: ChangeMe123!`);
process.exit(0);
