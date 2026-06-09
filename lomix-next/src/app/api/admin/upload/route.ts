import { NextResponse } from 'next/server';
import { put, del } from '@vercel/blob';

export async function POST(request: Request) {
    try {
        const formData = await request.formData();
        const file = formData.get('file') as File | null;
        if (!file || typeof file === 'string') {
            return NextResponse.json({ error: 'Dosya bulunamadı.' }, { status: 400 });
        }

        const ext = file.name.split('.').pop() || 'jpg';
        const blob = await put(`admin/${Date.now()}.${ext}`, file, {
            access: 'public',
            addRandomSuffix: true,
        });

        return NextResponse.json({ url: blob.url });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// DELETE /api/admin/upload  body: { url }
export async function DELETE(request: Request) {
    try {
        const { url } = await request.json();
        if (!url) return NextResponse.json({ error: 'url zorunludur.' }, { status: 400 });
        await del(url);
        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
