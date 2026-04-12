import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

/**
 * @swagger
 * /api/mobile/search:
 *   post:
 *     summary: ID'ye Göre Arama (Kullanıcı veya Oda)
 *     description: Kullanıcı ID'si veya Oda ID'sine (roomId) göre tam eşleşme araması yapar.
 *     tags: [Mobile Search]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - query
 *               - category
 *             properties:
 *               query:
 *                 type: string
 *                 example: "admin"
 *               category:
 *                 type: string
 *                 enum: [kullanıcı, oda]
 *                 example: "kullanıcı"
 *     responses:
 *       200:
 *         description: Arama sonuçları listelendi
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       type:
 *                         type: string
 *                       name:
 *                         type: string
 *                       display_id:
 *                         type: string
 *                       avatar_url:
 *                         type: string
 *                       room_id:
 *                         type: string
 *                       owner_id:
 *                         type: string
 *                       viewer_count:
 *                         type: integer
 *                       is_live:
 *                         type: boolean
 *                       mode:
 *                         type: string
 */
export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { query, category } = body;

        if (!query || !category) {
            return NextResponse.json({
                status: false,
                message: "Query ve Category parametreleri zorunludur."
            }, { status: 400 });
        }

        let results: any[] = [];

        // Normalize category for flexible matching
        const normalizedCategory = category.toLowerCase();

        if (normalizedCategory === "kullanıcı" || normalizedCategory === "user") {
            const userId = parseInt(query, 10);
            
            if (isNaN(userId)) {
                return NextResponse.json({
                    status: true,
                    message: "Arama sonuçları listelendi.",
                    data: []
                });
            }

            const user = await prisma.user.findUnique({
                where: { id: userId }
            });

            if (user) {
                results = [{
                    id: String(user.id),
                    type: "people",
                    name: user.fullName || user.username,
                    display_id: String(user.id),
                    avatar_url: user.avatar || "/img/default-avatar.png",
                    room_id: "",
                    owner_id: "",
                    viewer_count: 0,
                    is_live: false,
                    mode: ""
                }];
            }
        } else if (normalizedCategory === "oda" || normalizedCategory === "room") {
            const room = await prisma.room.findUnique({
                where: { roomId: query }
            });

            if (room) {
                results = [{
                    id: String(room.id),
                    type: "room",
                    name: room.name,
                    display_id: room.roomId,
                    avatar_url: room.thumbnailUrl || "/img/default-room.png",
                    room_id: room.roomId,
                    owner_id: String(room.ownerId),
                    viewer_count: room.viewerCount,
                    is_live: room.isLive,
                    mode: room.mode
                }];
            }
        } else {
            return NextResponse.json({
                status: false,
                message: "Geçersiz kategori. 'kullanıcı' veya 'oda' olmalıdır."
            }, { status: 400 });
        }

        return NextResponse.json({
            status: true,
            message: "Arama sonuçları listelendi.",
            data: results
        });

    } catch (error: any) {
        console.error("Search API Error:", error);
        return NextResponse.json({
            status: false,
            message: error.message || "Arama sırasında bir hata oluştu."
        }, { status: 500 });
    }
}
