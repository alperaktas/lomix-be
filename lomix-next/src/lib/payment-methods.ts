import prisma from '@/lib/prisma';

/** Coin satın alma ekranındaki ödeme yöntemleri. Sıra listedeki sıradır; admin panelinden yönetilir. */
export type PaymentMethod = { type: string; label: string; isActive: boolean };

export const PAYMENT_METHODS_KEY = 'coin_payment_methods';

export const DEFAULT_PAYMENT_METHODS: PaymentMethod[] = [
    { type: 'credit_card', label: 'Kredi Kartı ile Ödeme', isActive: true },
    { type: 'gpay', label: 'GPay', isActive: true },
    { type: 'wire_transfer', label: 'Havale/EFT ile Ödeme', isActive: true },
];

const TYPE_RE = /^[a-z0-9_]{2,30}$/;
const MAX_METHODS = 10;

/** Gelen listeyi doğrular; hata varsa mesaj döner. */
export function validatePaymentMethods(input: unknown): { methods: PaymentMethod[] } | { error: string } {
    if (!Array.isArray(input)) return { error: 'methods bir liste olmalıdır.' };
    if (input.length > MAX_METHODS) return { error: `En fazla ${MAX_METHODS} ödeme yöntemi tanımlanabilir.` };

    const seen = new Set<string>();
    const methods: PaymentMethod[] = [];
    for (const raw of input) {
        const type = typeof raw?.type === 'string' ? raw.type.trim().toLowerCase() : '';
        const label = typeof raw?.label === 'string' ? raw.label.trim() : '';
        if (!TYPE_RE.test(type)) return { error: `Tür "${type || '?'}" geçersiz: yalnız küçük harf, rakam ve alt çizgi (2-30 karakter).` };
        if (seen.has(type)) return { error: `"${type}" türü iki kez eklenmiş.` };
        if (!label || label.length > 60) return { error: `"${type}" için görünen ad 1 ile 60 karakter arasında olmalıdır.` };
        if (typeof raw?.isActive !== 'boolean') return { error: 'isActive true veya false olmalıdır.' };
        seen.add(type);
        methods.push({ type, label, isActive: raw.isActive });
    }
    return { methods };
}

export async function getPaymentMethods(): Promise<PaymentMethod[]> {
    const row = await prisma.appSetting.findUnique({ where: { key: PAYMENT_METHODS_KEY } });
    if (!row) return DEFAULT_PAYMENT_METHODS;
    try {
        const checked = validatePaymentMethods(JSON.parse(row.value));
        return 'methods' in checked ? checked.methods : DEFAULT_PAYMENT_METHODS;
    } catch {
        return DEFAULT_PAYMENT_METHODS; // bozuk kayıt satın alma ekranını boşaltmasın
    }
}

export async function savePaymentMethods(methods: PaymentMethod[]) {
    const value = JSON.stringify(methods);
    await prisma.appSetting.upsert({
        where: { key: PAYMENT_METHODS_KEY },
        update: { value },
        create: { key: PAYMENT_METHODS_KEY, value, label: 'Coin satın alma ödeme yöntemleri', group: 'payment' },
    });
}
