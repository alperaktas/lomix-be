import { ApiResponseHelper } from '@/lib/api-response';
import { refundExpiredEscrows } from '@/lib/message-billing';

/**
 * Suresi dolmus mesaj havuzu kayitlarini iade eder.
 *
 * chat/send zaten her gonderimde gonderenin kendi kayitlarini tembel olarak suzuyor;
 * bu uc, hic mesaj yazmayan kullanicilarin parasinin havuzda asili kalmamasi icin var.
 * Vercel Cron veya harici bir zamanlayici ile cagrilir.
 *
 * Yetki: CRON_SECRET tanimliysa `Authorization: Bearer <CRON_SECRET>` zorunlu.
 * Tanimli degilse uc calismaz (kazara herkese acik kalmasin diye).
 */
export async function GET(request: Request) {
    const secret = process.env.CRON_SECRET;

    if (!secret) {
        return ApiResponseHelper.error("CRON_SECRET tanımlı değil, uç devre dışı.", 503);
    }

    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${secret}`) {
        return ApiResponseHelper.error("Yetkisiz erişim.", 401);
    }

    try {
        const refunded = await refundExpiredEscrows();
        return ApiResponseHelper.success({ refunded }, `${refunded} adet mesaj coini iade edildi.`);
    } catch (error: any) {
        return ApiResponseHelper.error(error.message, 500);
    }
}
