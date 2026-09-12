import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import ChangePasswordForm from '@/components/profile/ChangePasswordForm';
import NotificationPreferences from '@/components/profile/NotificationPreferences';
import PushSetup from '@/components/PushSetup';

const roleLabel: Record<string, string> = {
  yonetici: 'Yönetici',
  teknisyen: 'Teknisyen',
  operator: 'Operatör',
  goruntuleyici: 'Üst Düzey / Görüntüleyici',
};

export default async function ProfilePage() {
  const u = await getCurrentUser();
  if (!u) redirect('/giris');

  return (
    <>
      <h1 className="page-title">Hesabım</h1>
      <p className="muted">Hesap bilgileriniz ve şifre ayarlarınız.</p>

      <div className="card" style={{ marginTop: 16 }}>
        <h2>Hesap Bilgileri</h2>
        <div className="report-filters" style={{ marginTop: 8 }}>
          <div>
            <div className="muted" style={{ fontSize: 12 }}>
              Ad Soyad
            </div>
            <b>{u.name}</b>
          </div>
          <div>
            <div className="muted" style={{ fontSize: 12 }}>
              Kullanıcı Adı (Telefon)
            </div>
            <b>{u.phoneNumber || '—'}</b>
          </div>
          <div>
            <div className="muted" style={{ fontSize: 12 }}>
              Rol
            </div>
            <b>{roleLabel[u.role] || u.role}</b>
          </div>
        </div>
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <h2>Bildirim Tercihleri</h2>
        <p className="muted">
          Arıza bildirimlerini hangi kanallardan almak istediğinizi buradan yönetebilirsiniz.
        </p>
        <NotificationPreferences
          initialWhatsappEnabled={u.whatsappEnabled !== false}
          hasPhone={!!u.phoneNumber}
        />
        <div style={{ marginTop: 4 }}>
          <PushSetup compact />
        </div>
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <h2>Şifremi Değiştir</h2>
        <p className="muted">
          Şifrenizi değiştirmek için mevcut şifrenizi doğrulamanız gerekir. Şifrenizi unuttuysanız
          yöneticinizden sıfırlamasını isteyin.
        </p>
        <ChangePasswordForm />
      </div>
    </>
  );
}
