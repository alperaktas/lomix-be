/**
 * Ajans test verisini siler (`testajans_` kullanıcıları ve `[TEST]` ajansları).
 *
 *   npx tsx --env-file=.env --env-file=.env.local --tsconfig tsconfig.json scripts/clean-agency-test.ts
 */
import prisma from '../src/lib/prisma';

const PREFIX = 'testajans_';

export async function cleanAgencyTestData() {
    const users = await prisma.user.findMany({ where: { username: { startsWith: PREFIX } }, select: { id: true } });
    const ids = users.map(u => u.id);
    if (ids.length === 0 && (await prisma.agency.count({ where: { name: { startsWith: '[TEST]' } } })) === 0) return { users: 0, agencies: 0 };

    // Ajansı silmek üyelik, başvuru, davet, prim kaydı ve ajans bildirimlerini de siler.
    const agencies = await prisma.agency.deleteMany({ where: { OR: [{ name: { startsWith: '[TEST]' } }, { ownerId: { in: ids } }] } });
    await prisma.notification.deleteMany({ where: { targetUserId: { in: ids } } });
    await prisma.walletTransaction.deleteMany({ where: { OR: [{ fromUserId: { in: ids } }, { toUserId: { in: ids } }] } });
    await prisma.giftLog.deleteMany({ where: { OR: [{ senderId: { in: ids } }, { receiverId: { in: ids } }] } });
    const removed = await prisma.user.deleteMany({ where: { id: { in: ids } } });
    return { users: removed.count, agencies: agencies.count };
}

// Doğrudan çalıştırıldığında
if (process.argv[1] && /clean-agency-test\.ts$/.test(process.argv[1].replace(/\\/g, '/'))) {
    cleanAgencyTestData()
        .then(async r => { console.log(`Silindi: ${r.agencies} ajans, ${r.users} kullanıcı.`); await prisma.$disconnect(); })
        .catch(async e => { console.error('HATA:', e); await prisma.$disconnect(); process.exit(1); });
}
