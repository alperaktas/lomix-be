export type Gender = 'male' | 'female';

/**
 * Cinsiyet veritabanında serbest metin olarak tutuluyor (kayıt/profil güncellemede doğrulama yok;
 * "string" gibi örnek değerler bile var). Listelerde istemciye yalnızca 'male' | 'female' | null verilir.
 */
/** Kullanıcının seçebileceği cinsiyet değerleri. */
export const GENDER_VALUES = ['male', 'female', 'other'] as const;

/** Kayıtlı değeri küçük harfe çevirip geçerli bir cinsiyet seçimiyse döndürür; boş/örnek metinse null. */
export function chosenGender(raw: string | null | undefined): (typeof GENDER_VALUES)[number] | null {
    const v = raw?.trim().toLowerCase();
    return (GENDER_VALUES as readonly string[]).includes(v ?? '') ? (v as (typeof GENDER_VALUES)[number]) : null;
}

/** Cinsiyet bir kez seçildiyse profil düzenlemeden değiştirilemez (yalnızca admin değiştirir). */
export const isGenderLocked = (raw: string | null | undefined) => chosenGender(raw) !== null;

export function normalizeGender(raw: string | null | undefined): Gender | null {
    const v = raw?.trim().toLowerCase();
    return v === 'male' || v === 'female' ? v : null;
}
