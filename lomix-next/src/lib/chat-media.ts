import { put } from '@vercel/blob';

const ALLOWED_TYPES = [
    'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'video/mp4',
    'audio/mpeg', 'audio/mp4', 'audio/x-m4a', 'audio/aac', 'audio/wav', 'audio/ogg', 'audio/webm', 'audio/3gpp',
    'application/pdf',
];
const MAX_SIZE_BYTES = 50 * 1024 * 1024;

export type ChatMediaUploadResult =
    | { ok: true; url: string; pathname: string; type: string }
    | { ok: false; message: string };

/**
 * chat/send (multipart) ve /api/mobile/upload ayni kurallari paylassin diye burada.
 */
export async function uploadChatMedia(file: File): Promise<ChatMediaUploadResult> {
    if (!ALLOWED_TYPES.includes(file.type)) {
        return { ok: false, message: 'Desteklenmeyen dosya türü.' };
    }
    if (file.size > MAX_SIZE_BYTES) {
        return { ok: false, message: "Dosya boyutu 50MB'ı aşamaz." };
    }

    const blob = await put(`chat-media/${Date.now()}_${file.name}`, file, {
        access: 'public',
        addRandomSuffix: true,
    });

    return { ok: true, url: blob.url, pathname: blob.pathname, type: file.type };
}
