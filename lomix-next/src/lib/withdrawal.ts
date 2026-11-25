import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export type WithdrawalStatus = 'pending' | 'completed' | 'rejected';

/** Kullanıcıya gösterilen durum metinleri (çekim merkezi ekranı). */
export const WITHDRAWAL_STATUS_TEXT: Record<string, string> = {
    pending: 'Beklemede',
    completed: 'Tamamlandı',
    rejected: 'Reddedildi',
};

/** Hızlı miktar düğmeleri admin ayarında tutulur (virgüllü liste). */
export const AMOUNT_OPTIONS_KEY = 'withdraw_amount_options';
export const DEFAULT_AMOUNT_OPTIONS = [100000, 250000, 1000000];

/** "100000, 250000" biçimindeki metni pozitif tamsayı dizisine çevirir (sıralı, tekrarsız). */
export function parseAmountOptions(raw: string | null | undefined): number[] {
    if (!raw) return [];
    const nums = raw.split(/[,\s;]+/).map(x => Number(x.trim())).filter(n => Number.isInteger(n) && n > 0 && n <= 2_000_000_000);
    return [...new Set(nums)].sort((a, b) => a - b);
}

export async function getAmountOptions(): Promise<number[]> {
    const row = await prisma.appSetting.findUnique({ where: { key: AMOUNT_OPTIONS_KEY } });
    // Hiç kaydedilmemişse varsayılanlar; admin boş kaydederse gerçekten boş liste
    return row ? parseAmountOptions(row.value) : DEFAULT_AMOUNT_OPTIONS;
}

export async function setAmountOptions(options: number[]) {
    const value = options.join(',');
    await prisma.appSetting.upsert({
        where: { key: AMOUNT_OPTIONS_KEY },
        update: { value },
        create: { key: AMOUNT_OPTIONS_KEY, value, label: 'Elmas çekim hızlı miktarları', group: 'withdraw' },
    });
}

/**
 * Çekim uçlarının hata biçimi (sözleşme): `status:false`, `message`, üstte `error_code`.
 * `alsoInData` true ise eski istemcilerin okuduğu `data.error_code` da doldurulur.
 */
export function withdrawFail(message: string, status: number, errorCode: string, alsoInData = false) {
    return NextResponse.json(
        { status: false, success: false, message, error_code: errorCode, data: alsoInData ? { error_code: errorCode } : null },
        { status },
    );
}
