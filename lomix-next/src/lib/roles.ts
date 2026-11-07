import { Prisma, PrismaClient } from '@prisma/client';
import prisma from '@/lib/prisma';

/** Rol adı `roles` tablosunda tanımlı mı? Kullanıcıya atanacak rol buradan doğrulanır. */
export async function roleExists(name: unknown): Promise<boolean> {
    if (typeof name !== 'string' || !name) return false;
    return !!(await prisma.role.findUnique({ where: { name }, select: { id: true } }));
}

export const ROLE_AGENCY = 'ajans';
export const ROLE_STREAMER = 'yayıncı';

export type UserType = 'kullanıcı' | 'yayıncı' | 'ajans';

/** Uygulamada görünen tür rolden gelir: `ajans` → ajans, `yayıncı` → yayıncı, diğer her rol → kullanıcı. */
export function userTypeFromRole(role: string | null | undefined): UserType {
    return role === ROLE_AGENCY ? 'ajans' : role === ROLE_STREAMER ? 'yayıncı' : 'kullanıcı';
}

type Db = Prisma.TransactionClient | PrismaClient;

/**
 * Ajans sahibi / yayıncı olan kullanıcının rolünü yükseltir. Yalnızca sıradan roller (`user`, ajans için ayrıca `yayıncı`)
 * değişir; admin, moderator gibi roller asla ezilmez. Rol sonradan panelden elle değiştirilebilir.
 */
export function promoteUserRole(db: Db, userId: number, to: typeof ROLE_AGENCY | typeof ROLE_STREAMER) {
    const from = to === ROLE_AGENCY ? ['user', ROLE_STREAMER] : ['user'];
    return db.user.updateMany({ where: { id: userId, role: { in: from } }, data: { role: to } });
}

/** Rolü yalnızca `from` ise `user`a düşürür (ajans kapatıldı, yayıncı ajanstan çıkarıldı). */
export function demoteUserRole(db: Db, userId: number, from: typeof ROLE_AGENCY | typeof ROLE_STREAMER) {
    return db.user.updateMany({ where: { id: userId, role: from }, data: { role: 'user' } });
}
