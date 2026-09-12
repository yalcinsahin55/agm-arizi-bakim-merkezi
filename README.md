# AGM Arızi Bakım Merkezi

Mevcut AGM planlı bakım uygulamasından tamamen bağımsız, arıza/breakdown yönetimi için Next.js + TypeScript + MongoDB tabanlı web uygulaması.

> **Önemli mimari kural:** Bu proje mevcut `agm-bakim-nextjs` (planlı bakım) uygulamasının MongoDB'sine, GitHub reposuna veya Vercel projesine **bağlanmamalıdır**. Kurulum tamamen ayrı kaynaklarla yapılmalıdır. İki sistem arasında yalnızca kullanıcı arayüzünden geçiş planlanır; turbo, intercooler, yağ, siloksan, vibrasyon damperi, alternatör gibi planlı bakım kayıtları bu veritabanına kopyalanmaz. Arızi raporda parça/işlem bilgisi yalnızca müdahalenin bağlamı olarak tutulur.

## Roller
- **Yönetici** — tam yetki: kullanıcı/kategori/nöbet yönetimi, teknisyen atama, onay, arşivleme, denetim günlüğü, raporlar.
- **Teknisyen** — kendisine atanan arızaları görür, bildirimi gördüğünü onaylar, işe başlar, teknik rapor gönderir.
- **Operatör** — arıza açar, kendi açtığı kayıtları görür/düzenler/siler.
- **Üst Düzey / Görüntüleyici** — tüm arızalara ve raporlara salt-okunur erişim.

## Arıza yaşam döngüsü
`Açık → Atandı → Devam Ediyor → Onay Bekliyor → Onaylandı` veya `Revizyon` (revizyon notu zorunludur, döngüde önceki müdahale zaman damgaları temizlenir). Teknisyen bildirim zinciri: **bildirimi gördü → işe başladı → rapor gönderdi**. Terminal durumdaki (onaylanmış/arşivlenmiş) kayıtlar tekrar açılamaz.

## Öne çıkan özellikler

### Arıza ve kategori yönetimi
- Ana kategori + alt kategori yönetimi; alt kategoriler yalnızca kendi üst kategorisi seçiliyken listelenir, sunucu tarafında da eşleşme doğrulanır.
- Motor saati, duruş başlangıcı, müdahale başlangıcı, çözüm süresi takibi.
- Teknik rapor, kök neden, düzeltici faaliyet, parça ve malzeme kayıtları.
- Arıza kaydına JPG/PNG/WEBP fotoğraf ve PDF servis dokümanı eklenebilir (Vercel Blob, maks. 6 MB).
- Yönetici için fiziksel silme yerine geri izlenebilir arşivleme; arşivli kayıtlar listelerden ve işlemlerden çıkarılır.
- **Tekrarlayan arıza tespiti:** aynı motor + kategoride son 90 günde tekrar açılan arızalarda hem arıza detayında hem yeni arıza formunda uyarı banner'ı.
- **Global arama (Ctrl/Cmd+K):** arıza kodu/motor/kullanıcı arama; rol bazlı erişim, regex-injection korumalı.

### Nöbetçi teknisyen sistemi (mesai dışı otomatik atama)
- Teknisyenlere **Elektromekanik / Normal** tip ve **nöbetçi ulaşım süresi** (0/30/60/90/120 dk) tanımlanır.
- Ana kategorilere gece/hafta sonu nöbet yönlendirmesi (hangi tip nöbetçiye gideceği) atanır; alt kategoriler üst kategoriden miras alır.
- Yönetici her hafta için 2 nöbetçi (biri Elektromekanik, biri Normal) atar (`/yonetim/nobet`); plan Pazartesi'ye kadar tamamlanmazsa yöneticilere otomatik uyarı gider.
- **Mesai dışı** = hafta içi 20:00–06:00 **veya** Cumartesi/Pazar'ın tamamı.
- "Yeni Arıza" formunda, yalnızca mesai dışı saatlerde görünen **"Arıza kritik, üretim kaybı yaşanabilir"** seçeneği: işaretlenirse kategoriye göre haftanın nöbetçisine otomatik atanır (push + WhatsApp), işaretlenmezse kayıt yönetici mesaiye başlayana kadar manuel bekler.
- Nöbetçi bulunamazsa yöneticilere haftada/tipte bir kez uyarı gider.
- Mesai dışı atamalarda, teknisyenin ulaşım süresi kadar yanıt/işe başlama eskalasyon eşikleri ötelenir; raporlarda **Mesai İçi** ve **Mesai Dışı / Nöbetçi Performansı** SLA metrikleri ayrı hesaplanır.

