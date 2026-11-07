import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUserId } from '@/lib/current-user';
import { expectedPrimThisMonth } from '@/lib/agency-prim';
import { agencyRoleGuard, fmtDiamonds, isActiveMember, isNewMember, loadRoster, monthTurnover } from '@/lib/agency-mobile';

export async function GET(request: Request) {
    try {
        const userId = await getCurrentUserId(request);
        if (!userId) {
            return NextResponse.json({ status: false, message: "Unauthorized" }, { status: 401 });
        }

        const agency = await prisma.agency.findUnique({ where: { ownerId: userId }, select: { id: true } });

        if (!agency) {
            return NextResponse.json({ 
                status: true, 
                message: "Ajans bulunamadı", 
                data: null 
            });
        }

        // Ajansı var ama rolü `ajans` değilse (panelden düşürülmüş) ajans ekranına girilemez.
        const denied = await agencyRoleGuard(userId);
        if (denied) return denied;

        // Ajans sahibinin onayını bekleyen başvurular (pending_streamers listesiyle aynı kaynak).
        const pendingApplications = await prisma.agencyApplication.count({
            where: { agencyId: agency.id, status: 'pending' },
        });

        // Yayıncı sayıları total_streamers / active_streamers / new_streamers listeleriyle aynı kaynaktan gelir.
        const now = new Date();
        const [roster, income, expectedShare] = await Promise.all([
            loadRoster(agency.id, now),
            monthTurnover(agency.id, now),
            expectedPrimThisMonth(agency.id, now),
        ]);
        const stats = {
            totalMembers: roster.length,
            activeMembers: roster.filter(isActiveMember).length,
            pendingMembers: pendingApplications,
            newMembers: roster.filter(m => isNewMember(m, now)).length,
        };

        return NextResponse.json({
            status: true,
            message: "Ajans bilgileri başarıyla yüklendi",
            data: {
                publisherNotification: {
                    title: stats.pendingMembers > 0 ? `${stats.pendingMembers} yayıncı onayı bekliyor.` : "Yayıncı onayı beklemiyorum.",
                    count: stats.pendingMembers,
                    icon: stats.pendingMembers > 0 ? "pending" : "check_circle",
                    iconColor: stats.pendingMembers > 0 ? "#F44336" : "#1976D2"
                },
                statistics: [
                    {
                        id: 1,
                        icon: "business",
                        iconColor: "#FF9800",
                        title: fmtDiamonds(income),
                        subtitle: "Bu ayki Ajans Toplam Geliri"
                    },
                    {
                        id: 2,
                        icon: "monetization_on",
                        iconColor: "#9C27B0",
                        title: fmtDiamonds(expectedShare),
                        subtitle: "Bu ay için beklenen ajans payı"
                    },
                    {
                        id: 3,
                        icon: "people",
                        iconColor: "#2196F3",
                        title: String(stats.totalMembers),
                        subtitle: "Ajans toplam yayıncı"
                    },
                    {
                        id: 4,
                        icon: "local_fire_department",
                        iconColor: "#F44336",
                        title: String(stats.activeMembers),
                        subtitle: "Toplam aktif yayıncı"
                    },
                    {
                        id: 5,
                        icon: "eco",
                        iconColor: "#4CAF50",
                        title: String(stats.newMembers),
                        subtitle: "Yeni yayıncılar"
                    }
                ],
                actionButton: {
                    title: "Link Oluştur ve Ajansa Davet Et",
                    icon: "person_add_alt",
                    action: "/agency/invite"
                }
            }
        });
    } catch (error: any) {
        return NextResponse.json({ status: false, message: error.message }, { status: 500 });
    }
}
