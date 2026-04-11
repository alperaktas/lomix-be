const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding data...');

  // 1. Clear existing data (Optional, be careful)
  // await prisma.agencyMember.deleteMany({});
  // await prisma.agencyInvite.deleteMany({});
  // await prisma.agency.deleteMany({});
  // await prisma.roomTag.deleteMany({});
  // await prisma.room.deleteMany({});
  // await prisma.story.deleteMany({});
  // await prisma.wallet.deleteMany({});
  // await prisma.familyMessage.deleteMany({});
  // await prisma.user.deleteMany({});
  // await prisma.storyPrice.deleteMany({});
  // await prisma.roomBanner.deleteMany({});

  // 2. Passwords
  const hashedPassword = await bcrypt.hash('password123', 10);

  // 3. Create Users
  const user1 = await prisma.user.upsert({
    where: { username: 'testuser1' },
    update: {},
    create: {
      username: 'testuser1',
      email: 'user1@example.com',
      password: hashedPassword,
      fullName: 'Ahmet Yılmaz',
      gender: 'male',
      level: 15,
      prestigePoints: 450,
      isVerified: true,
      wallet: {
        create: {
          balance: 5000,
          currencySymbol: '$'
        }
      }
    },
  });

  const user2 = await prisma.user.upsert({
    where: { username: 'testuser2' },
    update: {},
    create: {
      username: 'testuser2',
      email: 'user2@example.com',
      password: hashedPassword,
      fullName: 'Ayşe Demir',
      gender: 'female',
      level: 22,
      prestigePoints: 1200,
      isVip: true,
      wallet: {
        create: {
          balance: 15000,
          currencySymbol: '$'
        }
      }
    },
  });

  const admin = await prisma.user.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      username: 'admin',
      email: 'admin@lomix.com',
      password: hashedPassword,
      fullName: 'Sistem Yöneticisi',
      role: 'admin',
      level: 99,
      isVerified: true
    },
  });

  // 4. Story Prices
  await prisma.storyPrice.createMany({
    data: [
      { durationHours: 6, cost: 50, label: "6 Saat" },
      { durationHours: 12, cost: 100, label: "12 Saat" },
      { durationHours: 24, cost: 2000, label: "24 Saat" },
    ],
    skipDuplicates: true,
  });

  // 5. Room Banners
  await prisma.roomBanner.createMany({
    data: [
      { title: "Hoşgeldin Bonusu", imageUrl: "/img/banners/welcome.png", actionUrl: "/rewards" },
      { title: "Yeni Ajans Sistemi", imageUrl: "/img/banners/agency.png", actionUrl: "/agency/info" },
    ],
    skipDuplicates: true,
  });

  // 6. Rooms
  const room1 = await prisma.room.upsert({
    where: { roomId: 'R123456' },
    update: {},
    create: {
      roomId: 'R123456',
      name: 'Gece Sohbeti',
      ownerId: user1.id,
      isLive: true,
      type: 'voice',
      viewerCount: 15,
      tags: {
        create: [
          { text: 'Sohbet', colorHex: '#4285F4' },
          { text: 'Müzik', colorHex: '#EA4335' }
        ]
      }
    }
  });

  const room2 = await prisma.room.upsert({
    where: { roomId: 'V789012' },
    update: {},
    create: {
      roomId: 'V789012',
      name: 'PK Yayını - Canlı',
      ownerId: user2.id,
      isLive: true,
      type: 'video',
      viewerCount: 85,
      mode: 'pk',
      tags: {
        create: [
          { text: 'Eğlence', colorHex: '#FBBC05' },
          { text: 'Canlı', colorHex: '#34A853' }
        ]
      }
    }
  });

  // 7. Agency
  const agency = await prisma.agency.upsert({
    where: { ownerId: admin.id },
    update: {},
    create: {
      name: 'Lomix Elite Agency',
      ownerId: admin.id,
      description: 'En kaliteli yayıncıların adresi.',
      members: {
        create: [
          { userId: user1.id, status: 'approved' },
          { userId: user2.id, status: 'pending' }
        ]
      }
    }
  });

  // 8. Family Messages
  await prisma.familyMessage.create({
    data: {
      senderId: user1.id,
      messageText: 'Selam millet! Yeni veritabanı hayırlı olsun.'
    }
  });

  // 9. Stories
  const now = new Date();
  const expires = new Date();
  expires.setHours(now.getHours() + 24);

  await prisma.story.create({
    data: {
      userId: user2.id,
      mediaUrl: '/uploads/stories/test.jpg',
      durationHours: 24,
      expiresAt: expires
    }
  });

  console.log('Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
