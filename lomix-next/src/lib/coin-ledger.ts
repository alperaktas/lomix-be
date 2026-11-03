import { Prisma } from '@prisma/client';

/**
 * Coin hareketlerinin tek listesi. Kaynaklar:
 * - wallet_transactions: admin ekleme/silme, hikaye alımı, mesaj ücreti ve iadesi, elmas bozdurma
 * - gift_logs: gönderilen hediyeler (harcama)
 * - coin_purchases: satın alınan coin paketleri (yükleme)
 * `user_id` hareketin sahibi olan kullanıcıdır. Eski admin silme kayıtlarında kullanıcı yazılmadığı için
 * aynı işlemin kullanıcı logundan bulunur.
 */
export const COIN_LEDGER = Prisma.sql`
    SELECT 'wt-' || t.id AS key, t.created_at AS at, t.type AS type, t.amount::bigint AS amount,
        CASE WHEN t.type IN ('admin_coin_add', 'exchange', 'message_refund') THEN 'in' ELSE 'out' END AS direction,
        CASE WHEN t.type IN ('admin_coin_add', 'admin_coin_remove')
            THEN COALESCE(t.to_user_id, (
                SELECT l.user_id FROM user_logs l
                WHERE l.action LIKE 'Coins silindi: ' || t.amount || ' %'
                  AND l.created_at BETWEEN t.created_at - interval '5 seconds' AND t.created_at + interval '5 seconds'
                LIMIT 1))
            ELSE t.from_user_id END AS user_id,
        CASE WHEN t.type IN ('admin_coin_add', 'admin_coin_remove') THEN t.from_user_id
             WHEN t.type = 'message' THEN t.to_user_id
             ELSE NULL END AS other_id,
        t.description AS description
    FROM wallet_transactions t
    UNION ALL
    SELECT 'gift-' || g.id, g.created_at, 'gift', g.total_price::bigint, 'out', g.sender_id, g.receiver_id,
        COALESCE((SELECT gf.name FROM gifts gf WHERE gf.id = g.gift_id), 'Hediye') || ' x' || g.amount
            || CASE WHEN g.room_id IS NOT NULL THEN ' (oda)' ELSE '' END
    FROM gift_logs g
    UNION ALL
    SELECT 'buy-' || p.id, p.purchased_at, 'purchase', p.amount::bigint, 'in', p.user_id, NULL::int,
        'Coin paketi, ' || p.tl_amount || ' TL'
    FROM coin_purchases p
`;

/** Hareket türlerinin kullanıcıya gösterilen adları. */
export const COIN_TYPE_LABELS: Record<string, string> = {
    purchase: 'Coin Satın Alma',
    admin_coin_add: 'Yönetici Ekleme',
    admin_coin_remove: 'Yönetici Düzeltmesi',
    exchange: 'Elmas Bozdurma',
    message_refund: 'Mesaj İadesi',
    gift: 'Hediye',
    story_purchase: 'Hikaye',
    message: 'Mesaj Ücreti',
};
