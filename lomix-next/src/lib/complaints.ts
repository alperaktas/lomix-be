export const COMPLAINT_CATEGORY_MAX = 50;
export const COMPLAINT_DESCRIPTION_MAX = 1000;

export function serializeComplaint(c: { id: number; category: string; description: string; status: string; createdAt: Date; updatedAt: Date }) {
    return {
        id: String(c.id),
        category: c.category,
        description: c.description,
        status: c.status,
        created_at: c.createdAt.toISOString(),
        updated_at: c.updatedAt.toISOString(),
    };
}

/** POST gövdesini doğrular; hata varsa kullanıcıya gösterilecek mesajı, yoksa temiz alanları döner. */
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
