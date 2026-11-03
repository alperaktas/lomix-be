import { put } from '@vercel/blob';

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_SIZE_BYTES = 5 * 1024 * 1024;
const URL_MAX_LENGTH = 500;
/** Yüklenen medyanın adresi bu alan adında biter (Vercel Blob herkese açık depo). */
const BLOB_HOST_SUFFIX = '.public.blob.vercel-storage.com';

/** Dosya geçersizse nedeni, geçerliyse null (yüklemeden önce kontrol için). */
export function photoFileError(file: File): string | null {
    if (!ALLOWED_TYPES.includes(file.type)) return 'Fotoğraf jpeg, png veya webp olmalıdır.';
    if (file.size > MAX_SIZE_BYTES) return "Fotoğraf boyutu 5MB'ı aşamaz.";
    return null;
}

export type ApplicationPhotoResult = { ok: true; url: string } | { ok: false; message: string };

/**
 * Ajans başvurusundaki yüz/cinsiyet doğrulama fotoğrafı. Yalnızca admin panelinde gösterilir; ajans sahibine
 * hiçbir uçta dönmez. Adres tahmin edilemesin diye rastgele son ek eklenir.
 */
export async function uploadApplicationPhoto(file: File, userId: number): Promise<ApplicationPhotoResult> {
    const problem = photoFileError(file);
    if (problem) return { ok: false, message: problem };
    const ext = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg';
    const blob = await put(`agency-applications/user_${userId}_${Date.now()}.${ext}`, file, {
        access: 'public',
        addRandomSuffix: true,
    });
    return { ok: true, url: blob.url };
}

/** `photo_url` olarak gelen adres, daha önce yüklenmiş bir medya adresi mi? (başka siteye işaret edemez) */
export function isTrustedPhotoUrl(value: unknown): value is string {
    if (typeof value !== 'string' || value.length > URL_MAX_LENGTH) return false;
    try {
        const url = new URL(value);
        return url.protocol === 'https:' && url.hostname.endsWith(BLOB_HOST_SUFFIX);
    } catch {
        return false;
    }
}
