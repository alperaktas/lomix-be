/**
 * Telefon maskesi. Türkiye numarası "+90 5xx xxx xx xx" biçimine getirilir; başka bir ülke kodu ("+49 ...")
 * ya da "+" ile başlamayan, 5/0/90 dışında bir rakamla başlayan değer yurt dışı sayılır ve "+ülkekodu..." olarak
 * boşluksuz tutulur. Sunucu boşlukları zaten temizler ("+905321234567" kaydeder).
 */

const INTL_MAX_DIGITS = 15;
const INTL_MIN_DIGITS = 10;

const digitsOf = (v: string) => v.replace(/\D/g, '');

/** Yazılan/yapıştırılan değeri maskeler. `prev` önceki değer: silme tuşu ayraç boşluğunu silerse son rakamı düşürmek için. */
export function maskPhone(next: string, prev = ''): string {
    const plus = next.trim().startsWith('+');
    let d = digitsOf(next);
    // Boşluk silindiyse rakamlar aynı kalır, değer yeniden biçimlenip imleç takılırdı: son rakamı sil.
    if (next.length < prev.length && plus && d === digitsOf(prev)) d = d.slice(0, -1);
    if (!d) return plus ? '+' : '';

    // "00" yurt dışı arama öneki: 0049... -> +49...
    if (!plus && d.startsWith('00')) d = d.slice(2);
    const turkish = d.startsWith('90') || (!plus && (d.startsWith('0') || d.startsWith('5')));
    if (!turkish) return `+${d.slice(0, INTL_MAX_DIGITS)}`;

    const hasCountryCode = d.startsWith('90');
    if (hasCountryCode) d = d.slice(2);
    else if (d.startsWith('0')) d = d.slice(1);
    if (d && d[0] !== '5') d = '';
    d = d.slice(0, 10);
    if (!d) return hasCountryCode ? '+90' : '';

    return `+90 ${[d.slice(0, 3), d.slice(3, 6), d.slice(6, 8), d.slice(8, 10)].filter(Boolean).join(' ')}`;
}

/** Maskelenmiş değer eksiksiz mi? Türkiye: 5 ile başlayan 10 hane. Yurt dışı: 10–15 rakam. */
export function isValidPhone(v: string): boolean {
    const d = digitsOf(v);
    if (d.startsWith('90')) return /^905\d{9}$/.test(d);
    return d.length >= INTL_MIN_DIGITS && d.length <= INTL_MAX_DIGITS;
}
