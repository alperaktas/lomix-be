import { put } from '@vercel/blob';

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const ALLOWED_EXTS = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
const MAX_SIZE_BYTES = 5 * 1024 * 1024;

export type RoomThumbnailResult =
    | { ok: true; url: string }
    | { ok: false; message: string };

/**
 * Oda fotoğrafını doğrular ve blob'a `room-thumbnails/` altına yükler.
 * room/create ve room/settings aynı kuralları paylaşsın diye burada.
 */
export async function uploadRoomThumbnail(image: File): Promise<RoomThumbnailResult> {
    const ext = (image.name.split('.').pop() || '').toLowerCase();

    const isValidMime = ALLOWED_TYPES.includes(image.type);
    const isValidExt = ALLOWED_EXTS.includes(ext);

    if (!isValidMime && !isValidExt) {
        return { ok: false, message: 'Sadece JPEG, PNG, GIF veya WebP dosyaları kabul edilir.' };
    }

    if (image.size > MAX_SIZE_BYTES) {
        return { ok: false, message: "Dosya boyutu 5MB'dan büyük olamaz." };
    }

    const blob = await put(`room-thumbnails/room_${Date.now()}.${ext || 'jpg'}`, image, {
        access: 'public',
        addRandomSuffix: true,
    });

    return { ok: true, url: blob.url };
}
