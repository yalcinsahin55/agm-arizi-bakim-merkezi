import { getCurrentUser } from '@/lib/auth';
import Link from 'next/link';
import PushSetup from '@/components/PushSetup';
import DashboardKpis from '@/components/dashboard/DashboardKpis';
import RecentBreakdowns from '@/components/dashboard/RecentBreakdowns';
import TechnicianWorkload from '@/components/dashboard/TechnicianWorkload';
import TrendBars from '@/components/dashboard/TrendBars';
import Logo from '@/components/Logo';
import LiveClock from '@/components/LiveClock';
import { getDashboardData } from '@/lib/dashboard-data';

export default async function Home() {
  const u = await getCurrentUser();
  if (!u) {
    return (
      <div className="login">
        <div className="card">
          <h1 className="page-title">AGM Arızi Bakım Merkezi</h1>
          <p className="muted">Arıza yönetimi ve teknisyen müdahale merkezi</p>
          <Link className="btn primary" href="/giris">
            Giriş yap
          </Link>
        </div>
      </div>
    );
  }

  const {
    open,
    critical,
    approval,
    closed,
    notSeen,
    avgMttr,
    motorCount,
    recent,
    techWork,
    weekTrend,
    todayTrend,
    dutyIncomplete,
    dutyElektromekanikName,
    dutyNormalName,
    title,
    greet,
    roleMsg,
    todayLabel,
  } = await getDashboardData(u);

  return (
    <>
      <section className="hero-banner">
        <div className="hero-left">
          <Logo size={40} className="hero-logo" />
          <div style={{ minWidth: 0 }}>
            <div className="eyebrow">AVCIKORU SANTRALİ</div>
            <h2>
              {greet}, {String(u.name).split(' ')[0]}
            </h2>
            <div className="muted" style={{ fontSize: 13 }}>
              {roleMsg}
            </div>
            <div className="muted" style={{ marginTop: 6, fontSize: 12 }}>
              {motorCount} motor · {todayLabel} · <LiveClock />
            </div>
          </div>
        </div>
        <div className="hero-status">
          <span className="muted">DURUM</span>
          <b>● Aktif</b>
        </div>
      </section>

      <div className="dashboard-head">
        <div>
          <div className="eyebrow">AGM • ARİZİ BAKIM</div>
          <h1 className="page-title">{title}</h1>
          <p className="muted">
            {u.role === 'goruntuleyici'
              ? 'Salt-okunur yönetim görünümü · operasyon KPI özeti'
              : 'Arıza, müdahale ve onay süreçlerinin merkezi takibi'}
          </p>
        </div>
        <div className="row">
          <span className="badge">{u.name}</span>
          {dutyElektromekanikName && (
            <span className="badge" title="Bu haftanın elektromekanik nöbetçisi">
              🛠 EM Nöbetçi: {dutyElektromekanikName}
            </span>
          )}
          {dutyNormalName && (
            <span className="badge" title="Bu haftanın normal nöbetçisi">
              🛠 Nöbetçi: {dutyNormalName}
            </span>
          )}
          {u.role === 'yonetici' && dutyIncomplete && (
            <Link className="badge duty-missing-badge" href="/yonetim/nobet" title="Bu hafta nöbet planı eksik">
              ⚠ Nöbet planlanmadı
            </Link>
          )}
          {(u.role === 'yonetici' || u.role === 'operator') && (
            <Link className="btn primary" href="/arizalar/yeni">
              + Yeni Arıza
            </Link>
          )}
        </div>
      </div>

      <DashboardKpis
        open={open}
        critical={critical}
        approval={approval}
        closed={closed}
        notSeen={notSeen}
        avgMttr={avgMttr}
        isManager={u.role === 'yonetici'}
      />

      {u.role === 'yonetici' && (
        <section className="ops-alert card">
          <div>
            <b>Operasyon uyarısı</b>
            <span>
              {notSeen
                ? `${notSeen} atanmış arıza teknisyen tarafından henüz görülmedi.`
                : 'Bekleyen teknisyen bildirimi yok.'}
            </span>
          </div>
          {notSeen > 0 && (
            <Link className="btn danger" href="/arizalar">
              Kontrol Et
            </Link>
          )}
        </section>
      )}

      <div className="trend-grid" style={{ marginTop: 18 }}>
        <TrendBars
          title="Bugün (saat dilimi)"
          subtitle="Bugün oluşturulan arıza dağılımı"
          points={todayTrend}
        />
        <TrendBars
          title="Son 7 gün"
          subtitle="Açılan / kapanan arıza"
          points={weekTrend}
          showClosed
        />
      </div>

      <div className="dashboard-grid" style={{ marginTop: 18 }}>
        <RecentBreakdowns recent={recent} />
        <section className="card">
          <h2>Operasyon Özeti</h2>
          <div className="summary-list">
            <div>
              <span>Aktif arıza</span>
              <b>{open}</b>
            </div>
            <div>
              <span>Kritik (aktif)</span>
              <b>{critical}</b>
            </div>
            <div>
              <span>Onay bekleyen</span>
              <b>{approval}</b>
            </div>
            <div>
              <span>MTTR</span>
              <b>
                {avgMttr === null
                  ? '—'
                  : `${Math.floor(avgMttr / 60)}s ${avgMttr % 60}dk`}
              </b>
            </div>
          </div>
          <div className="quick-grid" style={{ marginTop: 14 }}>
            {u.role !== 'goruntuleyici' && (
              <Link className="quick" href="/arizalar/yeni">
                <b>Arıza Kaydı Aç</b>
                <span>Yeni duruş veya arıza bildir</span>
              </Link>
            )}
            <Link className="quick" href="/arizalar">
              <b>Arıza Kayıtları</b>
              <span>Filtrele ve süreci takip et</span>
            </Link>
            {(u.role === 'yonetici' || u.role === 'goruntuleyici') && (
              <Link className="quick" href="/raporlar">
                <b>Raporlama Merkezi</b>
                <span>KPI, trend ve yönetim raporları</span>
              </Link>
            )}
          </div>
        </section>
      </div>

      {u.role === 'yonetici' && <TechnicianWorkload items={techWork} />}
      {u.role === 'goruntuleyici' && (
        <section className="viewer-note card">
          <b>Salt-okunur mod</b>
          <span>
            Bu hesap arıza kayıtlarını ve raporları görüntüleyebilir; işlem, atama, kullanıcı ve
            kategori yönetimi yapamaz.
          </span>
        </section>
      )}
      {u.role !== 'goruntuleyici' && <PushSetup />}
    </>
  );
}
