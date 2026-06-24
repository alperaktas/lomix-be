import { ApiResponseHelper } from '@/lib/api-response';
import { getAllSettings, upsertSetting, SETTING_DEFAULTS } from '@/lib/app-settings';

export async function GET() {
    try {
        const values = await getAllSettings();
        const result = Object.entries(SETTING_DEFAULTS).map(([key, def]) => ({
            key,
            label: def.label,
            group: def.group,
            value: values[key] ?? def.value,
        }));
        return ApiResponseHelper.success(result, 'Ayarlar getirildi.');
    } catch (error: any) {
        return ApiResponseHelper.error(error.message, 500);
    }
}

export async function PUT(req: Request) {
    try {
        const body = await req.json();
        if (!body || typeof body !== 'object') {
            return ApiResponseHelper.error('Geçersiz veri.', 400);
        }

        const results = [];
        for (const [key, value] of Object.entries(body)) {
            if (!(key in SETTING_DEFAULTS)) continue;
            const num = Number(value);
            if (isNaN(num) || num < 0) {
                return ApiResponseHelper.error(`${key} için geçersiz değer.`, 400);
            }
            if (key === 'gift_commission_rate' && num > 100) {
                return ApiResponseHelper.error('Komisyon oranı 100\'den fazla olamaz.', 400);
            }
            const row = await upsertSetting(key, String(num));
            results.push(row);
        }

        return ApiResponseHelper.success(results, 'Ayarlar güncellendi.');
    } catch (error: any) {
        return ApiResponseHelper.error(error.message, 500);
    }
}
