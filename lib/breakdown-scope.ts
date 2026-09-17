import type { User } from '@/types';

/**
 * Bir kullanıcının hangi arıza kayıtlarını görebileceğini belirleyen MongoDB
 * filtre parçasını üretir: yönetici ve görüntüleyici tüm kayıtları görür,
 * teknisyen sadece kendine atanan kayıtları, operatör ise sadece kendi
 * açtığı kayıtları görür.
 *
 * Bu kural daha önce lib/dashboard-data.ts, app/api/search/route.ts,
 * app/api/breakdowns/route.ts ve app/arizalar/page.tsx dosyalarında ayrı ayrı
 * kopyalanmıştı; erişim kuralı olduğu için tek bir yerden yönetilmesi,
 * ileride bir rol eklendiğinde/değiştiğinde bir kopyanın güncellenmeyi
 * unutup yanlışlıkla fazla veri sızdırmasını önler.
 */
export function breakdownScopeFor(u: Pick<User, 'role' | '_id'>): Record<string, unknown> {
  if (u.role === 'yonetici' || u.role === 'goruntuleyici') return {};
  if (u.role === 'teknisyen') return { assignedTechnicianId: u._id };
  return { createdBy: u._id };
}
