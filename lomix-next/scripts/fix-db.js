const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    console.log("Adding description column to rooms table...");
    await prisma.$executeRaw`ALTER TABLE "rooms" ADD COLUMN IF NOT EXISTS "description" TEXT`;
    console.log("Column added successfully.");
  } catch (error) {
    console.error("Error adding column:", error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
