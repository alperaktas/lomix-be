import { NextResponse } from 'next/server';
import { put } from '@vercel/blob';
import { requireAdmin } from '@/lib/admin-auth';

const TYPES: Record<string, string> = { 'image/png': 'png', 'image/webp': 'webp', 'image/jpeg': 'jpg', 'image/gif': 'gif' };
const MAX_BYTES = 2 * 1024 * 1024;

/** Seviye rozeti görselini yükler ve adresini döner; adres sonra seviye kaydına yazılır. */
export async function POST(request: Request) {
    if (!(await requireAdmin(request))) {
        return NextResponse.json({ error: 'Admin yetkisi gerekli.' }, { status: 403 });
    }
    try {
        const form = await request.formData();
        const file = form.get('file');
        if (!file || typeof file === 'string' || file.size === 0) {
            return NextResponse.json({ error: 'Dosya seçilmedi.' }, { status: 400 });
        }
        const ext = TYPES[file.type];
        if (!ext) return NextResponse.json({ error: 'Yalnızca png, webp, jpeg veya gif yüklenebilir.' }, { status: 400 });
        if (file.size > MAX_BYTES) return NextResponse.json({ error: 'Görsel en fazla 2MB olabilir.' }, { status: 400 });

        const blob = await put(`level-images/level_${Date.now()}.${ext}`, file, { access: 'public', addRandomSuffix: true });
        return NextResponse.json({ url: blob.url });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
