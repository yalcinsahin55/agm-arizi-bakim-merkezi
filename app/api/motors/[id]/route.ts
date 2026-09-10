import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { rateLimit, rateLimitResponse } from '@/lib/security';
import { getCurrentUser } from '@/lib/auth';
import { writeAudit } from '@/lib/audit';
import type { Motor } from '@/types';
export async function GET(_req: Request, { params }: {
    params: Promise<{
        id: string;
    }>;
}) {
    const user = await getCurrentUser();
    if (!user)
        return NextResponse.json({ error: 'Giriş gerekli' }, { status: 401 });
    const { id } = await params;
    const database = await db();
    const motor = await database.collection<Motor>('motors').findOne({ _id: id, active: true });
    if (!motor)
        return NextResponse.json({ error: 'Motor bulunamadı' }, { status: 404 });
    const rows = await database
        .collection('breakdowns')
        .find({ motorId: id, archived: { $ne: true } })
        .sort({ createdAt: -1 })
        .limit(500)
        .toArray();
    const minutes = (start: unknown, end: unknown) => {
        if (!start || !end)
            return null;
        const a = new Date(String(start)).getTime();
        const b = new Date(String(end)).getTime();
        return Number.isNaN(a) || Number.isNaN(b) ? null : Math.max(0, Math.round((b - a) / 60000));
    };
    const mttr = rows
        .map((row) => minutes(row.startedAt, row.closedAt))
        .filter((value): value is number => value !== null);
    const active = rows.filter((row) => ['acik', 'atandi', 'devam_ediyor', 'revizyon'].includes(String(row.status))).length;
    const critical = rows.filter((row) => row.priority === 'kritik').length;
    const byCategory = [...rows.reduce((map, row) => {
            const key = String(row.categoryName || 'Tanımsız');
            map.set(key, (map.get(key) || 0) + 1);
            return map;
        }, new Map<string, number>())]
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count);
    const monthly = [...rows.reduce((map, row) => {
            const date = new Date(row.createdAt);
            if (Number.isNaN(date.getTime()))
                return map;
            const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            map.set(key, (map.get(key) || 0) + 1);
            return map;
        }, new Map<string, number>())]
        .sort((a, b) => a[0].localeCompare(b[0]))
        .slice(-12)
        .map(([name, count]) => ({ name, count }));
    const hours = typeof motor.hours === 'number' ? motor.hours : null;
    const recentRows = rows.filter((row) => {
        const created = new Date(row.createdAt).getTime();
        return created >= Date.now() - 90 * 24 * 60 * 60 * 1000;
    });
    const closedRows = rows.filter((row) => row.status === 'onaylandi');
    const firstHours = rows
        .map((row) => Number(row.motorHours))
        .filter((value) => Number.isFinite(value) && value >= 0)
        .sort((a, b) => a - b)[0];
    const lastHours = rows
        .map((row) => Number(row.motorHours))
        .filter((value) => Number.isFinite(value) && value >= 0)
        .sort((a, b) => b - a)[0];
    const observedHours = firstHours !== undefined && lastHours !== undefined ? Math.max(0, lastHours - firstHours) : null;
    const breakdownsPerHour = observedHours && observedHours > 0 ? rows.length / observedHours : null;
    const averageHoursPerBreakdown = breakdownsPerHour && breakdownsPerHour > 0 ? Math.round(1 / breakdownsPerHour) : null;
    const risk = Math.min(100, Math.round(Math.min(60, recentRows.length * 12) +
        Math.min(25, critical * 5) +
        (active > 0 ? 15 : 0)));
    const attachments = await database
        .collection('breakdown_attachments')
        .find({ breakdownId: { $in: rows.map((row) => String(row._id)) } })
        .sort({ createdAt: -1 })
        .limit(1000)
        .toArray();
    return NextResponse.json({
        motor: { ...motor, _id: String(motor._id) },
        stats: {
            total: rows.length,
            active,
            critical,
            closed: closedRows.length,
            avgMttr: mttr.length ? Math.round(mttr.reduce((a, b) => a + b, 0) / mttr.length) : null,
            recent90Days: recentRows.length,
        },
        predictive: {
            currentHours: hours,
            averageHoursPerBreakdown,
            observedHours,
            breakdownsPerHour,
            riskScore: risk,
            riskLabel: risk >= 70 ? 'yüksek' : risk >= 40 ? 'orta' : 'düşük',
        },
        byCategory,
        monthly,
        rows: rows.map((row) => ({ ...row, _id: String(row._id) })),
        attachments: attachments.map((item) => ({ ...item, _id: String(item._id) })),
    });
}
export async function PATCH(req: Request, { params }: {
    params: Promise<{
        id: string;
    }>;
}) {
    const user = await getCurrentUser();
    if (!user || user.role !== 'yonetici') {
        return NextResponse.json({ error: 'Yetkisiz' }, { status: 403 });
    }
    const limit = await rateLimit(req, 'motor:write', user, 20);
    if (!limit.ok)
        return rateLimitResponse(limit.retryAfter);
    const { id } = await params;
    const database = await db();
    const motor = await database.collection<Motor>('motors').findOne({ _id: id });
    if (!motor)
        return NextResponse.json({ error: 'Motor bulunamadı' }, { status: 404 });
    const body = (await req.json().catch(() => ({}))) as {
        active?: unknown;
        name?: unknown;
        hours?: unknown;
    };
    const set: Record<string, unknown> = { updatedAt: new Date() };
    if (typeof body.name === 'string' && body.name.trim())
        set.name = body.name.trim();
    if (typeof body.hours === 'number' && Number.isFinite(body.hours) && body.hours >= 0)
        set.hours = body.hours;
    if (body.active === false && motor.active) {
        const activeBreakdowns = await database.collection('breakdowns').countDocuments({
            motorId: id,
            archived: { $ne: true },
            status: { $in: ['acik', 'atandi', 'devam_ediyor', 'revizyon', 'onay_bekliyor'] },
        });
        if (activeBreakdowns > 0) {
            return NextResponse.json({
                error: `Motor pasifleştirilemez. Bu motorda ${activeBreakdowns} aktif arıza bulunuyor. Önce arızaları sonuçlandırın veya yeniden atayın.`,
            }, { status: 409 });
        }
        set.active = false;
        set.deactivatedAt = new Date();
        set.deactivatedBy = user._id;
    }
    else if (body.active === true) {
        set.active = true;
    }
    const result = await database.collection<Motor>('motors').updateOne({ _id: id }, { $set: set });
    if (!result.modifiedCount)
        return NextResponse.json({ ok: true, changed: false });
    await writeAudit(database, {
        breakdownId: null,
        eventId: `motor:${id}:${Date.now()}`,
        type: 'motor_updated',
        actorId: user._id,
        actorName: user.name,
        note: `Motor ${motor.name} güncellendi`,
        fieldChanges: {
            ...(typeof body.active === 'boolean'
                ? { active: { from: motor.active, to: body.active } }
                : {}),
            ...(typeof body.name === 'string' && body.name.trim()
                ? { name: { from: motor.name, to: body.name.trim() } }
                : {}),
        },
        createdAt: new Date(),
    });
    return NextResponse.json({ ok: true });
}

