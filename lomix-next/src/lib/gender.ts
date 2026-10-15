export type Gender = 'male' | 'female';

/**
 * Cinsiyet veritabanında serbest metin olarak tutuluyor (kayıt/profil güncellemede doğrulama yok;
 * "string" gibi örnek değerler bile var). Listelerde istemciye yalnızca 'male' | 'female' | null verilir.
 */
export function normalizeGender(raw: string | null | undefined): Gender | null {
    const v = raw?.trim().toLowerCase();
    return v === 'male' || v === 'female' ? v : null;
}
