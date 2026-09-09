import { Schema, model, models } from 'mongoose';

export type OutboxEvent = 'breakdown_created' | 'breakdown_assigned';

const WhatsappOutboxSchema = new Schema(
  {
    toPhone: { type: String, required: true },
    message: { type: String, required: true },
    event: { type: String, enum: ['breakdown_created', 'breakdown_assigned'], required: true },
    status: { type: String, enum: ['pending', 'processing', 'sent', 'failed'], default: 'pending', index: true },
    attempts: { type: Number, default: 0 },
    nextAttemptAt: { type: Date, default: () => new Date() },
    lastError: { type: String },
  },
  { timestamps: true }
);

export const WhatsappOutbox =
  (models.WhatsappOutbox as any) || model('WhatsappOutbox', WhatsappOutboxSchema);

/** Tetikleyicilerden çağrılır: mesajı kuyruğa yazar, asla burada göndermez. */
export async function queueWhatsappMessage(toPhone: string, message: string, event: OutboxEvent) {
  try {
    await WhatsappOutbox.create({ toPhone, message, event });
  } catch (e) {
    console.error('WhatsApp outbox yazma hatası:', e);
  }
}
