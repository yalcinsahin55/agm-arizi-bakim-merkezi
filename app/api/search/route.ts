import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { escapeRegex } from '@/lib/escape-regex';

type SearchResult = {
    type: 'breakdown' | 'motor' | 'user';
    id: string;
    title: string;
    subtitle?: string;
    href: string;
};

export async function GET(req: Request) {
    const u = await getCurrentUser();
    if (!u) return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 });

    const q = new URL(req.url).searchParams.get('q')?.trim() || '';
    if (q.length < 2) return NextResponse.json({ results: [] });

    const rx = { $regex: escapeRegex(q), $options: 'i' };
    const d = await db();
    const results: SearchResult[] = [];

    // Arıza kayıtları — kullanıcının zaten görebildiği kayıtlarla sınırlı
    // (rol bazlı erişim /api/breakdowns ile aynı mantığı izler).
    const breakdownScope = {
        archived: { $ne: true },
        ...(u.role === 'yonetici' || u.role === 'goruntuleyici'
            ? {}
            : u.role === 'teknisyen'
                ? { assignedTechnicianId: u._id }
                : { createdBy: u._id }),
        $or: [{ code: rx }, { title: rx }, { motorName: rx }, { categoryName: rx }],
    };
    const breakdowns = await d.collection('breakdowns').find(breakdownScope)
        .project({ code: 1, title: 1, motorName: 1, status: 1 })
        .sort({ createdAt: -1 })
        .limit(8)
        .toArray();
    for (const b of breakdowns) {
        results.push({
            type: 'breakdown',
            id: String(b._id),
            title: `${b.code} · ${b.title}`,
            subtitle: b.motorName,
            href: `/arizalar/${b._id}`,
        });
    }

    // Ekipman/motor
    const motors = await d.collection('motors').find({ name: rx, active: true })
        .project({ name: 1 })
        .limit(6)
        .toArray();
    for (const m of motors) {
        results.push({
            type: 'motor',
            id: String(m._id),
            title: m.name,
            href: `/motorlar/${m._id}`,
        });
    }

    // Kullanıcılar — yalnızca yönetici görebilir
    if (u.role === 'yonetici') {
        const users = await d.collection('users').find({
            $or: [{ name: rx }, { phoneNumber: rx }],
        }).project({ name: 1, role: 1 }).limit(6).toArray();
        for (const usr of users) {
            results.push({
                type: 'user',
                id: String(usr._id),
                title: usr.name,
                subtitle: usr.role,
                href: `/yonetim/kullanicilar`,
            });
        }
    }

    return NextResponse.json({ results });
}
