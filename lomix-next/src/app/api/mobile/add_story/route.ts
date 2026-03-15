import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUserId } from '@/lib/current-user';

export async function POST(request: Request) {
    try {
        const userId = await getCurrentUserId(request);
        if (!userId) {
            return NextResponse.json({ status: false, message: "Unauthorized" }, { status: 401 });
        }

        // Multipark/form-data veya JSON desteği
        let mediaUrl = "";
        let durationHours = 24;

        try {
            const formData = await request.formData();
            mediaUrl = formData.get('mediaUrl') as string || "";
            durationHours = parseInt(formData.get('durationHours') as string || "24", 10);
        } catch {
            const body = await request.json();
            mediaUrl = body.mediaUrl || "";
            durationHours = body.durationHours || 24;
        }

        if (!mediaUrl) {
            return NextResponse.json({ status: false, message: "mediaUrl is required" }, { status: 400 });
        }

        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + durationHours);

        const story = await prisma.story.create({
            data: {
                userId,
                mediaUrl,
                durationHours,
                expiresAt
            }
        });

        return NextResponse.json({
            status: true,
            message: "Hikaye eklendi.",
            data: story
        });
    } catch (error: any) {
        return NextResponse.json({ status: false, message: error.message }, { status: 500 });
    }
}
