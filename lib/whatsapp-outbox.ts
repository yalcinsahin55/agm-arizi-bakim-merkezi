import { ObjectId } from 'mongodb';
import { db } from '@/lib/db';

export type OutboxEvent =
  | 'breakdown_created'
  | 'breakdown_assigned'
  | 'breakdown_accepted'
  | 'breakdown_started'
  | 'breakdown_submitted'
  | 'breakdown_approved'
  | 'breakdown_revision';

export type OutboxStatus = 'pending' | 'processing' | 'sent' | 'failed';

export interface WhatsappOutboxDoc {
  _id?: ObjectId;
  toPhone: string;
  message: string;
  event: OutboxEvent;
  status: OutboxStatus;
  attempts: number;
  nextAttemptAt: Date;
  lastError?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

/** Tetikleyicilerden çağrılır: mesajı kuyruğa yazar, asla burada göndermez. */
export async function queueWhatsappMessage(
  toPhone: string,
  message: string,
  event: OutboxEvent,
) {
  try {
    const d = await db();
    await d.collection<WhatsappOutboxDoc>('whatsapp_outbox').insertOne({
      toPhone,
      message,
      event,
      status: 'pending',
      attempts: 0,
      nextAttemptAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  } catch (e) {
    console.error('WhatsApp outbox yazma hatası:', e);
  }
}

/** Aktif ve WhatsApp açık yöneticilere kuyruk mesajı. */
export async function queueWhatsappToManagers(message: string, event: OutboxEvent) {
  try {
    const d = await db();
    const admins = await d
      .collection('users')
      .find({
        role: 'yonetici',
        active: true,
        whatsappEnabled: { $ne: false },
        phoneNumber: { $exists: true, $ne: '' },
      })
      .toArray();
    await Promise.all(
      admins.map((a) => queueWhatsappMessage(String(a.phoneNumber), message, event)),
    );
  } catch (e) {
    console.error('WhatsApp yönetici kuyruğu hatası:', e);
  }
}
