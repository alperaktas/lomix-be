import { NextResponse } from 'next/server';
import { put } from '@vercel/blob';

export async function POST(req: Request) {
    try {
        const form = await req.formData();
        const file = form.get('file') as File | null;
        const type = form.get('type') as string | null; // "image" | "svga"
        if (!file) return NextResponse.json({ success: false, message: 'Dosya gereklidir.' }, { status: 400 });

        const ext = file.name.split('.').pop()?.toLowerCase() || 'bin';
        const folder = type === 'svga' ? 'emoji-svga' : 'emoji-images';
        const filename = `${folder}/emoji_${Date.now()}.${ext}`;

        const blob = await put(filename, file, { access: 'public' });
        return NextResponse.json({ success: true, url: blob.url });
    } catch (error: any) {
        return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }
}
