import { ApiResponseHelper } from '@/lib/api-response';
import prisma from '@/lib/prisma';
import { getCurrentUserId } from '@/lib/current-user';
import { put } from '@vercel/blob';
import { storyThumbnail } from '@/lib/story-media';
import { spendOp, syncLevel, levelUpField } from '@/lib/level';

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
 *               thumbnail_file:
 *                 type: string
 *                 format: binary
 *                 description: Opsiyonel önizleme (jpeg/png/webp, 5MB). Video hikayelerde ilk kare için gönderilmeli; resim hikayelerde gerekmez, medyanın kendisi kullanılır.
 *               duration_hours:
 *                 type: integer
 *                 description: "Hikaye süresi (saat). Varsayılan: 24. 'duration' alan adı da kabul edilir."
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
                thumbnail_url: storyThumbnail(s),
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
        // Mobil bazen 'duration' gonderiyor, bazen 'duration_hours' — ikisini de kabul et.
        const durationRaw = (formData.get('duration_hours') ?? formData.get('duration')) as string | null;
        const durationHours = parseInt(durationRaw || '24', 10);

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
        const defaultPrices: Record<number, number> = { 6: 50, 12: 100, 24: 200 };

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

        // Video hikayelerde mobil ilk kareyi 'thumbnail_file' ile gonderebilir (opsiyonel).
        let thumbnailUrl: string | null = null;
        const thumb = formData.get('thumbnail_file') as File | null;
        if (thumb && typeof thumb !== 'string' && thumb.size > 0) {
            if (!['image/jpeg', 'image/png', 'image/webp'].includes(thumb.type)) {
                return ApiResponseHelper.error("thumbnail_file jpeg, png veya webp olmalıdır.", 400);
            }
            if (thumb.size > 5 * 1024 * 1024) {
                return ApiResponseHelper.error("thumbnail_file 5MB'ı aşamaz.", 400);
            }
            const thumbBlob = await put(`stories/thumbs/user_${userId}_${Date.now()}.jpg`, thumb, {
                access: 'public',
                addRandomSuffix: true,
            });
            thumbnailUrl = thumbBlob.url;
        }

        const now = new Date();
        const expiresAt = new Date(now.getTime() + durationHours * 60 * 60 * 1000);

        const [newStory] = await prisma.$transaction([
            prisma.story.create({
                data: { userId, mediaUrl: blob.url, thumbnailUrl, durationHours, expiresAt, isSeen: false },
            }),
            prisma.wallet.update({
                where: { userId },
                data: { balance: { decrement: cost } },
            }),
            spendOp(userId, cost),
        ]);

        const levelResult = await syncLevel(userId);

        return ApiResponseHelper.success({
            story_id: newStory.id,
            media_url: newStory.mediaUrl,
            thumbnail_url: storyThumbnail(newStory),
            expires_at: newStory.expiresAt,
            created_at: newStory.createdAt,
            cost_paid: cost,
            remaining_balance: balance - cost,
            ...levelUpField(levelResult),
        }, "Hikaye başarıyla eklendi.", 201);
    } catch (error: any) {
        return ApiResponseHelper.error(error.message || "Hikaye eklenemedi.", 400);
    }
}
