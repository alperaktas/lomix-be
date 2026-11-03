/**
 * Ajans sistemi için test verisi. Tekrar çalıştırılabilir: önce önceki test verisini siler.
 *
 *   npx tsx --env-file=.env --env-file=.env.local --tsconfig tsconfig.json scripts/seed-agency-test.ts --creds <hesaplar.md>
 *
 * Not: ajansa yalnızca kadın kullanıcılar başvurabilir; başvuran ya da başvurusu onaylı yayıncıların hepsi kadındır
 * (başvuru olmadan eklenen yayıncılar erkek olabilir).
 * Her test hesabı `testajans_` önekiyle, ajanslar `[TEST]` önekiyle açılır; `scripts/clean-agency-test.ts` hepsini siler.
 * Şifre her çalıştırmada rastgele üretilir ve yalnızca `--creds` ile verilen dosyaya yazılır (koda gömülmez).
 */
import { randomBytes } from 'crypto';
import { writeFileSync } from 'fs';
import bcrypt from 'bcryptjs';
import prisma from '../src/lib/prisma';
import { joinAgency, leaveAgency, transferMember } from '../src/lib/agency';
import { loadTiers, nextPeriodStart, periodStart, primFor } from '../src/lib/agency-prim';
import { createNotification } from '../src/lib/notifications';
import { cleanAgencyTestData } from './clean-agency-test';

const PREFIX = 'testajans_';
const PHOTO = '/img/default-avatar.svg'; // başvuru fotoğrafı yerine; admin panelinde ve mobilde aynı kökten açılır
const MIN = 60_000, HOUR = 3_600_000, DAY = 86_400_000;

const credsPath = process.argv[process.argv.indexOf('--creds') + 1];
if (!credsPath || credsPath.startsWith('--')) { console.error('Kullanım: ... --creds <hesaplar.md>'); process.exit(1); }

const now = new Date();
const ago = (days: number, hours = 0) => new Date(now.getTime() - days * DAY - hours * HOUR);
const monthStart = periodStart('monthly', now);

