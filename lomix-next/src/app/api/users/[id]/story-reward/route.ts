import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// POST: Ücretsiz story hakkı gönder
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const userId = Number(id);
        const { count } = await req.json();

        const storyCount = count || 1;

        if (storyCount < 1 || storyCount > 100) {
            return NextResponse.json({ message: 'Geçerli bir adet belirtin (1-100)' }, { status: 400 });
        }

        // Her story için bir kayıt oluştur (24 saat süreli)
        const stories = [];
        for (let i = 0; i < storyCount; i++) {
            const expiresAt = new Date();
            expiresAt.setHours(expiresAt.getHours() + 24);

            stories.push({
                userId,
                mediaUrl: '',  // Admin tarafından verilen boş story hakkı
                durationHours: 24,
                expiresAt,
            });
        }

        await prisma.story.createMany({ data: stories });

        await prisma.userLog.create({
            data: {
                userId,
                action: `Story ödülü gönderildi: ${storyCount} adet`,
            }
        });

        return NextResponse.json({ message: `${storyCount} adet story hakkı gönderildi` });
    } catch (error: any) {
        return NextResponse.json({ message: error.message }, { status: 500 });
    }
}
