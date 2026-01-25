import { NextResponse } from 'next/server';

/**
 * @swagger
 * /api/mobile/queue-status:
 *   get:
 *     summary: Mail kuyruk durumunu getir
 *     tags: [Mobile System]
 *     responses:
 *       200:
 *         description: Kuyruk istatistikleri
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 waiting: { type: integer }
 *                 active: { type: integer }
 *                 completed: { type: integer }
 *                 failed: { type: integer }
 *                 delayed: { type: integer }
 */
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
