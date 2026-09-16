// Bu dosya, eskiden burada duran tüm bildirim mantığının yeni parçalanmış
// haline yönlendiren bir "barrel" dosyasıdır. Uygulamanın geri kalanı hâlâ
// '@/lib/notify' üzerinden import yapmaya devam edebilir; hiçbir başka
// dosyayı değiştirmeye gerek kalmaz.
//
// Gerçek kod artık şurada:
//   - lib/push.ts           push bildirimi gönderme
//   - lib/notifications.ts  bildirim oluşturma / yöneticilere iletme / retry
//   - lib/escalation.ts     yanıtsız arızaların otomatik eskalasyonu
//   - lib/duty-reminder.ts  haftalık nöbet planı hatırlatması

export { createNotification, notifyManagers, retryFailedNotifications } from './notifications';
export type { NotificationInput } from './notifications';
export { escalateUnresponsiveBreakdowns } from './escalation';
export { checkWeeklyDutyRoster } from './duty-reminder';
