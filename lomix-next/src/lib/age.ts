/**
 * Doğum tarihinden tamamlanmış yaş. Tarih yoksa ya da mantıksız ise (gelecekte, 120 yaşından büyük) null.
 * Doğum tarihi gün olarak saklandığı için karşılaştırma UTC takvim günüyle yapılır.
 */
export function calculateAge(birthDate: Date | null | undefined, now: Date = new Date()): number | null {
    if (!birthDate) return null;

    let age = now.getUTCFullYear() - birthDate.getUTCFullYear();
    const beforeBirthday =
        now.getUTCMonth() < birthDate.getUTCMonth() ||
        (now.getUTCMonth() === birthDate.getUTCMonth() && now.getUTCDate() < birthDate.getUTCDate());
    if (beforeBirthday) age--;

    return age >= 0 && age <= 120 ? age : null;
}
