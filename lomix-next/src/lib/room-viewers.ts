import prisma from '@/lib/prisma';

/**
 * Odadaki kişi sayacını (`viewerCount`) gerçek katılımcı sayısına eşitler. Sayaç eskiden katılımda +1, ayrılışta -1
 * yapılıyordu: katılımcı zaten kayıtlıyken tekrar `join` çağrılınca (oda sahibi, yeniden bağlanma) ya da kullanıcı atılınca/
 * engellenince sayaç gerçeğinden sapıyordu ("2 kişi görünüyorum"). Her değişiklikten sonra katılımcı sayısı baştan sayılır,
 * böylece sapma bir sonraki katılma/ayrılmada kendiliğinden düzelir.
 */
export async function syncViewerCount(roomDbId: number): Promise<number> {
    const count = await prisma.roomParticipant.count({ where: { roomId: roomDbId } });
    await prisma.room.update({ where: { id: roomDbId }, data: { viewerCount: count } });
    return count;
}
