# Lomix Mobil API — Yeni Endpoint'ler

Base URL: `https://<domain>/api/mobile`

---

## `POST /api/mobile/auth/login`

E-posta **veya** kullanıcı adı ile giriş. İkisinden biri yeterli.

**Request**
```json
{
  "email": "test@example.com",
  "username": "testuser",
  "password": "Sifre123!",
  "deviceInfo": "iPhone 15"
}
```

**Response**
```json
{
  "success": true,
  "data": {
    "token": "eyJ...",
    "user": {
      "id": 1,
      "username": "testuser",
      "email": "test@example.com",
      "role": "user",
      "avatar": "https://..."
    }
  }
}
```

---

## `GET /api/mobile/settings/prices`

Sesli arama, görüntülü arama ve mesaj ücretleri. Auth gerekmez.

**Response**
```json
{
  "success": true,
  "data": {
    "voice_call_price_per_min": 10,
    "video_call_price_per_min": 20,
    "message_price": 5
  }
}
```

---

## `POST /api/mobile/gift/send-room`

Odaya hediye gönder. Göndericinin coini düşer, oda sahibine elmas kredilendirilir.

`Authorization: Bearer <token>`

**Request**
```json
{
  "giftId": 3,
  "roomId": "room_abc123",
  "amount": 2
}
```

> `amount` opsiyonel, varsayılan `1`

**Response**
```json
{
  "status": true,
  "data": {
    "remaining_balance": 800,
    "rtm_event": {
      "type": "GIFT_SENT",
      "gift_id": 3,
      "gift_name": "Kalp",
      "gift_image_url": "https://...",
      "gift_svga_url": null,
      "amount": 2,
      "total_price": 200,
      "diamond_amount": 160,
      "commission": 40,
      "sender_id": "1",
      "sender_name": "Ali",
      "sender_avatar_url": "https://...",
      "sender_level": 5,
      "sender_is_vip": false,
      "room_id": "room_abc123"
    }
  }
}
```

---

## `POST /api/mobile/gift/send-user`

Kullanıcıya hediye gönder. Alıcıya elmas kredilendirilir, DM geçmişine kaydedilir.

`Authorization: Bearer <token>`

**Request**
```json
{
  "giftId": 3,
  "toUserId": 42,
  "amount": 1
}
```

> `amount` opsiyonel, varsayılan `1`

**Response**
```json
{
  "status": true,
  "data": {
    "message_id": 99,
    "remaining_balance": 900,
    "rtm_event": {
      "type": "GIFT_SENT",
      "gift_id": 3,
      "gift_name": "Kalp",
      "gift_image_url": "https://...",
      "gift_svga_url": null,
      "amount": 1,
      "total_price": 100,
      "diamond_amount": 80,
      "commission": 20,
      "sender_id": "1",
      "sender_name": "Ali",
      "sender_avatar_url": "https://...",
      "sender_level": 5,
      "sender_is_vip": false,
      "receiver_id": "42",
      "receiver_name": "Ayşe"
    }
  }
}
```

---

## `GET /api/mobile/store/coin-packages`

Aktif coin paketleri. Auth gerekmez.

**Response**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "Başlangıç Paketi",
      "coin_amount": 200,
      "bonus_amount": 30,
      "price": 3.99,
      "currency": "TRY",
      "badge_text": "Popüler",
      "is_featured": true
    }
  ]
}
```
