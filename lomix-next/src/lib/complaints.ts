import { put } from '@vercel/blob';

export const COMPLAINT_CATEGORY_MAX = 50;
export const COMPLAINT_DESCRIPTION_MAX = 1000;
export const COMPLAINT_IMAGE_MAX = 5;
const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const IMAGE_MAX_BYTES = 5 * 1024 * 1024;

export function serializeComplaint(c: { id: number; category: string; description: string; imageUrls: string[]; status: string; createdAt: Date; updatedAt: Date }) {
    return {
        id: String(c.id),
        category: c.category,
        description: c.description,
        image_url: c.imageUrls[0] ?? null,
        image_urls: c.imageUrls,
        status: c.status,
        created_at: c.createdAt.toISOString(),
        updated_at: c.updatedAt.toISOString(),
    };
}

/** category ve description'ı doğrular; hata varsa kullanıcıya gösterilecek mesajı, yoksa temiz alanları döner. */
export function parseComplaintBody(body: any): { error: string } | { category: string; description: string } {
    if (!body || typeof body !== 'object') return { error: "Geçersiz istek gövdesi." };

    const category = typeof body.category === 'string' ? body.category.trim() : '';
    const description = typeof body.description === 'string' ? body.description.trim() : '';

    if (!category) return { error: "category zorunludur." };
    if (category.length > COMPLAINT_CATEGORY_MAX) return { error: `category en fazla ${COMPLAINT_CATEGORY_MAX} karakter olabilir.` };
    if (!description) return { error: "description zorunludur." };
    if (description.length > COMPLAINT_DESCRIPTION_MAX) return { error: `description en fazla ${COMPLAINT_DESCRIPTION_MAX} karakter olabilir.` };

    return { category, description };
}

/** Yalnızca Vercel Blob'a yüklenmiş (örn. /api/mobile/upload çıktısı) https adreslerini kabul eder. */
function isBlobUrl(raw: string): boolean {
    try {
        const u = new URL(raw);
        return u.protocol === 'https:' && u.hostname.endsWith('.public.blob.vercel-storage.com');
    } catch {
        return false;
    }
}

function cleanUrls(values: unknown[]): string[] {
    return values.filter((v): v is string => typeof v === 'string').map(v => v.trim()).filter(Boolean);
}

export type ComplaintRequest = {
    category: string;
    description: string;
    /** null: istekte resim alanı yok (güncellemede mevcut resimler korunur); dizi: resimlerin yeni hâli */
    images: string[] | null;
};

/**
 * Şikayet isteğini okur. İki biçim desteklenir:
 * - JSON: `image_url` (metin), `image_urls` (dizi) veya `images` (dizi) önceden yüklenmiş blob adresleri taşır.
 * - multipart/form-data: resim dosyaları alan adından bağımsız yüklenir; `image_url`/`image_urls`
 *   metin alanları da kabul edilir.
 * Boş `image_url` ("" / null) "resim yok" demektir ve güncellemede mevcut resimleri silmez; resimleri
 * silmek için `image_urls: []` gönderilmelidir.
 */
export async function readComplaintRequest(request: Request): Promise<{ error: string } | ComplaintRequest> {
    const contentType = request.headers.get('content-type') || '';
    let base: ReturnType<typeof parseComplaintBody>;
    let urls: string[] = [];
    let files: File[] = [];
    let explicitEmpty = false;

    if (contentType.includes('multipart/form-data')) {
        const form = await request.formData().catch(() => null);
        if (!form) return { error: "Geçersiz istek gövdesi." };
        base = parseComplaintBody({ category: form.get('category'), description: form.get('description') });
        urls = cleanUrls([...form.getAll('image_url'), ...form.getAll('image_urls'), ...form.getAll('image_urls[]')]);
        files = [...form.values()].filter((v): v is File => typeof v !== 'string' && v.size > 0);
    } else {
        const body = await request.json().catch(() => null);
        base = parseComplaintBody(body);
        if (!('error' in base)) {
            const list = [body.image_urls, body.images].find(Array.isArray) as unknown[] | undefined;
            if (list) {
                urls = cleanUrls(list);
                explicitEmpty = list.length === 0;
            } else if (typeof body.image_url === 'string') {
                urls = cleanUrls([body.image_url]);
            }
        }
    }

    if ('error' in base) return base;

    if (urls.length + files.length > COMPLAINT_IMAGE_MAX) {
        return { error: `En fazla ${COMPLAINT_IMAGE_MAX} resim eklenebilir.` };
    }
    if (urls.some(u => !isBlobUrl(u))) return { error: "Geçersiz resim adresi. Resmi önce yükleyin." };
    for (const f of files) {
        if (!IMAGE_TYPES.includes(f.type)) return { error: "Yalnızca jpeg, png, webp veya gif resim eklenebilir." };
        if (f.size > IMAGE_MAX_BYTES) return { error: "Her resim en fazla 5MB olabilir." };
    }

    // Tüm doğrulamalar geçtikten sonra yükle ki hatalı isteklerde yetim dosya kalmasın.
    const uploaded: string[] = [];
    for (const f of files) {
        const ext = (f.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg';
        const blob = await put(`complaints/${Date.now()}.${ext}`, f, { access: 'public', addRandomSuffix: true });
        uploaded.push(blob.url);
    }

    const all = [...urls, ...uploaded];
    return { category: base.category, description: base.description, images: all.length > 0 || explicitEmpty ? all : null };
}