### Bildirimler
- Kalıcı MongoDB bildirim kayıtları + Web Push + WhatsApp (Vercel Blob değil, ayrı outbox kuyruğu ile kuyruklanıp gönderilir).
- Kullanıcılar profil sayfasından kendi WhatsApp bildirim tercihini yönetebilir.
- Yanıtsız arızalar için kademeli eskalasyon (15 / 30 / 60 dk); nöbetçi ulaşım süresi bu eşiklere otomatik eklenir.
- Bildirim kaydı push gönderimi başarısız olsa bile arıza işlemini bloklamaz; push daha sonra retry cron'u ile tekrar denenir.

### Raporlar ve panolar
- Yönetici/teknisyen/görüntüleyici için ayrı, profesyonel dashboard görünümleri; teknisyen iş yükü görünümü.
- Motor/kategori bazlı Pareto dağılımları, kategori bazlı SLA, aylık trend, öncelik dağılımı, tekrarlayan kök nedenler, motor risk/öngörü görünümü (son 90 gün arıza sıklığı, ort. saat/arıza, risk etiketi).
- CSV ve PDF dışa aktarma.
- Denetim günlüğü (`/yonetim/audit`) sayfalı yüklenir ("Daha Fazla Yükle"), tarih/tip/kullanıcı filtreli.

### Güvenlik
- Başarısız giriş denemeleri e-posta + istemci anahtarı bazında kısa süreli sınırlandırılır (MongoDB TTL ile temizlenir); login dışındaki mutasyon endpoint'lerine de kullanıcı/IP bazlı rate limiting uygulanır.
- Server-side motor/kategori/alt kategori doğrulaması; teknisyen ataması yarış durumuna karşı atomik durum kontrolüyle korunur.
- Yönetici kendi hesabını kilitleyemez, son aktif yöneticiyi pasifleştiremez.
- Arıza olaylarına (`breakdown_events`) `fieldChanges` ile eski/yeni değer diff'i kaydedilir.
- Arama ucu (global arama, kategori/kullanıcı sorguları) regex/NoSQL-injection'a karşı `escapeRegex` ile korunur.
- RBAC yetki matrisi (`can()`) hiçbir Next.js çalışma zamanı bağımlılığı olmayan `lib/permissions.ts` içinde tutulur; `lib/auth.ts` bunu geriye dönük uyumluluk için yeniden dışa aktarır — bu ayrım sayesinde yetki mantığı düz Node.js test ortamında da güvenle test edilebilir.

## Demo kullanıcılar
| E-posta | Rol |
|---|---|
| `admin@agm.local` | Yönetici |
| `teknisyen@agm.local` | Teknisyen |
| `operator@agm.local` | Operatör |
| `ceo@agm.local` | Üst Düzey / Görüntüleyici |

Varsayılan geliştirme/demo şifresi: `ChangeMe123!`. Canlı/production seed sırasında `SEED_DEMO_PASSWORD` environment variable'ı ile güçlü bir ilk şifre belirleyin; bu değer GitHub'a yazılmaz.

> Mevcut teknisyenlerin `technicianType` alanı boşsa varsayılan "Normal" kabul edilir; nöbet planında Elektromekanik teknisyen görünmesi için Kullanıcılar sayfasından ilgili teknisyenlerin tipini güncelleyin. Aynı şekilde mevcut ana kategorilerin gece yönlendirmesi de varsayılan olarak "Normal"dır — Kategoriler sayfasından güncellenebilir.

