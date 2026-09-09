import { ObjectId } from 'mongodb';
import { db } from '@/lib/db';

export type OutboxEvent = 'breakdown_created' | 'breakdown_assigned';
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
export async function queueWhatsappMessage(toPhone: string, message: string, event: OutboxEvent) {
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
