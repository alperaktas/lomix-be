import { ApiResponseHelper } from '@/lib/api-response';
import prisma from '@/lib/prisma';
import { getCurrentUserId } from '@/lib/current-user';

const APPLICATION_TYPES = ['third_party', 'management'];
const CONTACT_METHODS = ['phone', 'email'];
const NOTE_MAX = 100;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** Telefonu rakamlara indirger ("+90 (531) 298-32-33" -> "+905312983233"); biçim geçersizse null. */
function normalizePhone(raw: string): string | null {
    const cleaned = raw.replace(/[\s\-().]/g, '');
    if (!/^\+?\d+$/.test(cleaned)) return null;
    const digits = cleaned.replace('+', '');
    if (digits.length < 10 || digits.length > 15) return null;
    return cleaned;
}

/**
 * @swagger
 * /api/mobile/profile/ajans_katil:
 *   post:
 *     summary: Ajansa katılım başvurusu
 *     description: |
 *       Başvuran kullanıcı token'dan belirlenir. `phone_number` alanı istemcide sabit olduğu için
 *       `contact_method` email olduğunda da e-posta adresi bu alanda gönderilir; içerik seçilen
 *       türe göre doğrulanır. Aynı ajansa ikinci başvuru reddedilir; reddedilmiş bir başvuru
 *       yeniden gönderilebilir.
 *     tags: [Mobile Agency]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [application_type, agency_id, contact_method, phone_number, kvkk_accepted]
 *             properties:
 *               application_type:
 *                 type: string
 *                 enum: [third_party, management]
 *               agency_id:
 *                 type: string
 *               contact_method:
 *                 type: string
 *                 enum: [phone, email]
 *               phone_number:
 *                 type: string
 *                 description: contact_method phone ise telefon, email ise e-posta adresi
 *               note:
 *                 type: string
 *                 description: Opsiyonel, en fazla 100 karakter
 *               kvkk_accepted:
 *                 type: boolean
 *                 description: true olmalı
 *     responses:
 *       200:
 *         description: Ajans başvurusu alındı (data.application_id, data.status)
 *       400:
 *         description: Doğrulama hatası
 *       404:
 *         description: Ajans bulunamadı
 *       409:
 *         description: Başvuru zaten var veya kullanıcı zaten bir ajansa bağlı
 */
export async function POST(request: Request) {
    try {
        const userId = await getCurrentUserId(request);
        if (!userId) return ApiResponseHelper.error("Yetkisiz erişim.", 401);

        const body = await request.json().catch(() => null);
        if (!body || typeof body !== 'object') return ApiResponseHelper.error("Geçersiz istek gövdesi.", 400);

        const { application_type, agency_id, contact_method, phone_number, note, kvkk_accepted } = body;

        if (!APPLICATION_TYPES.includes(application_type)) {
            return ApiResponseHelper.error("application_type third_party veya management olmalıdır.", 400);
        }

        const agencyId = Number(agency_id);
        if (agency_id === undefined || agency_id === null || String(agency_id).trim() === '' || !Number.isInteger(agencyId) || agencyId < 1) {
            return ApiResponseHelper.error("Geçerli bir agency_id gönderilmelidir.", 400);
        }

        if (!CONTACT_METHODS.includes(contact_method)) {
            return ApiResponseHelper.error("contact_method phone veya email olmalıdır.", 400);
        }

        if (typeof phone_number !== 'string' || !phone_number.trim()) {
            return ApiResponseHelper.error(contact_method === 'email' ? "E-posta adresi zorunludur." : "Telefon numarası zorunludur.", 400);
        }
        let contactValue: string;
        if (contact_method === 'email') {
            contactValue = phone_number.trim().toLowerCase();
            if (contactValue.length > 254 || !EMAIL_RE.test(contactValue)) {
                return ApiResponseHelper.error("Geçerli bir e-posta adresi giriniz.", 400);
            }
        } else {
            const phone = normalizePhone(phone_number.trim());
            if (!phone) return ApiResponseHelper.error("Geçerli bir telefon numarası giriniz.", 400);
            contactValue = phone;
        }

        if (note !== undefined && note !== null && typeof note !== 'string') {
            return ApiResponseHelper.error("note metin olmalıdır.", 400);
        }
        const cleanNote = typeof note === 'string' ? note.trim() : '';
        if (cleanNote.length > NOTE_MAX) {
            return ApiResponseHelper.error(`Not en fazla ${NOTE_MAX} karakter olabilir.`, 400);
        }

        if (kvkk_accepted !== true && kvkk_accepted !== 'true') {
            return ApiResponseHelper.error("Başvuru için KVKK onayı gereklidir.", 400);
        }

        const agency = await prisma.agency.findUnique({ where: { id: agencyId }, select: { id: true, ownerId: true } });
        if (!agency) return ApiResponseHelper.error("Ajans bulunamadı.", 404);
        if (agency.ownerId === userId) return ApiResponseHelper.error("Kendi ajansınıza başvuru yapamazsınız.", 400);

        const membership = await prisma.agencyMember.findUnique({ where: { userId }, select: { status: true } });
        if (membership) {
            return ApiResponseHelper.error(
                membership.status === 'approved' ? "Zaten bir ajansa bağlısınız." : "Bekleyen bir ajans üyeliğiniz var.",
                409
            );
        }

        const data = {
            applicationType: application_type,
            contactMethod: contact_method,
            contactValue,
            note: cleanNote || null,
            kvkkAcceptedAt: new Date(),
            status: 'pending',
        };

        const existing = await prisma.agencyApplication.findUnique({
            where: { userId_agencyId: { userId, agencyId } },
            select: { id: true, status: true },
        });

        let applicationId: number;
        if (existing) {
            if (existing.status === 'pending') return ApiResponseHelper.error("Bu ajansa başvurunuz zaten mevcut.", 409);
            if (existing.status === 'approved') return ApiResponseHelper.error("Bu ajansa başvurunuz zaten onaylanmış.", 409);
            // reddedilmiş başvuru yeniden gönderilebilir
            const updated = await prisma.agencyApplication.update({ where: { id: existing.id }, data });
            applicationId = updated.id;
        } else {
            try {
                const created = await prisma.agencyApplication.create({ data: { ...data, userId, agencyId } });
                applicationId = created.id;
            } catch (e: any) {
                if (e?.code === 'P2002') return ApiResponseHelper.error("Bu ajansa başvurunuz zaten mevcut.", 409);
                throw e;
            }
        }

        return ApiResponseHelper.success(
            { application_id: String(applicationId), status: 'pending' },
            "Ajans başvurunuz başarıyla alındı."
        );
    } catch (error: any) {
        return ApiResponseHelper.error(error.message, 500);
    }
}
