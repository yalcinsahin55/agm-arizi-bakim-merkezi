import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { turkeyWeekStart } from '@/lib/tz';
import { createNotification } from '@/lib/notify';
import type { DutyWeek, User } from '@/types';

type DutyDoc = {
    weekStart: string;
    elektromekanikTechnicianId: string | null;
    elektromekanikTechnicianName: string | null;
    normalTechnicianId: string | null;
    normalTechnicianName: string | null;
    setBy?: string;
    setByName?: string;
    setAt?: Date;
};

function toDutyWeek(weekStart: string, doc: DutyDoc | null): DutyWeek {
    return {
        weekStart,
        elektromekanik: doc?.elektromekanikTechnicianId
            ? { id: doc.elektromekanikTechnicianId, name: doc.elektromekanikTechnicianName || '' }
            : null,
        normal: doc?.normalTechnicianId
            ? { id: doc.normalTechnicianId, name: doc.normalTechnicianName || '' }
            : null,
    };
}

function addWeeks(weekStart: string, count: number): string {
    const d = new Date(`${weekStart}T00:00:00Z`);
    d.setUTCDate(d.getUTCDate() + count * 7);
    return d.toISOString().slice(0, 10);
}

export async function GET(req: Request) {
    const u = await getCurrentUser();
    if (!u) return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 });

    const params = new URL(req.url).searchParams;
    const weeksAhead = Math.min(Math.max(Number(params.get('weeks')) || 1, 1), 6);
    const currentWeekStart = turkeyWeekStart();
    const weekKeys = Array.from({ length: weeksAhead }, (_, i) => addWeeks(currentWeekStart, i));

    const d = await db();
    const rows = await d.collection<DutyDoc>('duty_roster').find({ weekStart: { $in: weekKeys } }).toArray();
    const byWeek = new Map(rows.map((r) => [r.weekStart, r]));
    const roster = weekKeys.map((wk) => toDutyWeek(wk, byWeek.get(wk) || null));

    return NextResponse.json({ currentWeekStart, current: roster[0], roster });
}

const schema = z.object({
    weekStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    elektromekanikTechnicianId: z.string().min(1).nullable(),
    normalTechnicianId: z.string().min(1).nullable(),
});

export async function POST(req: Request) {
    const u = await getCurrentUser();
    if (!u || u.role !== 'yonetici')
        return NextResponse.json({ error: 'Yetkisiz' }, { status: 403 });

    const parsed = schema.safeParse(await req.json().catch(() => null));
    if (!parsed.success)
        return NextResponse.json({ error: 'Geçersiz istek' }, { status: 400 });
    const { weekStart, elektromekanikTechnicianId, normalTechnicianId } = parsed.data;

    if (
        elektromekanikTechnicianId &&
        normalTechnicianId &&
        elektromekanikTechnicianId === normalTechnicianId
    ) {
        return NextResponse.json(
            { error: 'Aynı teknisyen iki nöbet rolüne birden atanamaz' },
            { status: 400 },
        );
    }

    const d = await db();
    const set: Record<string, unknown> = { weekStart, setBy: u._id, setByName: u.name, setAt: new Date() };

    if (elektromekanikTechnicianId) {
        const tech = await d.collection<User>('users').findOne({
            _id: elektromekanikTechnicianId,
            role: 'teknisyen',
            active: true,
        });
        if (!tech)
            return NextResponse.json({ error: 'Elektromekanik teknisyen bulunamadı' }, { status: 404 });
        if ((tech.technicianType || 'normal') !== 'elektromekanik') {
            return NextResponse.json(
                { error: `${tech.name} "elektromekanik" tipinde tanımlı değil. Önce kullanıcı ayarlarından teknisyen tipini güncelleyin.` },
                { status: 400 },
            );
        }
        set.elektromekanikTechnicianId = tech._id;
        set.elektromekanikTechnicianName = tech.name;
    } else {
        set.elektromekanikTechnicianId = null;
        set.elektromekanikTechnicianName = null;
    }

    if (normalTechnicianId) {
        const tech = await d.collection<User>('users').findOne({
            _id: normalTechnicianId,
            role: 'teknisyen',
            active: true,
        });
        if (!tech)
            return NextResponse.json({ error: 'Normal teknisyen bulunamadı' }, { status: 404 });
        if ((tech.technicianType || 'normal') !== 'normal') {
            return NextResponse.json(
                { error: `${tech.name} "normal" tipinde tanımlı değil. Önce kullanıcı ayarlarından teknisyen tipini güncelleyin.` },
                { status: 400 },
            );
        }
        set.normalTechnicianId = tech._id;
        set.normalTechnicianName = tech.name;
    } else {
        set.normalTechnicianId = null;
        set.normalTechnicianName = null;
    }

    await d.collection<DutyDoc>('duty_roster').updateOne(
        { weekStart },
        { $set: set },
        { upsert: true },
    );

    // Nöbet planı eksiksiz hale geldiyse, bu hafta için daha önce yöneticilere
    // gönderilmiş olabilecek "nöbetçi seçilmedi" uyarısını tekrar göndermeyelim;
    // sadece iki teknisyen de atanmışsa ilgili teknisyenlere bilgi verelim.
    if (set.elektromekanikTechnicianId && set.normalTechnicianId) {
        const isCurrentWeek = weekStart === turkeyWeekStart();
        if (isCurrentWeek) {
            for (const [role, id, name] of [
                ['elektromekanik', set.elektromekanikTechnicianId, set.elektromekanikTechnicianName],
                ['normal', set.normalTechnicianId, set.normalTechnicianName],
            ] as const) {
                await createNotification({
                    recipientId: String(id),
                    breakdownId: '',
                    eventId: `duty:${weekStart}:${role}:${id}`,
                    title: 'Bu hafta nöbetçi teknisyensiniz',
                    body: `${weekStart} haftası için ${role === 'elektromekanik' ? 'elektromekanik' : 'normal'} nöbetçi teknisyen olarak atandınız (20:00-06:00 arası arızalar size gelir).`,
                    href: '/teknisyen',
                });
            }
        }
    }

    return NextResponse.json({ ok: true });
}
