import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUserId } from '@/lib/current-user';

export async function GET(request: Request) {
    try {
        const userId = await getCurrentUserId(request);
        if (!userId) {
            return NextResponse.json({ status: false, message: "Unauthorized" }, { status: 401 });
        }

        // @ts-ignore - Prisma client may need a moment to sync new models
        const agency = await prisma.agency.findUnique({
            where: { ownerId: userId },
            include: {
                members: {
                    include: { user: true }
                }
            }
        });

        if (!agency) {
            return NextResponse.json({ 
                status: true, 
                message: "Ajans bulunamadı", 
                data: null 
            });
        }

        const stats = {
            totalMembers: agency.members.length,
            activeMembers: agency.members.filter((m: any) => m.status === 'approved').length,
            pendingMembers: agency.members.filter((m: any) => m.status === 'pending').length,
            newMembers: agency.members.filter((m: any) => {
                const oneWeekAgo = new Date();
                oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
                return m.createdAt > oneWeekAgo;
            }).length
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
                        title: "0", // Transaction tablosu henüz yok, 0 döndürüyoruz
                        subtitle: "Bu ayki Ajans Toplam Geliri"
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