(async () => {
    const password = randomBytes(9).toString('base64url');
    const hash = await bcrypt.hash(password, 10);

    console.log('Önceki test verisi temizleniyor...');
    await cleanAgencyTestData();

    const accounts: { username: string; role: string }[] = [];
    const mkUser = async (name: string, role: string, extra: { fullName: string; gender: 'male' | 'female'; broadcaster?: boolean; since?: Date; balance?: number }) => {
        const username = `${PREFIX}${name}`;
        const u = await prisma.user.create({
            data: {
                username, email: `${username}@example.invalid`, password: hash, status: 'active', isVerified: true, isFirstLogin: false,
                fullName: extra.fullName, gender: extra.gender,
                ...(extra.broadcaster ? { isBroadcaster: true, genderVerified: true, broadcasterApprovedAt: extra.since ?? now } : {}),
            },
        });
        if (extra.balance) await prisma.wallet.create({ data: { userId: u.id, balance: extra.balance } });
        accounts.push({ username, role });
        return u;
    };

    // ---- kullanıcılar
    const sahip1 = await mkUser('sahip1', 'Alfa Ajans sahibi (aktif, aylık prim)', { fullName: 'Test Sahip Bir', gender: 'male', balance: 1000 });
    const sahip2 = await mkUser('sahip2', 'Beta Ajans sahibi (pasif ajans)', { fullName: 'Test Sahip İki', gender: 'female', balance: 1000 });
    const sahip3 = await mkUser('sahip3', 'Gama Ajans sahibi (aktif, haftalık prim, yayıncısız)', { fullName: 'Test Sahip Üç', gender: 'male', balance: 1000 });
    const hayran = await mkUser('hayran', 'Hediye gönderen hesap (kazanç verisi için)', { fullName: 'Test Hayran', gender: 'male', balance: 5_000_000 });

    const bro = (name: string, fullName: string, gender: 'male' | 'female', joined: Date) =>
        mkUser(name, 'Yayıncı', { fullName, gender, broadcaster: true, since: joined, balance: 500 });

    const joins = { y1: ago(60), y2: ago(40), y3: ago(20), y4: ago(5), y5: ago(2), y6: ago(1), eski: ago(50), gecis: ago(70) };
    const y1 = await bro('yayinci1', 'Test Yayıncı Bir', 'female', joins.y1);
    const y2 = await bro('yayinci2', 'Test Yayıncı İki', 'female', joins.y2);
    const y3 = await bro('yayinci3', 'Test Yayıncı Üç', 'male', joins.y3);
    const y4 = await bro('yayinci4', 'Test Yayıncı Dört', 'female', joins.y4);
    const y5 = await bro('yayinci5', 'Test Yayıncı Beş', 'female', joins.y5);
    const y6 = await bro('yayinci6', 'Test Yayıncı Altı', 'female', joins.y6);
    const eski = await bro('eski', 'Test Eski Yayıncı (10 gün önce ayrıldı)', 'male', joins.eski);
    const gecis = await bro('gecis', 'Test Geçiş Yayıncı (Beta → Alfa)', 'female', joins.gecis);
    const beta1 = await bro('beta1', 'Test Beta Yayıncı Bir', 'male', ago(30));
    const beta2 = await bro('beta2', 'Test Beta Yayıncı İki', 'female', ago(12));

    const b1 = await mkUser('basvuru1', 'Başvuran: ajans sahibi onayı bekliyor (kadın, fotoğraflı)', { fullName: 'Test Başvuran Bir', gender: 'female' });
    const b2 = await mkUser('basvuru2', 'Başvuran: ajans sahibi onayı bekliyor (kadın, fotoğrafsız)', { fullName: 'Test Başvuran İki', gender: 'female' });
    const b3 = await mkUser('basvuru3', 'Başvuran: admin onayı bekliyor (kadın, fotoğraflı)', { fullName: 'Test Başvuran Üç', gender: 'female' });
    const b4 = await mkUser('basvuru4', 'Başvuran: admin onayı bekliyor, Gama (kadın, fotoğraflı)', { fullName: 'Test Başvuran Dört', gender: 'female' });
    const b5 = await mkUser('basvuru5', 'Başvuran: ajans sahibi reddetti', { fullName: 'Test Başvuran Beş', gender: 'female' });
    const b6 = await mkUser('basvuru6', 'Başvuran: admin reddetti', { fullName: 'Test Başvuran Altı', gender: 'female' });

    // ---- ajanslar
    const mkAgency = (data: { name: string; ownerId: number; whatsapp: string; isActive: boolean; primPeriod: 'monthly' | 'weekly' | null }) =>
        prisma.agency.create({
            data: {
                name: data.name, ownerId: data.ownerId, description: 'TEST VERİSİ, silinebilir.', whatsappNumber: data.whatsapp, isActive: data.isActive,
                ...(data.primPeriod ? { primPeriod: data.primPeriod, primPaidThrough: periodStart(data.primPeriod, now) } : {}),
                createdAt: ago(75),
            },
        });
    const alfa = await mkAgency({ name: '[TEST] Alfa Ajans', ownerId: sahip1.id, whatsapp: '+905320000001', isActive: true, primPeriod: 'monthly' });
    const beta = await mkAgency({ name: '[TEST] Beta Ajans (pasif)', ownerId: sahip2.id, whatsapp: '+4915100000002', isActive: false, primPeriod: null });
    const gama = await mkAgency({ name: '[TEST] Gama Ajans', ownerId: sahip3.id, whatsapp: '+905320000003', isActive: true, primPeriod: 'weekly' });

    // ---- üyelik geçmişi
    await prisma.$transaction(async tx => {
        const join = async (agencyId: number, userId: number, when: Date) => {
            await joinAgency(tx, agencyId, userId, when);
            await tx.agencyMember.update({ where: { userId }, data: { createdAt: when } });
        };
        await join(alfa.id, y1.id, joins.y1);
        await join(alfa.id, y2.id, joins.y2);
        await join(alfa.id, y3.id, joins.y3);
        await join(alfa.id, y4.id, joins.y4);
        await join(alfa.id, y5.id, joins.y5);
        await join(alfa.id, y6.id, joins.y6);
        await join(beta.id, beta1.id, ago(30));
        await join(beta.id, beta2.id, ago(12));

        await join(alfa.id, eski.id, joins.eski);
        await leaveAgency(tx, eski.id, ago(10));          // ayrıldı: geçmiş yayıncı olarak kalır

        await join(beta.id, gecis.id, joins.gecis);
        await transferMember(tx, gecis.id, alfa.id, ago(15)); // Beta'dan Alfa'ya aktarıldı: eski kazanç Beta'da kalır
    });

    // ---- bu ayki ve geçmiş kazançlar (hediye kayıtları, gönderen: test hayranı)
    const gift = await prisma.gift.findFirstOrThrow({ where: { isVisible: true } });
    const give = (to: number, diamonds: number, at: Date) => prisma.giftLog.create({
        data: { giftId: gift.id, senderId: hayran.id, receiverId: to, amount: 1, totalPrice: diamonds, diamondAmount: diamonds, createdAt: at },
    });
    /** Bu ay, üyeliğin başladığından sonraki bir an (ayın ilk saatinden önce olmasın, şimdiden sonra olmasın). */
    const thisMonth = (joined: Date, i: number) => new Date(Math.min(
        Math.max(joined.getTime() + 30 * MIN, monthStart.getTime() + HOUR) + i * 5 * MIN,
        now.getTime() - MIN,
    ));
    const earn = async (userId: number, joined: Date, parts: number[]) => {
        for (const [i, d] of parts.entries()) await give(userId, d, thisMonth(joined, i));
    };
    await earn(y1.id, joins.y1, [10_000, 5_000, 3_000]);   // 18.000
    await earn(y2.id, joins.y2, [6_000, 3_000]);           // 9.000
    await earn(y4.id, joins.y4, [5_000]);                  // 5.000
    await earn(y6.id, joins.y6, [2_500]);                  // 2.500
    await earn(gecis.id, ago(15), [3_000]);                // Alfa'da 3.000
    await earn(beta1.id, ago(30), [4_000]);                // Beta'da 4.000
    // y3 ve y5 bu ay hiç kazanmadı: "aktif yayıncı" listesinde görünmez
    await give(eski.id, 12_000, ago(30));                  // eski yayıncı: ayrılmadan önce kazandı
    await give(gecis.id, 7_000, ago(30));                  // geçiş yayıncı: Beta'dayken kazandı (Beta'da kalır)

    // ---- ajans primi geçmişi (Alfa, aylık): son iki ay ödenmiş, bu ay süren
    const tiers = await loadTiers();
    const prevStart = periodStart('monthly', new Date(monthStart.getTime() - 1));
    const prevPrevStart = periodStart('monthly', new Date(prevStart.getTime() - 1));
    for (const [start, turnover] of [[prevPrevStart, 3_200_000], [prevStart, 6_100_000]] as const) {
        const { ratePercent, amount } = primFor(turnover, tiers);
        await prisma.$transaction([
            prisma.agencyPrimPayout.create({
                data: { agencyId: alfa.id, ownerId: sahip1.id, period: 'monthly', periodStart: start, periodEnd: nextPeriodStart('monthly', start), turnover, ratePercent, amount, createdAt: nextPeriodStart('monthly', start) },
            }),
            prisma.wallet.upsert({ where: { userId: sahip1.id }, update: { diamonds: { increment: amount } }, create: { userId: sahip1.id, diamonds: amount } }),
            prisma.diamondTransaction.create({ data: { userId: sahip1.id, type: 'agency_prim', diamondAmount: amount, createdAt: nextPeriodStart('monthly', start) } }),
        ]);
    }

    // ---- başvurular
    const contact = (n: number) => ({ contactMethod: 'phone', contactValue: `+90532000010${n}`, kvkkAcceptedAt: ago(0, 6) });
    const app = (userId: number, agencyId: number, n: number, data: { status: string; photo: boolean; note?: string; owner?: boolean; rejectedBy?: string; type?: string; createdAt?: Date }) =>
        prisma.agencyApplication.create({
            data: {
                userId, agencyId, applicationType: data.type ?? 'third_party', ...contact(n), note: data.note ?? null,
                status: data.status, photoUrl: data.photo ? PHOTO : null,
                ownerApprovedAt: data.owner ? ago(0, 2) : null, rejectedBy: data.rejectedBy ?? null,
                createdAt: data.createdAt ?? ago(0, 5),
            },
        });
    const a1 = await app(b1.id, alfa.id, 1, { status: 'pending', photo: true, note: 'Merhaba, yayıncı olmak istiyorum.' });
    const a2 = await app(b2.id, alfa.id, 2, { status: 'pending', photo: false, type: 'management' });
    await app(b3.id, alfa.id, 3, { status: 'owner_approved', photo: true, owner: true, note: 'Deneyimliyim.' });
    await app(b4.id, gama.id, 4, { status: 'owner_approved', photo: true, owner: true });
    await app(b5.id, alfa.id, 5, { status: 'rejected', photo: true, rejectedBy: 'owner', createdAt: ago(3) });
    await app(b6.id, gama.id, 6, { status: 'rejected', photo: false, rejectedBy: 'admin', createdAt: ago(4) });
    // onaylanmış (geçmiş) başvurular: üyeliği olan yayıncılar
    for (const [i, [u, when]] of ([[y4, joins.y4], [y5, joins.y5], [y6, joins.y6]] as const).entries()) {
        await prisma.agencyApplication.create({
            data: { userId: u.id, agencyId: alfa.id, applicationType: 'third_party', ...contact(7 + i), status: 'approved', photoUrl: PHOTO, ownerApprovedAt: when, createdAt: new Date(when.getTime() - DAY) },
        });
    }

    // ---- bildirimler (ajans sahibi için yeni başvurular, başvuran için ajans onayı)
    for (const [a, u] of [[a1, b1], [a2, b2]] as const) {
        await createNotification({
            audience: 'user', targetUserId: sahip1.id, type: 'agency_application_new', title: 'Yeni yayıncı başvurusu',
            body: `${u.fullName} ajansınıza katılmak istiyor.`, data: { application_id: String(a.id), user_id: String(u.id) },
        });
    }
    await createNotification({
        audience: 'user', targetUserId: b3.id, type: 'agency_application', title: 'Başvurunuz ajans tarafından onaylandı',
        body: '[TEST] Alfa Ajans başvurunuzu onayladı. Son adım olarak admin onayı bekleniyor.', data: { status: 'owner_approved' },
    });

    // ---- hesaplar dosyası (şifre yalnızca burada)
    const rows = accounts.map(a => `| \`${a.username}\` | ${a.role} |`).join('\n');
    writeFileSync(credsPath, `---
title: Ajans test hesapları
created: ${now.toISOString().slice(0, 10)}
type: reference
status: active
tags: [lomix, test, ajans]
---

# Ajans test hesapları

**Bu hesaplar canlı veritabanında duruyor** (yerel ve canlı aynı Neon). Silmek için: \`scripts/clean-agency-test.ts\`.

- Tüm hesapların şifresi aynı: \`${password}\`
- Mobil girişte kullanıcı adıyla giriş yapılır (e-posta: \`<kullanıcı adı>@example.invalid\`).
- Ajanslar: **[TEST] Alfa Ajans** (aktif, aylık prim, 7 yayıncı + geçmiş), **[TEST] Beta Ajans (pasif)**, **[TEST] Gama Ajans** (aktif, haftalık prim).

| Kullanıcı adı | Rol |
|---|---|
${rows}
`, 'utf8');

    const [agencies, users, apps] = await Promise.all([
        prisma.agency.count({ where: { name: { startsWith: '[TEST]' } } }),
        prisma.user.count({ where: { username: { startsWith: PREFIX } } }),
        prisma.agencyApplication.count({ where: { agency: { name: { startsWith: '[TEST]' } } } }),
    ]);
    console.log(`Hazır: ${agencies} ajans, ${users} kullanıcı, ${apps} başvuru. Hesaplar: ${credsPath}`);
    await prisma.$disconnect();
})().catch(async e => { console.error('HATA:', e); await prisma.$disconnect(); process.exit(1); });
