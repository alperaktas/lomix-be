import prisma from '@/lib/prisma';

/** Rol adı `roles` tablosunda tanımlı mı? Kullanıcıya atanacak rol buradan doğrulanır. */
export async function roleExists(name: unknown): Promise<boolean> {
    if (typeof name !== 'string' || !name) return false;
    return !!(await prisma.role.findUnique({ where: { name }, select: { id: true } }));
}
