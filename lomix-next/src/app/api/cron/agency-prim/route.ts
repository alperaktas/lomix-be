import { NextResponse } from 'next/server';
import { timingSafeEqual } from 'crypto';
import { settleAll } from '@/lib/agency-prim';

/**
 * Zamanlanmış iş (vercel.json): her gün Türkiye saatiyle gece yarısından hemen sonra çalışır ve kapanmış
 * günlük/haftalık/aylık dönemlerin primlerini ajans sahiplerine yazar. Vercel, `CRON_SECRET` tanımlıysa
 * isteğe `Authorization: Bearer <CRON_SECRET>` ekler; tanımlı değilse hiçbir istek kabul edilmez.
 */
export async function GET(request: Request) {
    const secret = process.env.CRON_SECRET;
    if (!secret) return NextResponse.json({ error: 'CRON_SECRET tanımlı değil.' }, { status: 503 });

    const given = Buffer.from(request.headers.get('authorization') ?? '');
    const expected = Buffer.from(`Bearer ${secret}`);
    if (given.length !== expected.length || !timingSafeEqual(given, expected)) {
        return NextResponse.json({ error: 'Yetkisiz.' }, { status: 401 });
    }

    try {
        return NextResponse.json({ success: true, ...(await settleAll()) });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
