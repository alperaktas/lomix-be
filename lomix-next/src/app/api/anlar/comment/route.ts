import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// DELETE /api/anlar/comment?id=X - yorumu sil (admin)
export async function DELETE(request: Request) {
    const { searchParams } = new URL(request.url);
    const id = Number(searchParams.get('id'));
    if (!id) return NextResponse.json({ error: 'id zorunludur' }, { status: 400 });

    await prisma.anComment.delete({ where: { id } });
    return NextResponse.json({ success: true, message: 'Yorum silindi.' });
}
