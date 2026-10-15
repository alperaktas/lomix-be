import { COMPLAINT_DESCRIPTION_MAX, COMPLAINT_IMAGE_MAX, cleanUrls, isBlobUrl } from '@/lib/complaints';

export const THREAD_LIMIT = 500;
/** Kullanıcı başına dakikada en fazla bu kadar talep mesajı. */
export const MESSAGES_PER_MINUTE = 10;

type Person = { id: number; username: string; fullName: string | null; avatar: string | null };

type MessageRow = {
    id: number;
    senderType: string;
    senderId: number | null;
    content: string;
    imageUrls: string[];
    readAt: Date | null;
    createdAt: Date;
};

const SUPPORT_SENDER = { id: 'support', name: 'Destek Ekibi', avatar_url: null as string | null };

function userSender(u: Person) {
    return { id: String(u.id), name: u.fullName || u.username, avatar_url: u.avatar?.trim() || null };
}

export function serializeMessage(m: MessageRow, owner: Person) {
    return {
        id: String(m.id),
        sender_type: m.senderType === 'support' ? 'support' : 'user',
        sender: m.senderType === 'support' ? SUPPORT_SENDER : userSender(owner),
        content: m.content,
        image_url: m.imageUrls[0] ?? null,
        image_urls: m.imageUrls,
        created_at: m.createdAt.toISOString(),
        read_at: m.readAt ? m.readAt.toISOString() : null,
    };
}

/**
 * Konuşma akışının ilk kaydı her zaman talebin kendisidir (description + resimler). Gerçek bir satır
 * değil, talepten türetilir: kullanıcı talebi düzenlediğinde otomatik güncel kalır. Kimliği negatif
 * talep numarasıdır, böylece gerçek mesaj kimlikleriyle çakışmaz.
 */
export function openingMessage(
    c: { id: number; description: string; imageUrls: string[]; createdAt: Date },
    owner: Person,
) {
    return {
        id: String(-c.id),
        sender_type: 'user' as const,
        sender: userSender(owner),
        content: c.description,
        image_url: c.imageUrls[0] ?? null,
        image_urls: c.imageUrls,
        created_at: c.createdAt.toISOString(),
        read_at: null as string | null,
    };
}

/** [talebin kendisi, ...mesajlar] zaman sırasına göre artan. `messages` en eski -> en yeni gelmeli. */
export function buildThread(
    complaint: { id: number; description: string; imageUrls: string[]; createdAt: Date },
    owner: Person,
    messages: MessageRow[],
) {
    return [openingMessage(complaint, owner), ...messages.map(m => serializeMessage(m, owner))];
}

/** İstek gövdesindeki `content` ve `image_urls`'i doğrular. */
export function parseMessageBody(body: any): { error: string } | { content: string; imageUrls: string[] } {
    const content = typeof body?.content === 'string' ? body.content.trim() : '';
    if (!content) return { error: "Mesaj metni boş olamaz." };
    if (content.length > COMPLAINT_DESCRIPTION_MAX) {
        return { error: `Mesaj en fazla ${COMPLAINT_DESCRIPTION_MAX} karakter olabilir.` };
    }

    let imageUrls: string[] = [];
    const raw = body.image_urls ?? body.images;
    if (raw !== undefined && raw !== null) {
        if (!Array.isArray(raw)) return { error: "image_urls dizi olmalıdır." };
        imageUrls = cleanUrls(raw);
    } else if (typeof body.image_url === 'string') {
        imageUrls = cleanUrls([body.image_url]);
    }

    if (imageUrls.length > COMPLAINT_IMAGE_MAX) return { error: `En fazla ${COMPLAINT_IMAGE_MAX} resim eklenebilir.` };
    if (imageUrls.some(u => !isBlobUrl(u))) return { error: "Geçersiz resim adresi. Resmi önce yükleyin." };

    return { content, imageUrls };
}
