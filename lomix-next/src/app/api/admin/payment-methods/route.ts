import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth';
import { getPaymentMethods, savePaymentMethods, validatePaymentMethods } from '@/lib/payment-methods';

const forbidden = () => NextResponse.json({ error: 'Admin yetkisi gerekli.' }, { status: 403 });
const err = (error: string, status: number) => NextResponse.json({ error }, { status });

// GET: sıralı ödeme yöntemi listesi (pasifler dahil)
export async function GET(request: Request) {
    if (!(await requireAdmin(request))) return forbidden();
    return NextResponse.json({ methods: await getPaymentMethods() });
}

// PUT { methods: [{ type, label, isActive }] } — listenin tamamı yazılır, sıra listedeki sıradır
export async function PUT(request: Request) {
    if (!(await requireAdmin(request))) return forbidden();
    try {
        const body = await request.json().catch(() => null);
        const checked = validatePaymentMethods(body?.methods);
        if ('error' in checked) return err(checked.error, 400);
        await savePaymentMethods(checked.methods);
        return NextResponse.json({ methods: checked.methods });
    } catch (error: any) {
        return err(error.message, 500);
    }
}
