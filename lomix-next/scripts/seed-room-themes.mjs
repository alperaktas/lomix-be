/**
 * Seed script — varsayilan oda temalarini ve VIP temalarini veritabanina yazar.
 *
 * Kullanim:
 *   node scripts/seed-room-themes.mjs
 *
 * Gerekli env degiskenleri (.env veya .env.local icinde):
 *   DATABASE_URL
 *
 * Not: image_url bos birakildi. Gorseller hazir oldugunda ya bu dosyadaki
 * degerler doldurulup script tekrar calistirilir, ya da dogrudan DB'den
 * guncellenir. Istemci image_url bossa gradient_colors ile cizim yapabilir.
 */

import { PrismaClient } from '@prisma/client';
import { config } from 'dotenv';

config({ path: '.env.local' });
config({ path: '.env' });

const prisma = new PrismaClient();

const THEMES = [
    // Oda temalari
    { themeId: 'room_1', name: 'Mor Menekşe',  imageUrl: '', gradientColors: [7444799, 4933523],  isVip: false, requiredVipLevel: 0, sortOrder: 1 },
    { themeId: 'room_2', name: 'Gece Mavisi',  imageUrl: '', gradientColors: [1981042, 2773144],  isVip: false, requiredVipLevel: 0, sortOrder: 2 },
    { themeId: 'room_3', name: 'Gün Batımı',   imageUrl: '', gradientColors: [16744543, 16693371], isVip: false, requiredVipLevel: 0, sortOrder: 3 },
    { themeId: 'room_4', name: 'Orman',        imageUrl: '', gradientColors: [1153934, 3731837],  isVip: false, requiredVipLevel: 0, sortOrder: 4 },
    { themeId: 'room_5', name: 'Şeker Pembe',  imageUrl: '', gradientColors: [16751262, 16437444], isVip: false, requiredVipLevel: 0, sortOrder: 5 },
    { themeId: 'room_6', name: 'Gece Yarısı',  imageUrl: '', gradientColors: [2303782, 4276549],  isVip: false, requiredVipLevel: 0, sortOrder: 6 },
    // VIP temalari
    { themeId: 'vip_1',  name: 'Altın VIP',    imageUrl: '', gradientColors: [16766720, 16751104], isVip: true,  requiredVipLevel: 3, sortOrder: 1 },
    { themeId: 'vip_2',  name: 'Elmas VIP',    imageUrl: '', gradientColors: [50943, 29439],      isVip: true,  requiredVipLevel: 5, sortOrder: 2 },
    { themeId: 'vip_3',  name: 'Kraliyet VIP', imageUrl: '', gradientColors: [9317346, 4849888],  isVip: true,  requiredVipLevel: 7, sortOrder: 3 },
];

async function main() {
    console.log('Oda temasi seed basliyor...\n');

    for (const theme of THEMES) {
        try {
            await prisma.roomTheme.upsert({
                where: { themeId: theme.themeId },
                update: {
                    name: theme.name,
                    gradientColors: theme.gradientColors,
                    isVip: theme.isVip,
                    requiredVipLevel: theme.requiredVipLevel,
                    sortOrder: theme.sortOrder,
                    isActive: true,
                },
                create: { ...theme, isActive: true },
            });
            console.log(`[${theme.themeId}] OK - ${theme.name}`);
        } catch (err) {
            console.error(`[${theme.themeId}] HATA:`, err.message);
        }
    }

    console.log('\nSeed tamamlandi.');
    await prisma.$disconnect();
}

main();
