import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth';
import { settleAll } from '@/lib/agency-prim';

/**
 * Kapanmış dönemlerin primlerini şimdi öder. Zamanlanmış iş ile aynı işlemi yapar; ikisi aynı anda
 * çalışsa da çift ödeme olmaz. Yalnızca kapanmış dönemler ödenir, süren dönem etkilenmez.
 */
export async function POST(request: Request) {
    if (!(await requireAdmin(request))) {
        return NextResponse.json({ error: 'Admin yetkisi gerekli.' }, { status: 403 });
    }
    try {
        return NextResponse.json({ success: true, ...(await settleAll()) });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
