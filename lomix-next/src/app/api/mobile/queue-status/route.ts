import { NextResponse } from 'next/server';

export async function GET() {
    // Mobil uygulama için kuyruk istatistikleri (Mock)
    return NextResponse.json({
        waiting: 0,
        active: 0,
        completed: 1248,
        failed: 3,
        delayed: 0
    });
}