## Kurulum
1. Yeni bir MongoDB veritabanı oluşturun (mevcut planlı bakım veritabanıyla paylaşılmamalı).
2. `.env.example` dosyasını `.env.local` olarak kopyalayın ve aşağıdaki değerleri doldurun.
3. `npm install`
4. `npm run vapid` (Web Push VAPID anahtarları üretir, `.env.local`'a yazın)
5. `npm run seed` (demo kullanıcılar, kategoriler ve `data/agm-motors.json` içindeki motorları yükler)
6. `npm run dev`

### Environment değişkenleri (`.env.local`)
| Değişken | Açıklama |
|---|---|
| `MONGODB_URI`, `MONGODB_DB` | Bu projeye özel, ayrı MongoDB bağlantısı |
| `JWT_SECRET` | Oturum imzalama anahtarı — production'da en az 32 karakter zorunlu |
| `VAPID_SUBJECT`, `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | Web Push için (`npm run vapid` ile üretilir) |
| `CRON_SECRET` | `/api/cron/notifications` ucunu korumak için `Authorization: Bearer <CRON_SECRET>` |
| `NEXT_PUBLIC_APP_URL` | Bildirim/WhatsApp mesajlarındaki bağlantılar için tam site adresi |
| `BLOB_READ_WRITE_TOKEN` | Arıza eki (fotoğraf/PDF) yüklemeleri için Vercel Blob |
| `SEED_DEMO_PASSWORD` | *(opsiyonel)* Production seed'de demo kullanıcı şifresi |

## Test ve doğrulama
```bash
npm run typecheck   # tsc --noEmit
npm run lint        # eslint .
npm run test        # tsx --test "tests/**/*.test.ts"
npm run verify       # üçünü sırayla çalıştırır — her PR öncesi önerilir
```
`tests/` altında RBAC yetki matrisi, arıza iş akışı geçişleri, tekrarlayan arıza eşikleri, Türkiye saat dilimi (mesai dışı/hafta sonu sınırları), regex-injection koruması ve rapor yardımcıları için otomatik testler bulunur.

## Vercel dağıtımı ve cron
Cron endpoint'i: `/api/cron/notifications` — `CRON_SECRET` ile korunur ve şunları yapar:
- Başarısız push bildirimlerini yeniden dener,
- Yanıtsız arızaları eskale eder,
- Pazartesi günleri o haftanın nöbet planı eksikse yöneticilere uyarır.

`vercel.json` içindeki Vercel Cron, Hobby planın günlük sınırı nedeniyle günde 1 kez (`0 3 * * *` UTC → 06:00 Türkiye saati) çalışacak şekilde ayarlıdır. Bildirim tekrar deneme/eskalasyonun gerçek zamanlıya yakın (ör. 5 dakikada bir) çalışması isteniyorsa, ücretsiz bir dış cron servisi (ör. cron-job.org) aynı endpoint'i `Authorization: Bearer <CRON_SECRET>` header'ıyla çağıracak şekilde ayarlanabilir. Pro plana geçilirse `vercel.json`'daki schedule `*/5 * * * *` olarak değiştirilebilir.

## AGM motor veri seti
`data/agm-motors.json`, mevcut AGM bakım sistemindeki motorların son alınan çalışma saati ve yük değerlerini içerir. `npm run seed` bu motorları ilk kurulumda yeni veritabanına aktarır; mevcut motorların çalışma saatlerini tekrar seed çalıştırıldığında üzerine yazmaz. Canlı sistemden yeni bir aktarım için: `npm run import:engines -- /path/seed_data.json` (hem eski `engines/oil/maintTypes` export formatını hem `data/agm-motors.json` içindeki `motors[]` snapshot formatını destekler).

## Proje yapısı (özet)
```
app/                    Next.js App Router sayfaları ve API route'ları
  api/                  Sunucu uçları (breakdowns, duty, categories, users, reports, cron, ...)
  yonetim/              Yönetici sayfaları (kullanıcılar, kategoriler, nöbet planı, denetim günlüğü, oturumlar)
  arizalar/             Arıza listesi, oluşturma, detay, düzenleme
components/             Paylaşılan React bileşenleri (breakdown, reports, profile, ui/...)
lib/                    Sunucu/paylaşılan mantık (auth, permissions, db, notify, tz, night-duty-assign, ...)
scripts/                seed, vapid, import, migrate, workflow-check
tests/                  Node test runner ile otomatik testler
```
