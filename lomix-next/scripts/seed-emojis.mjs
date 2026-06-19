/**
 * Seed script — 28 emoji klasöründen icon.png ve act.svga dosyalarını
 * Vercel Blob'a yükler ve veritabanına kaydeder.
 *
 * Kullanım:
 *   node scripts/seed-emojis.mjs
 *
 * Gerekli env değişkenleri (.env.local içinde olmalı):
 *   DATABASE_URL, BLOB_READ_WRITE_TOKEN
 */

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { PrismaClient } from '@prisma/client';
import { put } from '@vercel/blob';

// .env.local'i manuel yükle
import { config } from 'dotenv';
config({ path: '.env.local' });

const prisma = new PrismaClient();

const EMOJI_BASE_DIR = 'C:\\Users\\aktas\\Downloads\\Lomix New-20260420T185205Z-3-001\\Lomix New\\Emojiler\\Hareketli Emojiler - Duygular_';
const TOTAL = 28;

async function uploadBuffer(buffer, filename, contentType) {
    const blob = await put(filename, buffer, { access: 'public', contentType });
    return blob.url;
}

async function main() {
    console.log('Emoji seed başlıyor...\n');

    for (let i = 1; i <= TOTAL; i++) {
        const folder = join(EMOJI_BASE_DIR, String(i));
        const iconPath = join(folder, 'icon.png');
        const svgaPath = join(folder, 'act.svga');

        if (!existsSync(iconPath)) {
            console.warn(`[${i}] icon.png bulunamadı, atlanıyor.`);
            continue;
        }

        try {
            // Check if already seeded
            const existing = await prisma.emoji.findFirst({ where: { name: `Emoji ${i}` } });
            if (existing) {
                console.log(`[${i}] Zaten mevcut, atlanıyor.`);
                continue;
            }

            // Upload icon
            const iconBuffer = readFileSync(iconPath);
            const imageUrl = await uploadBuffer(iconBuffer, `emoji-images/emoji_${i}.png`, 'image/png');
            console.log(`[${i}] icon.png yüklendi → ${imageUrl}`);

            // Upload svga (optional)
            let svgaUrl = null;
            if (existsSync(svgaPath)) {
                const svgaBuffer = readFileSync(svgaPath);
                svgaUrl = await uploadBuffer(svgaBuffer, `emoji-svga/emoji_${i}.svga`, 'application/octet-stream');
                console.log(`[${i}] act.svga yüklendi → ${svgaUrl}`);
            }

            // DB insert
            await prisma.emoji.create({
                data: {
                    name: `Emoji ${i}`,
                    imageUrl,
                    svgaUrl,
                    order: i - 1,
                    isVisible: true,
                },
            });

            console.log(`[${i}] ✓ Veritabanına kaydedildi.\n`);
        } catch (err) {
            console.error(`[${i}] HATA:`, err.message);
        }
    }

    console.log('Seed tamamlandı.');
    await prisma.$disconnect();
}

main();
