# AGM Arızi Bakım Merkezi

Mevcut AGM planlı bakım uygulamasından tamamen bağımsız, arıza/breakdown yönetimi için Next.js + TypeScript + MongoDB tabanlı web uygulaması.

## v0.6 kapsamında
- Yönetici / Teknisyen / Operatör / Üst Düzey Görüntüleyici rolleri
- Arıza yaşam döngüsü: Açık → Atandı → Devam Ediyor → Onay Bekliyor → Onaylandı veya Revizyon
- Teknisyen bildirim zinciri: bildirimi gördü → işe başladı → rapor gönderdi
- Kalıcı MongoDB bildirim kayıtları + Web Push + 5 dakikalık Vercel Cron retry
- Yönetici arıza detayında teknisyen yanıt/müdahale durumlarının ayrı takibi
- Profesyonel yönetici/teknisyen/görüntüleyici dashboard görünümü
- Teknisyen iş yükü görünümü
- Motor saati, duruş başlangıcı, müdahale başlangıcı, çözüm süresi
- Teknik rapor, kök neden, düzeltici faaliyet, parça ve malzeme kayıtları
- Yönetici tarafından ana kategori + alt kategori yönetimi
- Üst düzey kullanıcı için salt-okunur arıza ve rapor erişimi
- Server-side motor/kategori/alt kategori doğrulaması
- Kategori seed kayıtları MongoDB ObjectId standardına alındı

## Demo kullanıcılar
- `admin@agm.local` — Yönetici
- `teknisyen@agm.local` — Teknisyen
- `operator@agm.local` — Operatör
- `ceo@agm.local` — Üst Düzey / Görüntüleyici
- Varsayılan geliştirme/demo şifresi: `ChangeMe123!`
- Canlı/production seed sırasında `SEED_DEMO_PASSWORD` environment variable'ı ile güçlü bir ilk şifre belirleyin; bu değer GitHub'a yazılmaz.

## Kurulum
1. Yeni MongoDB veritabanı oluşturun.
2. `.env.example` değerlerini `.env.local` içine kopyalayın.
3. `MONGODB_URI`, `MONGODB_DB`, `JWT_SECRET` ve Web Push için VAPID değerlerini girin.
4. Production seed çalıştıracaksanız `SEED_DEMO_PASSWORD` da tanımlayın.
5. `npm install`
6. `npm run seed`
7. `npm run dev`

## Vercel
Cron endpoint: `/api/cron/notifications`
`CRON_SECRET` ile korunur. `vercel.json` içindeki Vercel Cron, Hobby planın günlük sınırı nedeniyle günde 1 kez (`0 3 * * *`) çalışacak şekilde ayarlanmıştır. Bildirim tekrar deneme/eskalasyonun gerçek zamanlıya yakın (ör. 5 dakikada bir) çalışması için ücretsiz bir dış cron servisi (ör. cron-job.org) kullanılıp aynı endpoint `Authorization: Bearer <CRON_SECRET>` header'ıyla çağrılmalıdır. Pro plana geçilirse `vercel.json`'daki schedule `*/5 * * * *` olarak geri değiştirilebilir.

## Önemli mimari kural
Bu proje mevcut `agm-bakim-nextjs` uygulamasının MongoDB'sine, GitHub reposuna veya Vercel projesine bağlanmamalıdır. İlk kurulum tamamen ayrı kaynaklarla yapılmalıdır.

## Test notu
Kaynak kod üzerinde TypeScript/TSX sözdizimi taraması yapılmıştır. Bu çalışma ortamında `npm install` tamamlanamadığı için gerçek `next build` sonucu doğrulanmış değildir.


## v1.0 Dosya Ekleri
Arıza kayıtlarına JPG/PNG/WEBP fotoğraf ve PDF servis dokümanı eklenebilir. Dosyalar Vercel Blob'da, ek metadata ise MongoDB'de tutulur. Vercel projesinde `BLOB_READ_WRITE_TOKEN` environment variable tanımlanmalıdır. Maksimum dosya boyutu 6 MB'dır.

## AGM motor veri seti

`data/agm-motors.json` mevcut AGM bakım sistemindeki 39 motorun son alınan çalışma saati ve yük değerlerini içerir. `npm run seed` bu motorları ilk kurulumda yeni veritabanına aktarır; mevcut motorların çalışma saatlerini tekrar seed çalıştırıldığında üzerine yazmaz. İsterseniz canlı sistemden yeni bir aktarım için `npm run import:engines -- /path/seed_data.json` komutu kullanılabilir.

## Veri sınırı
Bu proje arızi bakım için bağımsızdır. Planlı bakım sistemindeki turbo, intercooler, yağ, siloksan, vibrasyon damperi, alternatör ve benzeri kayıtları bu veritabanına kopyalamaz. Arızi raporda parça/işlem bilgisi yalnızca müdahalenin bağlamı olarak tutulur. İki sistem arasında yalnızca kullanıcı arayüzünden geçiş planlanır.


## v1.5 güvenlik ve iş akışı notları
- Başarısız giriş denemeleri e-posta + istemci anahtarı bazında kısa süreli sınırlandırılır; MongoDB TTL ile deneme kayıtları temizlenir.
- Teknisyen ataması yalnızca açık/atanmış/revizyon durumlarında yapılabilir; eski teknisyene aktarım bildirimi gönderilir.
- Revizyon işlemi için açıklayıcı not zorunludur ve revizyon döngüsünde önceki müdahale zaman damgaları temizlenir.
- Arızi sistem, planlı bakım sistemindeki turbo/intercooler/yağ/diğer parça yaşam döngüsü verilerini içermez. İki sistem ayrı MongoDB ve ayrı uygulama olarak kalır.


