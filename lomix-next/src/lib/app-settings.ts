import prisma from './prisma';

export const SETTING_DEFAULTS: Record<string, { label: string; group: string; value: string }> = {
    gift_commission_rate:       { label: 'Hediye Komisyon Oranı (%)', group: 'commission', value: '20' },
    voice_call_price_per_min:   { label: 'Sesli Arama Ücreti (coin/dk)',     group: 'pricing',     value: '10' },
    video_call_price_per_min:   { label: 'Görüntülü Arama Ücreti (coin/dk)', group: 'pricing',     value: '20' },
    message_price:              { label: 'Mesaj Ücreti (coin)',              group: 'pricing',     value: '5'  },
};

export async function getSetting(key: string): Promise<number> {
    const row = await prisma.appSetting.findUnique({ where: { key } });
    if (row) return Number(row.value);
    return Number(SETTING_DEFAULTS[key]?.value ?? 0);
}

export async function getAllSettings(): Promise<Record<string, string>> {
    const rows = await prisma.appSetting.findMany();
    const map: Record<string, string> = {};
    for (const [k, def] of Object.entries(SETTING_DEFAULTS)) {
        map[k] = def.value;
    }
    for (const row of rows) {
        map[row.key] = row.value;
    }
    return map;
}

export async function upsertSetting(key: string, value: string) {
    const def = SETTING_DEFAULTS[key];
    return prisma.appSetting.upsert({
        where: { key },
        update: { value },
        create: { key, value, label: def?.label ?? key, group: def?.group ?? 'general' },
    });
}
