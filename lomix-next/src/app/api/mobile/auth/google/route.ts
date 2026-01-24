import { NextResponse } from 'next/server';
import { handleSocialAuth } from '@/lib/auth-helpers';

export async function POST(req: Request) {
    const result = await handleSocialAuth(req, 'google');

    if (result.error) {
        return NextResponse.json({ error_code: result.code, message: result.error }, { status: result.status });
    }
    return NextResponse.json(result.data);
}
