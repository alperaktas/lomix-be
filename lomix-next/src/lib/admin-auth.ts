import { getCurrentUserId } from '@/lib/current-user';
import prisma from '@/lib/prisma';

/**
 * Admin route'ları için yetki kontrolü. proxy.ts yalnız token doğruluyor, `/api/admin/*`
 * için rol kontrolü yapmıyor; bu yüzden hassas route'lar kendi içinde bunu çağırır.
 * Rol, token'daki değere değil veritabanındaki güncel değere bakılarak belirlenir.
 */
export async function requireAdmin(request: Request): Promise<{ adminId: number } | null> {
    const userId = await getCurrentUserId(request);
    if (!userId) return null;
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
    return user?.role === 'admin' ? { adminId: userId } : null;
}
