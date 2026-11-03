import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUserId } from '@/lib/current-user';
import { avatarUrl } from '@/lib/default-avatar';
import { agencyTurnover, nextPeriodStart, periodStart } from '@/lib/agency-prim';
import { membershipEarnings } from '@/lib/agency';

const NEW_MEMBER_DAYS = 7;

export type RosterMember = {
    userId: number;
    fullName: string | null;
    username: string;
    avatar: string | null;
    isVerified: boolean;
    joinedAt: Date;
    /** Bu ay (Türkiye saati) ajansta bulunduğu sürede kazandığı elmas. */
    monthDiamonds: number;
};

/** Token'daki kullanıcının ajansı; kullanıcı yok ya da ajans sahibi değilse hazır hata cevabı döner. */
export async function requireOwnerAgency(request: Request): Promise<{ agency: { id: number; name: string } } | { error: NextResponse }> {
    const userId = await getCurrentUserId(request);
    if (!userId) return { error: NextResponse.json({ status: false, message: 'Unauthorized' }, { status: 401 }) };
    const agency = await prisma.agency.findUnique({ where: { ownerId: userId }, select: { id: true, name: true } });
    if (!agency) return { error: NextResponse.json({ status: false, message: 'Ajans bulunamadı' }, { status: 404 }) };
    return { agency };
}

/** Ajansın şu anki yayıncıları (açık üyelik dönemi olanlar) ve bu ayki kazançları. */
export async function loadRoster(agencyId: number, now: Date = new Date()): Promise<RosterMember[]> {
    const monthStart = periodStart('monthly', now);
    const memberships = await prisma.agencyMembership.findMany({
        where: { agencyId, leftAt: null },
        include: { user: { select: { id: true, fullName: true, username: true, avatar: true, isVerified: true } } },
    });
    const earnings = await membershipEarnings({ agencyIds: [agencyId], from: monthStart, to: nextPeriodStart('monthly', monthStart) });
    const byMembership = new Map(earnings.map(e => [e.membershipId, e.diamonds]));

    return memberships.map(m => ({
        userId: m.userId,
        fullName: m.user.fullName,
        username: m.user.username,
        avatar: m.user.avatar,
        isVerified: m.user.isVerified,
        joinedAt: m.joinedAt,
        monthDiamonds: byMembership.get(m.id) ?? 0,
    }));
}

export const isNewMember = (m: RosterMember, now: Date = new Date()) =>
    m.joinedAt.getTime() >= now.getTime() - NEW_MEMBER_DAYS * 24 * 3600 * 1000;

/** Aktif yayıncı: bu ay ajansta elmas kazanmış olan yayıncı. */
export const isActiveMember = (m: RosterMember) => m.monthDiamonds > 0;

/** Bu ayki ajans cirosu (elmas): bu ay ajansta bulunan yayıncıların toplam kazancı. */
export async function monthTurnover(agencyId: number, now: Date = new Date()): Promise<number> {
    const start = periodStart('monthly', now);
    return agencyTurnover(agencyId, start, nextPeriodStart('monthly', start));
}

/** Mobil liste satırı (yeni / aktif / toplam yayıncı ekranları ortak alanları). */
export function publisherOf(m: RosterMember, requestUrl: string) {
    return {
        id: m.userId,
        full_name: m.fullName || m.username,
        profile_image: avatarUrl(m.avatar, requestUrl),
        profile_url: '',
        is_verified: m.isVerified,
    };
}

export const fmtDiamonds = (n: number) => `${n.toLocaleString('tr-TR')} Elmas`;
