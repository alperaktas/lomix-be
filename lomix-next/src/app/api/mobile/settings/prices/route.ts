import { ApiResponseHelper } from '@/lib/api-response';
import { getSetting } from '@/lib/app-settings';

/**
 * @swagger
 * /api/mobile/settings/prices:
 *   get:
 *     summary: Uygulama fiyat ayarları
 *     tags: [Mobile Settings]
 *     responses:
 *       200:
 *         description: Fiyatlar döndürüldü
 */
export async function GET() {
    try {
        const [voiceCall, videoCall, message] = await Promise.all([
            getSetting('voice_call_price_per_min'),
            getSetting('video_call_price_per_min'),
            getSetting('message_price'),
        ]);

        return ApiResponseHelper.success({
            voice_call_price_per_min: voiceCall,
            video_call_price_per_min: videoCall,
            message_price: message,
        }, 'Fiyat ayarları getirildi.');
    } catch (error: any) {
        return ApiResponseHelper.error(error.message, 500);
    }
}
