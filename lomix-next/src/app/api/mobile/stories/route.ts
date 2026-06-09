import { ApiResponseHelper } from '@/lib/api-response';
import prisma from '@/lib/prisma';
import { getCurrentUserId } from '@/lib/current-user';
import { put } from '@vercel/blob';

/**
 * @swagger
 * /api/mobile/stories:
 *   post:
 *     summary: Yeni hikaye oluşturur
 *     tags: [Mobile Stories]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [media_file]
 *             properties:
 *               media_file:
 *                 type: string
 *                 format: binary
 *               duration_hours:
 *                 type: integer
 *                 description: 'Hikaye süresi (saat). Varsayılan: 24'
 *     responses:
 *       201:
 *         description: Hikaye başarıyla eklendi.
 *       400:
 *         description: Dosya bulunamadı veya desteklenmeyen tür.
 *       401:
 *         description: Yetkisiz erişim.
 */
export async function GET(request: Request) {
    try {
        const userId = await getCurrentUserId(request);
        if (!userId) return ApiResponseHelper.error("Yetkisiz erişim", 401);

        const now = new Date();
        const stories = await prisma.story.findMany({
            where: { userId, expiresAt: { gt: now } },
            orderBy: { createdAt: 'desc' },
        });

        return ApiResponseHelper.success(
            stories.map(s => ({
                story_id: s.id,
                media_url: s.mediaUrl,
                duration_hours: s.durationHours,
                expires_at: s.expiresAt,
                created_at: s.createdAt,
            })),
            "Hikayeler listelendi."
        );
    } catch (error: any) {
        return ApiResponseHelper.error(error.message, 500);
    }
}

export async function POST(request: Request) {
    try {
        const userId = await getCurrentUserId(request);
        if (!userId) return ApiResponseHelper.error("Yetkisiz erişim", 401);

        const formData = await request.formData();
        const file = formData.get('media_file') as File | null;
        const durationHours = parseInt(formData.get('duration_hours') as string || '24', 10);

        if (!file || typeof file === 'string') {
            return ApiResponseHelper.error("media_file zorunludur.", 400);
        }

        const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'video/mp4'];
        if (!allowedTypes.includes(file.type)) {
            return ApiResponseHelper.error("Desteklenmeyen dosya türü. (jpeg, png, gif, webp, mp4)", 400);
        }

        const maxSize = 50 * 1024 * 1024;
        if (file.size > maxSize) {
            return ApiResponseHelper.error("Dosya boyutu 50MB'ı aşamaz.", 400);
        }

        // Coin kontrolü
        const prices = await prisma.storyPrice.findMany({ orderBy: { durationHours: 'asc' } });
        const defaultPrices: Record<number, number> = { 6: 50, 12: 100, 24: 2000 };

        let cost: number;
        if (prices.length > 0) {
            const matched = prices.find(p => p.durationHours === durationHours);
            if (!matched) return ApiResponseHelper.error(`Geçersiz süre. Geçerli süreler: ${prices.map(p => p.durationHours).join(', ')} saat.`, 400);
            cost = matched.cost;
        } else {
            cost = defaultPrices[durationHours] ?? 2000;
        }

        const wallet = await prisma.wallet.findUnique({ where: { userId } });
        const balance = wallet?.balance ?? 0;

        if (balance < cost) {
            return ApiResponseHelper.error(`Yetersiz coin. Gerekli: ${cost}, Mevcut: ${balance}.`, 400);
        }

        // Coin düş + hikaye oluştur (transaction)
        const ext = file.name.split('.').pop() || 'jpg';
        const blob = await put(`stories/user_${userId}_${Date.now()}.${ext}`, file, {
            access: 'public',
            addRandomSuffix: true,
        });

        const now = new Date();
        const expiresAt = new Date(now.getTime() + durationHours * 60 * 60 * 1000);

        const [newStory] = await prisma.$transaction([
            prisma.story.create({
                data: { userId, mediaUrl: blob.url, durationHours, expiresAt, isSeen: false },
            }),
            prisma.wallet.update({
                where: { userId },
                data: { balance: { decrement: cost } },
            }),
        ]);

        return ApiResponseHelper.success({
            story_id: newStory.id,
            media_url: newStory.mediaUrl,
            expires_at: newStory.expiresAt,
            created_at: newStory.createdAt,
            cost_paid: cost,
            remaining_balance: balance - cost,
        }, "Hikaye başarıyla eklendi.", 201);
    } catch (error: any) {
        return ApiResponseHelper.error(error.message || "Hikaye eklenemedi.", 400);
    }
}
