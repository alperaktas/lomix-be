import { NextResponse } from 'next/server';
import { checkUserBanStatus } from '@/lib/ban-check';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
        return NextResponse.json({ banned: false }, { status: 400 });
    }

    const status = await checkUserBanStatus(parseInt(userId, 10));
    return NextResponse.json(status);
}
