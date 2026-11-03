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

export type AgencyApplyBlock = { code: 'AGENCY_MALE_NOT_ALLOWED' | 'AGENCY_GENDER_REQUIRED' | 'AGENCY_FEMALE_ONLY'; message: string };

/**
 * Ajansa yalnızca kadın kullanıcılar katılabilir. Başvuru yapamayacaksa nedenini döndürür, yapabilirse null:
 * erkek, cinsiyeti seçilmemiş (boş ya da örnek değer) ve diğer.
 */
export function agencyApplyBlock(rawGender: string | null | undefined): AgencyApplyBlock | null {
    const g = chosenGender(rawGender);
    if (g === 'female') return null;
    if (g === 'male') return { code: 'AGENCY_MALE_NOT_ALLOWED', message: 'Erkek kullanıcılar ajansa katılma başvurusu yapamaz.' };
    if (g === null) return { code: 'AGENCY_GENDER_REQUIRED', message: 'Ajansa başvurmak için önce profilinizden cinsiyetinizi seçmelisiniz.' };
    return { code: 'AGENCY_FEMALE_ONLY', message: 'Ajansa yalnızca kadın kullanıcılar başvurabilir.' };
}

/** Başvuru sahibinin onaylanamayacağı durumda (kural sonradan geldiği için eski başvurular) gösterilen ortak mesaj. */
export const AGENCY_APPLICANT_NOT_ELIGIBLE = 'Bu başvuru onaylanamaz: yalnızca kadın kullanıcılar ajansa katılabilir.';
