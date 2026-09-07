import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export async function GET() {
  const u = await getCurrentUser();
  if (!u) return NextResponse.json({ error: 'Giriş gerekli' }, { status: 401 });
  const motors = await (await db()).collection('motors').find({ active: true }).sort({ name: 1 }).toArray();
  return NextResponse.json(motors);
}
