import prisma from '@/lib/prisma';

/** Başvuru durumunun mobilde gösterilecek Türkçe metni. `my_application` ve `profile/me` ortak kullanır. */
export const APPLICATION_STATUS_TEXT: Record<string, string> = {
    pending: 'Ajans sahibinin onayı bekleniyor',
    owner_approved: 'Ajans sahibi onayladı, admin onayı bekleniyor',
    approved: 'Onaylandı',
    rejected: 'Reddedildi',
};

/**
 * Kullanıcının en son ajans başvurusunun özeti (profile/me için). Yalnızca durum ve ajans adı döner;
 * fotoğraf ve iletişim bilgisi bilerek yok. Başvuru yoksa null.
 */
export async function latestApplicationSummary(userId: number) {
    const a = await prisma.agencyApplication.findFirst({
        where: { userId },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        select: { id: true, status: true, rejectedBy: true, updatedAt: true, agency: { select: { id: true, name: true } } },
    });
    if (!a) return null;
    return {
        application_id: String(a.id),
        status: a.status,
        status_text: APPLICATION_STATUS_TEXT[a.status] ?? a.status,
        rejected_by: a.status === 'rejected' ? a.rejectedBy : null,
        agency: { id: String(a.agency.id), name: a.agency.name },
        updated_at: a.updatedAt.toISOString(),
    };
}
