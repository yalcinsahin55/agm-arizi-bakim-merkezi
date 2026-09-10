import { getCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { ObjectId } from 'mongodb';
import Link from 'next/link';
import BreakdownActions from '@/components/BreakdownActions';
import BreakdownAttachments from '@/components/BreakdownAttachments';
import BreakdownSummary from '@/components/breakdown/BreakdownSummary';
import TechnicalReport from '@/components/breakdown/TechnicalReport';
import ResponseTracking from '@/components/breakdown/ResponseTracking';
import EventTimeline from '@/components/breakdown/EventTimeline';
import ShareActions from '@/components/breakdown/ShareActions';
import type { Breakdown, BreakdownEvent, Notification } from '@/types';

export default async function Detail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const u = await getCurrentUser();
  if (!u) return null;
  const { id } = await params;
  let oid: ObjectId;
  try {
    oid = new ObjectId(id);
  } catch {
    return <p>Geçersiz arıza kaydı.</p>;
  }
  const d = await db();
  const b = await d.collection('breakdowns').findOne({ _id: oid });
  if (!b) return <p>Arıza bulunamadı.</p>;
  if (u.role === 'operator' && String(b.createdBy) !== u._id)
    return <p>Bu kaydı görüntüleme yetkiniz yok.</p>;
  if (u.role === 'teknisyen' && String(b.assignedTechnicianId) !== u._id)
    return <p>Bu kaydı görüntüleme yetkiniz yok.</p>;

  const events = await d
    .collection('breakdown_events')
    .find({ breakdownId: b._id })
    .sort({ createdAt: 1 })
    .toArray();
  const notifications =
    u.role === 'yonetici'
      ? await d
          .collection('notifications')
          .find({ breakdownId: String(b._id), recipientId: u._id })
          .sort({ createdAt: 1 })
          .toArray()
      : [];

  // Mongo'dan gelen _id alanları ObjectId; bileşenler string _id bekliyor.
  const breakdown: Breakdown = { ...b, _id: String(b._id) } as unknown as Breakdown;
  const eventList: BreakdownEvent[] = events.map((e) => ({ ...e, _id: String(e._id) })) as unknown as BreakdownEvent[];
  const notificationList: Notification[] = notifications.map((n) => ({ ...n, _id: String(n._id) })) as unknown as Notification[];

  // Operatör: kendi açtığı ve hâlâ açık kayıt
  // Yönetici: açık (atanmamış) kayıtları düzenleyebilir; kendi açtığı kayıtlar da dahil
  const isOpen = b.status === 'acik';
  const isCreator = String(b.createdBy) === u._id;
  const canEdit =
    (u.role === 'operator' && isCreator && isOpen) ||
    (u.role === 'yonetici' && isOpen && !b.archived);
  const canAttach =
    u.role === 'yonetici' ||
    (u.role === 'teknisyen' &&
      ['atandi', 'devam_ediyor', 'revizyon'].includes(String(b.status))) ||
    canEdit;

  const homeHref =
    u.role === 'teknisyen' ? '/teknisyen' : '/';

  return (
    <>
      <div className="row">
        <Link className="btn" href={homeHref}>
          ← Ana Sayfa
        </Link>
        <Link className="btn" href="/arizalar">
          Arıza Listesi
        </Link>
        <span className="badge">{b.status}</span>
        <span className={`badge priority-${b.priority}`}>{b.priority}</span>
      </div>
      <h1 className="page-title" style={{ marginTop: 14 }}>
        {b.code} · {b.motorName}
      </h1>
      <p className="muted">
        {b.categoryName}
        {b.subcategoryName ? ` / ${b.subcategoryName}` : ''} · {b.title}
      </p>
      <ShareActions code={String(b.code)} title={String(b.title)} id={id} />
      <div className="split" style={{ marginTop: 16 }}>
        <BreakdownSummary breakdown={breakdown} />
        <div className="card">
          <h2>İşlem</h2>
          {canEdit && (
            <Link className="btn" href={`/arizalar/${id}/duzenle`} style={{ marginBottom: 10 }}>
              Arızayı Düzenle (motor / kategori / detay)
            </Link>
          )}
          <BreakdownActions breakdown={JSON.parse(JSON.stringify(b))} user={u} />
        </div>
      </div>
      <TechnicalReport breakdown={breakdown} />
      {u.role === 'yonetici' && (
        <ResponseTracking breakdown={breakdown} notifications={notificationList} />
      )}
      <BreakdownAttachments id={id} canUpload={canAttach} canDelete={canAttach} />
      {u.role === 'yonetici' && <EventTimeline events={eventList} />}
    </>
  );
}