## v1.7
- Technician actions use an atomic assignment guard to prevent a reassigned technician from changing the record.
- Duplicate seen/accept/start actions are idempotent.
- Added notification retry index for cron efficiency.


## v2.3 güvenilirlik ve yetki sertleştirmeleri

v2.3 ile teknisyenin işi kabul etmeden önce bildirimi gördüğünü onaylaması zorunlu hale getirildi; yönetici kendi hesabını kilitleyemez ve son aktif yöneticiyi pasifleştiremez; kategori/bildirim güncellemelerinde bulunamadı kontrolü eklendi; terminal arızaların tekrar iptal edilmesi engellendi.

## v2.1 güvenilirlik notları
- Bildirim kaydı veritabanına yazıldıktan sonra push gönderimi başarısız olsa bile arıza işlemi başarısız sayılmaz; push daha sonra retry cron'u ile denenir.
- Teknisyen ataması yarış durumunda atomik durum kontrolü ile korunur.
- Yönetici revizyon notu arayüzde zorunlu alan olarak tutulur.

## v2.4 düzeltmeleri
- Demo kullanıcıları artık `randomUUID()` string `_id` ile oluşturulur; oturum sorguları ile kullanıcı kimliği tipi tutarlıdır.
- `import:engines` hem eski `engines/oil/maintTypes` export formatını hem de `data/agm-motors.json` içindeki `motors[]` snapshot formatını destekler.
- Next.js 16 için root `proxy.ts` eklendi; sayfa seviyesinde oturum ve rol yönlendirmesi yapılır. API route'ları ayrıca veritabanı tabanlı yetki kontrolünü sürdürür.

## v3.0.0 — güvenlik ve denetim sertleştirmesi
- Login dışındaki mutasyon endpoint'lerine MongoDB tabanlı kullanıcı/IP rate limiting eklendi.
- Breakdown audit olaylarına `fieldChanges` ile eski/yeni değer diff'i eklendi.
- Yönetici için fiziksel silme yerine geri izlenebilir breakdown arşivleme eklendi.
- Arşivli kayıtlar varsayılan listelerden çıkarıldı ve operasyonları kilitlendi.
- Temel domain tipleri (`Breakdown`, `BreakdownEvent`, `Notification`, `Motor`, `Category`, `Attachment`) genişletildi.
- ESLint 9 + `eslint-config-next` ve Prettier yapılandırması eklendi.

## v4.1 — arşiv filtre düzeltmesi, öngörü raporları, çevrimdışı arıza bildirimi
- `archived: true` filtresi ana sayfa, arıza listesi, teknisyen kuyruğu ve motor sayfalarına da uygulandı (önceden yalnızca API'de uygulanıyordu, arşivlenmiş kayıtlar bu sayfalarda görünmeye devam ediyordu).
- Gelişmiş raporlar sayfasına, API'de zaten hesaplanan ama arayüzde gösterilmeyen "Tekrarlayan Kök Nedenler" ve "Motor Risk / Öngörü Görünümü" (son 90 gün arıza sıklığı, ort. saat/arıza, risk etiketi) bölümleri eklendi.
- Çevrimdışı arıza bildirimi: `/arizalar/yeni` formunda ağ hatası oluşursa kayıt tarayıcıda IndexedDB'ye alınır ve Background Sync ile (desteklemeyen tarayıcılarda `online` olayı ile) bağlantı gelince otomatik gönderilir. Kullanıcıya bekleyen kayıt sayısı gösterilir.


## v5.0 — TypeScript ve kalite sertleştirmesi
- Uygulama kaynaklarında kalan `any` kullanımları kaldırıldı; form, rapor, bildirim, motor ve iş akışı tipleri açık hale getirildi.
- Teknisyen/yönetici arıza aksiyonları `lib/breakdown-workflow.ts` içinde merkezi ve test edilebilir hale getirildi.
- Rapor tarih, süre, ortalama ve CSV güvenliği yardımcıları `lib/report-utils.ts` altında toplandı.
- Audit API'si ve rapor yardımcıları güçlü TypeScript tipleriyle yeniden düzenlendi.
- Notification cron endpoint'i artık gerçekten başarısız push bildirimlerini retry ediyor ve yanıtsız arızaları eskale ediyor; önceki sürümde endpoint yalnızca başarı mesajı dönüyordu.
- `workflow-check` scripti JavaScript'ten TypeScript'e taşındı.
- Node test runner + `tsx` ile workflow yetki/geçişleri ve rapor yardımcıları için otomatik testler eklendi.
- `npm run verify` komutu typecheck + lint + test zincirini tek komutta çalıştırır.

### Doğrulama
Bu paket üzerinde bağımlılık kurulumu bu çalışma ortamında ağ/kurulum zaman aşımı nedeniyle tamamlanamadı. Buna rağmen bağımlılıktan bağımsız yeni domain ve rapor yardımcı modülleri `tsc --strict` ile ayrı bir TypeScript derleme kontrolünden geçirildi. Kullanıcı ortamında `npm install` sonrasında önerilen ilk komut `npm run verify` olmalıdır.
