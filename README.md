# AGM Arızi Bakım Merkezi — Avcıkoru Santrali

Motor arıza/duruş kayıtlarının rol bazlı yönetimi, teknisyen atama ve onay akışı,
WhatsApp bildirimleri ve raporlama içeren uçtan uca bakım operasyon sistemi.

## 🚀 Özellikler

- **Rol bazlı yetki:** Yönetici, Teknisyen, Operatör, Üst Düzey Görüntüleyici
- **Telefon kimliği:** Kullanıcı adı = telefon numarası (05xx… otomatik 905xx… normalize edilir).
  Eski hesaplar e-posta ile girmeye devam edebilir.
- **Arıza akışı:** acik → atandi → devam_ediyor → onay_bekliyor → onaylandi / revizyon
- **WhatsApp bildirimleri:** 🚨 YENİ ARIZA (yöneticilere) · 🔧 GÖREV ATANDI (teknisyene) ·
  mesajlarda iş emrine doğrudan giden 🔗 link
- **Toaster bildirimler:** Uygulama içi sağ alt köşede canlı bildirim kartları (10 sn yoklama)
- **Fotoğraf eki:** Vercel Blob depolama
- **Raporlama:** KPI paneli (aktif/kritik/onay/MTTR), teknisyen iş yükü, gelişmiş raporlar
- **Yönetim:** Kullanıcı ekleme/düzenleme/pasifleştirme/silme (güvenli teknisyen devri koruması),
  kategoriler, motor envanteri, aktif oturumlar, denetim günlüğü
- **Olay geçmişi:** Yalnızca yönetici rolüne görünür

## 🏗️ Mimari

| Katman | Teknoloji |
|---|---|
| Web + API | Next.js (App Router) — Vercel |
| Veritabanı | MongoDB Atlas |
| Dosya depolama | Vercel Blob |
| WhatsApp | WAHA (Docker, Ubuntu VM) + outbox worker (cron, dakikada 1) |

### WhatsApp Outbox Akışı
1. Web API'si bildirimi `whatsapp_outbox` koleksiyonuna yazar (`status: pending`).
2. VM'deki **worker** her dakika `GET /api/whatsapp/outbox` ile kuyruğu çeker
   (`X-Outbox-Secret` başlığı ile).
3. Mesajları WAHA `POST /api/sendText` ile gönderir.
4. Sonucu `POST /api/whatsapp/outbox/ack` ile `sent/failed` işaretler.

> Bu tasarım sayesinde Vercel'de uzun koşan süreç gerekmez; gönderim VM'de olur,
> WhatsApp oturumu (QR) VM'de yaşar.

## 🔐 Ortam Değişkenleri

### Vercel
- `MONGODB_URI` — Atlas bağlantı dizesi
- `SESSION_SECRET` — oturum imzalama anahtarı
- `OUTBOX_SECRET` — worker ↔ API kuyruk anahtarı
- `BLOB_READ_WRITE_TOKEN` — Vercel Blob (Storage sekmesinden otomatik eklenir)

### VM (Ubuntu)
- `~/waha/.env` → `WAHA_API_KEY`
- `~/worker/outbox-worker.js` → `APP_URL`, `OUTBOX_SECRET`, `WAHA_SESSION`

## 👥 Roller

| Rol | Yetkiler |
|---|---|
| Yönetici | Atama, onay/revizyon, kullanıcı & kategori yönetimi, olay geçmişi, arşiv |
| Teknisyen | Atanan işi görme/başlatma, kök neden + teknik rapor + düzeltici faaliyet girme |
| Operatör | Arıza kaydı açma/düzenleme (atama öncesi), kendi kayıtlarını izleme |
| Görüntüleyici | Salt okunur panel ve raporlar |

## 🛠️ Kurulum Özeti

1. **Vercel:** Repo'yu import et, env değişkenlerini tanımla, deploy et.
2. **Atlas:** Koleksiyonlar ilk açılışta otomatik oluşturulur (indeksler `lib/db.ts`).
3. **VM:** `docker compose up -d` ile WAHA; QR ile WhatsApp oturumu aç.
4. **Worker:** `~/worker/outbox-worker.js` + crontab:
   `* * * * * /usr/bin/node /home/ubuntu/worker/outbox-worker.js >> /home/ubuntu/worker/worker.log 2>&1`
5. **Kullanıcılar:** Yönetici panelinden telefon numarasıyla kullanıcı tanımla.

## 🩺 Sorun Giderme

| Belirti | Çözüm |
|---|---|
| `401 Unauthorized` (outbox) | `OUTBOX_SECRET` Vercel & worker'da aynı mı? Redeploy edildi mi? |
| `DEPLOYMENT_NOT_FOUND` | Yanlış alan adı; Vercel'deki production URL'ini kullan |
| WhatsApp gitmiyor | VM: `tail -f ~/worker/worker.log` · WAHA oturumu aktif mi? |
| Giriş döngüsü | Adres çubuğunda eski `?next=` parametresi var mı? |
| Fotoğraf hatası | `BLOB_READ_WRITE_TOKEN` tanımlı ve redeploy edildi mi? |

---
**AGM · Arızi Bakım Merkezi — Breakdown Control**
