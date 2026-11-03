import prisma from '@/lib/prisma';

/** Admin'in kullanıcı bazında kapatıp açabildiği cüzdan işlemleri. */
export type WalletBlockKind = 'withdraw' | 'exchange' | 'spend';

const FIELD = {
    withdraw: 'withdrawBlocked',
    exchange: 'exchangeBlocked',
    spend: 'spendBlocked',
} as const;

export const WALLET_BLOCK_MESSAGES: Record<WalletBlockKind, { message: string; errorCode: string }> = {
    withdraw: { message: 'Elmas çekim işleminiz yönetici tarafından kapatılmıştır.', errorCode: 'WITHDRAW_BLOCKED' },
    exchange: { message: 'Elmas bozdurma işleminiz yönetici tarafından kapatılmıştır.', errorCode: 'EXCHANGE_BLOCKED' },
    spend: { message: 'Coin harcama işleminiz yönetici tarafından kapatılmıştır.', errorCode: 'SPEND_BLOCKED' },
};

/** Kullanıcının bu cüzdan işlemi admin tarafından kapatılmış mı? */
export async function isWalletBlocked(userId: number, kind: WalletBlockKind): Promise<boolean> {
    const field = FIELD[kind];
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { [field]: true } });
    return !!(user as Record<string, boolean> | null)?.[field];
}
