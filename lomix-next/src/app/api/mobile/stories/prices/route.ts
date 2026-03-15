import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUserId } from '@/lib/current-user';

export async function GET(request: Request) {
    try {
        const userId = await getCurrentUserId(request);
        if (!userId) {
            return NextResponse.json({ status: false, message: "Unauthorized" }, { status: 401 });
        }

        const prices = await prisma.storyPrice.findMany({
            orderBy: { durationHours: 'asc' }
        });

        // Veritabanı boşsa varsayılan fiyatları dön
        const responseData = prices.length > 0 ? prices.map(p => ({
            duration_hours: p.durationHours,
            cost: p.cost,
            label: p.label
        })) : [
            { duration_hours: 6, cost: 50, label: "6 Saat" },
            { duration_hours: 12, cost: 100, label: "12 Saat" },
            { duration_hours: 24, cost: 2000, label: "24 Saat" }
        ];

        return NextResponse.json({
            success: true,
            message: "Fiyat listesi alındı.",
            data: responseData
        });
    } catch (error: any) {
        return NextResponse.json({ status: false, message: error.message }, { status: 500 });
    }
}
