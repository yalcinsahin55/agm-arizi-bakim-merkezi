import type { Role } from '@/types';

/**
 * Rol bazlı yetki kontrolü. Bilerek `lib/auth.ts`'ten ayrı tutulur: o dosya
 * `next/headers` (cookies) gibi yalnızca bir Next.js istek bağlamında
 * çalışan importlar içerir ve düz bir Node.js test ortamında (tsx --test)
 * modül yüklenirken çöker. Bu dosyanın hiçbir Next.js/sunucu bağımlılığı
 * yoktur, bu yüzden hem uygulama kodunda hem testlerde güvenle kullanılabilir.
 */
export function can(role: Role, action: string) {
    const permissions: Record<Role, string[]> = {
        yonetici: ['*'],
        teknisyen: ['breakdown:view-assigned', 'breakdown:accept', 'breakdown:start', 'breakdown:report'],
        operator: ['breakdown:create', 'breakdown:edit-own', 'breakdown:delete-own', 'breakdown:view-own'],
        goruntuleyici: ['breakdown:view-all', 'report:view'],
    };
    return permissions[role].includes('*') || permissions[role].includes(action);
}
