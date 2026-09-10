import { getCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';
import TechQueueClient from '@/components/technician/TechQueueClient';

export default async function Tech() {
  const u = await getCurrentUser();
  if (!u) return null;

  const rows = await (await db())
    .collection('breakdowns')
    .find({
      assignedTechnicianId: u._id,
      status: { $in: ['atandi', 'devam_ediyor', 'revizyon'] },
      archived: { $ne: true },
    })
    .sort({ priority: 1, createdAt: 1 })
    .toArray();

  return <TechQueueClient initialRows={JSON.parse(JSON.stringify(rows))} />;
}
