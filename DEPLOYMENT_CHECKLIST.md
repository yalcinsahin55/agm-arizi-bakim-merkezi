# AGM Arızi Bakım Merkezi — Production Kontrol Listesi

## Vercel
- `MONGODB_URI` ayrı Arızi Bakım MongoDB cluster/database
- `MONGODB_DB` ör. `agm_arizi_bakim`
- `JWT_SECRET` en az 32 karakter, rastgele
- `CRON_SECRET` güçlü rastgele değer
- `VAPID_SUBJECT`, `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`
- `NEXT_PUBLIC_VAPID_PUBLIC_KEY`
- `BLOB_READ_WRITE_TOKEN` (ek dosyalar kullanılacaksa)

## İlk kurulum
1. `npm install`
2. `npm run seed`
3. Demo kullanıcı şifrelerini production öncesi değiştir/sil.
4. `/api/health` ile Mongo bağlantısını kontrol et.
5. Vercel Cron'un `/api/cron/notifications` endpointine erişebildiğini kontrol et.

## Bildirim senaryosu
1. Operatör arıza açar → yöneticilere bildirim.
2. Yönetici teknisyen atar → teknisyene bildirim.
3. Teknisyen görür → yöneticiye bildirim.
4. Teknisyen kabul eder → yöneticiye bildirim.
5. Teknisyen başlar → yöneticiye bildirim.
6. Teknisyen raporlar → yöneticiye bildirim.
7. Yönetici onaylar veya revizyona gönderir → teknisyene bildirim.
8. Push başarısız olsa bile bildirim DB'de kalır; polling bildirim merkezini besler.
