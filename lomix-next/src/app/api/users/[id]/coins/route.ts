import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// POST: Coins ekle veya sil
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const userId = Number(id);
        const { amount, action, reason } = await req.json();

        if (!amount || typeof amount !== 'number' || amount <= 0) {
            return NextResponse.json({ message: 'Geçerli bir miktar belirtin' }, { status: 400 });
        }

        if (!action || !['add', 'remove'].includes(action)) {
            return NextResponse.json({ message: 'Geçersiz işlem (add/remove)' }, { status: 400 });
        }

        // Wallet var mı kontrol et, yoksa oluştur
        let wallet = await prisma.wallet.findUnique({ where: { userId } });

        if (!wallet) {
            wallet = await prisma.wallet.create({
                data: { userId, balance: 0 }
            });
        }

        const newBalance = action === 'add'
            ? wallet.balance + amount
            : Math.max(0, wallet.balance - amount);

        const updated = await prisma.wallet.update({
            where: { userId },
            data: { balance: newBalance },
        });

        // İşlemi logla
        await prisma.userLog.create({
            data: {
                userId,
                action: `Coins ${action === 'add' ? 'eklendi' : 'silindi'}: ${amount} (${reason || 'Admin işlemi'})`,
            }
        });

        return NextResponse.json({
            message: `${amount} coins ${action === 'add' ? 'eklendi' : 'silindi'}`,
            balance: updated.balance,
        });
    } catch (error: any) {
        return NextResponse.json({ message: error.message }, { status: 500 });
    }
}
