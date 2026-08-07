# Üye & Yetki Sistemi — Gereksinim Analizi
> Son güncelleme: Tüm eksikler giderildi ✅

## Durum Özeti

| Kategori | Toplam | Karşılanan | Eksik |
|---|---|---|---|
| Oda Sahibi yetkileri | 7 | 7 | 0 |
| Oda Admini yetkileri | 5 | 5 | 0 |
| Oda Üyesi davranışı | 2 | 2 | 0 |
| Gezen Üye davranışı | 3 | 3 | 0 |
| Mic Yetki Sistemi | 2 | 2 | 0 |

---

## Mevcut Endpoint Listesi

### Oda Genel

| Endpoint | Metod | Açıklama |
|---|---|---|
| `/api/mobile/room/create` | POST | Oda oluştur (8 mic slot otomatik) |
| `/api/mobile/room/detay` | POST | Oda detayı (myRole, canManageMic, canUseMic) |
| `/api/mobile/room/join` | POST | Odaya katıl (my_role, can_use_mic döner) |
| `/api/mobile/room/leave` | POST | Odadan ayrıl |
| `/api/mobile/room/kick` | POST | Kullanıcıyı odadan at (owner/admin) |
| `/api/mobile/room/desc` | POST | Oda açıklamasını güncelle (owner/admin) |
| `/api/mobile/room/settings` | POST | Oda ayarları: isim, fotoğraf, memberOnlyMic (sadece owner) |
| `/api/mobile/room/message` | POST | Odaya yazılı mesaj gönder |

### Mic Yönetimi

| Endpoint | Metod | Açıklama |
|---|---|---|
| `/api/mobile/room/mic/take` | POST | Mic slotu al (üye/herkes — memberOnlyMic'e göre) |
| `/api/mobile/room/mic/leave` | POST | Mic slotunu bırak (odadan çıkmadan) |
| `/api/mobile/room/mic/mute` | POST | Mic slotunu sessize al/aç (owner/admin) |
| `/api/mobile/room/mic/lock` | POST | Mic slotunu kilitle/aç (owner/admin) |
| `/api/mobile/room/mic-request` | POST | Mic talebi gönder (ziyaretçi) |
| `/api/mobile/room/request` | POST | Mic talebini kabul/reddet (owner/admin) |
| `/api/mobile/room/requests` | POST | Bekleyen mic taleplerini listele (owner/admin) |

### Üye Yönetimi

| Endpoint | Metod | Açıklama |
|---|---|---|
| `/api/mobile/room/member/invite` | POST | Kullanıcıyı üye olarak davet et (owner/admin) |
| `/api/mobile/room/member/invite-respond` | POST | Daveti kabul/reddet (davet edilen) |
| `/api/mobile/room/member/list` | POST | Üye listesi (owner, adminler, üyeler) |
| `/api/mobile/room/member/remove` | POST | Üyeyi çıkar (owner/admin, kural kısıtlamalı) |
| `/api/mobile/room/member/set-admin` | POST | Admin ata/geri al (sadece owner) |

### Token

| Endpoint | Metod | Açıklama |
|---|---|---|
| `/api/mobile/room/token-refresh` | POST | Agora RTC token yenile |
| `/api/mobile/room/rtm-token` | POST | Agora Signaling (RTM) token al |

---

## Yetki Matrisi

| Eylem | Owner | Admin | Member | Visitor |
|---|---|---|---|---|
| Oda ayarlarını değiştir | ✅ | ❌ | ❌ | ❌ |
| Oda konusunu güncelle | ✅ | ✅ | ❌ | ❌ |
| Kullanıcıyı at (kick) | ✅ | ✅* | ❌ | ❌ |
| Mic mute/lock | ✅ | ✅ | ❌ | ❌ |
| Admin ata/geri al | ✅ | ❌ | ❌ | ❌ |
| Üye davet et | ✅ | ✅ | ❌ | ❌ |
| Üyeyi çıkar | ✅ | ✅* | ❌ | ❌ |
| Mic taleplerini yönet | ✅ | ✅ | ❌ | ❌ |
| Direkt mic al (memberOnlyMic=true) | ✅ | ✅ | ✅ | ❌ |
| Direkt mic al (memberOnlyMic=false) | ✅ | ✅ | ✅ | ✅ |
| Mic talebi gönder | ✅ | ✅ | ✅ | ✅** |

> *Admin, başka admin'i atamaz/çıkaramaz — sadece member'ları  
> **memberOnlyMic=true ise visitor mic talebi gönderemez

---

## RTM Event Listesi (Agora Signaling)

Tüm aksiyon endpoint'leri `rtm_event` objesi döner. Frontend bunu alıp
`channel.sendMessage(JSON.stringify(data.rtm_event))` ile yayınlar.

| Eylem | RTM Event Type | Payload |
|---|---|---|
| Kick | `KICKED` | `targetUserId` |
| Mic al | `MIC_TAKEN` | `slotIndex, userId, username, avatarUrl` |
| Mic bırak | `MIC_LEFT` | `slotIndex, userId` |
| Mic mute | `MIC_MUTED` | `slotIndex, isMuted` |
| Mic lock | `MIC_LOCKED` | `slotIndex, isLocked, freedUserId` |
| Mic talebi kabul | `MIC_REQUEST_ACCEPTED` | `targetUserId` |
| Mic talebi red | `MIC_REQUEST_REJECTED` | `targetUserId` |
| Oda ayarları | `SETTINGS_UPDATED` | `name?, memberOnlyMic?, thumbnailUrl?, description?` |

> Agora Signaling (RTM) dökümanı: https://docs.agora.io/en/signaling/overview/product-overview

---

## Ajans Sistemi (Ayrı Kapsam)

Spec'te belirtilen ama bu iterasyonun kapsamı dışında kalanlar:

| Özellik | Durum |
|---|---|
| Yayıncı başvuruları | Kontrol edilmedi |
| Yayıncı davetleri | Kontrol edilmedi |
| Kazanç görüntüleme | Kontrol edilmedi |
| Kazanç çekme | Kontrol edilmedi |
