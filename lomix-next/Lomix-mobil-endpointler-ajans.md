
# Mobil endpointler

Hepsi token ister (`Authorization: Bearer ...`), adresler `/api/mobile/...` ile başlıyor.
Cevaplar genelde şu şekilde: `{ "status": true, "message": "...", "data": ... }`. Hatada `status` false oluyor ve `message` içinde sebep yazıyor.

## Ajans

**Ajans ekranlarına yalnızca rolü `ajans` olan kullanıcı girebiliyor.** Ajans sahibi olsa bile rolü `user` ise (panelden düşürülmüşse) ajans sahibi uçları (`my_agency`, `pending_streamers`, `accept_streamer`, `reject_streamer`, `new_streamers`, `active_streamers`, `total_streamers`) HTTP 403 döner:
```json
{ "status": false, "success": false, "message": "Ajans bölümüne erişim yetkiniz yok.", "data": { "error_code": "AGENCY_ROLE_REQUIRED" } }
```
Ajans oluşturulunca sahibine `ajans`, ajansa yayıncı eklenince ya da başvurusu onaylanınca `yayıncı` rolü otomatik verilir. Ajansı olmayan kullanıcı `my_agency` çağırırsa eskisi gibi `data: null` gelir.

### GET /profile/my_agency
Ajans sahibinin ana ekranı. Ajansı yoksa `data` null geliyor. Rakamlar elmas, "bu ay" Türkiye saatine göre.

Yeni bir kart geldi: id'si 2 olan "Bu ay için beklenen ajans payı". Gelir kartı da artık gerçek veri.

```json
{
  "status": true,
  "data": {
    "publisherNotification": { "title": "3 yayıncı onayı bekliyor.", "count": 3, "icon": "pending", "iconColor": "#F44336" },
    "statistics": [
      { "id": 1, "title": "37.500 Elmas", "subtitle": "Bu ayki Ajans Toplam Geliri" },
      { "id": 2, "title": "7.500 Elmas", "subtitle": "Bu ay için beklenen ajans payı" },
      { "id": 3, "title": "7", "subtitle": "Ajans toplam yayıncı" },
      { "id": 4, "title": "5", "subtitle": "Toplam aktif yayıncı" },
      { "id": 5, "title": "3", "subtitle": "Yeni yayıncılar" }
    ]
  }
}
```
(icon ve iconColor alanları eskisi gibi, kısalttım.) Aktif yayıncı, bu ay elmas kazanmış olan demek. Yeni yayıncı, son 7 günde katılan.

### POST /agency/apply
Kullanıcı ajansa başvuruyor. Eskiden `profile/ajans_katil` idi, eski adı da hâlâ çalışıyor.

Gövdede şunlar var: `application_type` (third_party / management), `agency_id`, `contact_method` (phone / email), `phone_number`, `note`, `kvkk_accepted: true`. Bir de isteğe bağlı fotoğraf: form ile gönderiyorsan `photo` dosyası, JSON ile gönderiyorsan önce `/upload` ile yüklediğin fotoğrafın adresini `photo_url` olarak ver. Fotoğraf ajans sahibine gösterilmiyor.

```json
{ "status": true, "message": "Ajans başvurunuz başarıyla alındı.", "data": { "application_id": "12", "status": "pending" } }
```

**Sadece kadınlar başvurabiliyor.** Kadın olmayana 403 dönüyor ve `data.error_code` içinde sebep var:

- `AGENCY_MALE_NOT_ALLOWED`: erkek kullanıcı
- `AGENCY_GENDER_REQUIRED`: cinsiyet hiç seçilmemiş. Bu gelirse kullanıcıyı önce cinsiyet seçimine yönlendirin
- `AGENCY_FEMALE_ONLY`: cinsiyet "other"

```json
{ "status": false, "message": "Ajansa başvurmak için önce profilinizden cinsiyetinizi seçmelisiniz.", "data": { "error_code": "AGENCY_GENDER_REQUIRED" } }
```

### GET /agency/my_application
Kullanıcı kendi başvurularını ve sonucunu buradan görüyor. Başvururken girdiği bilgiler ve fotoğraf da geliyor. İstersen `?agency_id=5` ile tek ajansa bakılabilir.

```json
{
  "status": true,
  "data": {
    "is_streamer": false,
    "gender_verified": false,
    "applications": [
      {
        "application_id": "12",
        "status": "owner_approved",
        "status_text": "Ajans sahibi onayladı, admin onayı bekleniyor",
        "rejected_by": null,
        "agency": { "id": "3", "name": "Alfa Ajans", "logo": null },
        "application_type": "third_party",
        "contact_method": "phone",
        "contact_value": "+905321234567",
        "note": "merhaba",
        "photo_url": "https://...",
        "created_at": "2026-11-03T09:55:00.000Z"
      }
    ]
  }
}
```
`status` şunlardan biri: `pending` (ajans sahibi bekleniyor), `owner_approved` (ajans sahibi onayladı, son onay bekleniyor), `approved`, `rejected`. Reddedildiyse `rejected_by` içinde kimin reddettiği yazıyor (`owner` ya da `admin`). Son onay da verilince kullanıcı yayıncı oluyor ve `gender_verified` true oluyor.

### GET /agency/pending_streamers
Ajans sahibinin onayını bekleyen başvurular (eski adı `ajans/yayici_onay`). Telefon, e-posta ve fotoğraf burada gösterilmiyor.

```json
{
  "status": true,
  "data": {
    "followers": [
      { "user_id": "21", "name": "Ayşe", "profile_picture_url": "https://...", "application_id": "12", "created_at": "2026-11-03T09:55:00.000Z" }
    ]
  }
}
```

### GET /agency/accept_streamer?userId=21
Ajans sahibi başvuruyu onaylıyor (eski adı `ajans/yayici_onayla`). Başvuru son onay aşamasına geçiyor. Cevap: `{ "status": true, "message": "Yayıncı onaylandı, admin onayı bekleniyor.", "data": {} }`

Kadın olmayan birinin eski bir başvurusu varsa burası 409 dönüyor, onaylanmıyor.

### GET /agency/reject_streamer?userId=21
Ajans sahibi başvuruyu reddediyor (eski adı `ajans/yayici_reddet`). Cevap: `{ "status": true, "message": "Başvuru reddedildi.", "data": {} }`

### GET /agency/new_streamers, /agency/total_streamers, /agency/active_streamers
Yayıncı listeleri. Yeni olanlar son 7 günde katılanlar, total hepsi, active bu ay elmas kazananlar (en çok kazanan en üstte).

```json
{
  "status": true,
  "data": {
    "title": "Yeni Yayıncılar",
    "publishers": [
      { "id": 21, "full_name": "Ayşe", "profile_image": "https://...", "profile_url": "", "is_verified": true }
    ]
  }
}
```
Active listesinde liste adı `active_publishers`, her satırda ek olarak `rank` ve `diamonds` var. Yayın süresini tutmadığımız için `hours` alanında süre yok, onun yerine kazanç yazıyor (`"hours": "18.000 Elmas"`).

## Profil

### GET /profile/me
**`data.user.user_type` artık kullanıcının rolünden geliyor** (veriden değil): rolü `ajans` ise `ajans`, rolü `yayıncı` ise `yayıncı`, diğer her rol `kullanıcı`. Admin panelinden rol değişince tür de değişir. Ajans ekranlarını göstermek için bu alana bakın.

Üç yeni alan geldi:
- `data.user.gender_verified`: cinsiyet doğrulandı mı
- `data.user.gender_locked`: true ise cinsiyet seçilmiş, düzenleme ekranında kilitli gösterin
- `data.wallet.withdraw_blocked`, `exchange_blocked`, `spend_blocked`: bu kullanıcı için elmas çekme, bozdurma veya coin harcama kapatıldıysa true

### Ajans başvurusu özeti: `data.user.agency_application`
`profile/me` artık kullanıcının **en son** ajans başvurusunun özetini de döndürüyor. Böylece uygulama açılışta ayrıca `agency/my_application` çağırmadan "Başvurun inceleniyor" ya da "Başvurun reddedildi" gösterebilir. Başvuru yoksa `null`. `user_type` değişmiyor, başvuru durumunu taşımıyor.

```json
"agency_application": {
  "application_id": "50",
  "status": "owner_approved",
  "status_text": "Ajans sahibi onayladı, admin onayı bekleniyor",
  "rejected_by": null,
  "agency": { "id": "39", "name": "Alfa Ajans" },
  "updated_at": "2026-11-07T13:43:05.509Z"
}
```
`status`: `pending` (ajans sahibi bekleniyor), `owner_approved` (admin onayı bekleniyor), `approved`, `rejected`. Reddedildiyse `rejected_by` içinde `owner` ya da `admin` yazıyor. Önerilen davranış: `pending` ve `owner_approved` iken "Ajansa Katıl" formunu açmayıp durumu göster, `rejected` iken sebebi göster ve yeniden başvuruya izin ver. Onaylanınca kullanıcı yayıncı oluyor ve `user_type` `yayıncı` oluyor. Fotoğraf ve iletişim bilgisi bu özette yok, tüm başvuru geçmişi için `agency/my_application`.

### GET /ben
`data.user_info` içine `gender_verified` eklendi.

### POST /profile/update
Cinsiyet bir kez seçildikten sonra değiştirilemiyor. Farklı bir cinsiyet gönderilirse 403 dönüyor:
```json
{ "status": false, "message": "Cinsiyet seçildikten sonra değiştirilemez.", "data": { "error_code": "GENDER_LOCKED" } }
```
Aynı değeri ya da boş göndermek sorun değil. Başarılı cevapta `gender_locked` da geliyor.

## Elmas ve coin

Bu uçlarda kullanıcı artık token'dan alınıyor. Gövdede `user_id` göndermek zorunlu değil. Gönderirsen token'daki kullanıcıyla aynı olmalı, değilse 403 dönüyor.

### POST /diamond/data
```json
{
  "status": true,
  "data": {
    "balance": 5000,
    "exchanges": [ { "diamond_amount": 1000, "coin_value": 500, "date": "2026-11-01" } ],
    "withdrawals": [ { "diamond_amount": 2000, "date": "2026-10-30" } ],
    "withdraw_blocked": false,
    "exchange_blocked": false
  }
}
```

### POST /diamond/withdraw ve /diamond/exchange
Cevapları eskisi gibi. Bu kullanıcı için kapatıldıysa 403 dönüyor:
```json
{ "status": false, "message": "Elmas çekim işleminiz yönetici tarafından kapatılmıştır.", "data": { "error_code": "WITHDRAW_BLOCKED" } }
```
Bozdurmada kod `EXCHANGE_BLOCKED`.

### Coin harcama kapalıysa
Hediye (`/gift/send-user`, `/gift/send-room`), hikaye (`/stories`, ücretliyse) ve ücretli mesajda (`/chat/send`) 403 dönüyor, kod `SPEND_BLOCKED`. Ücretsiz mesajlar etkilenmiyor.

Dikkat: hediye uçlarında bu kod `data` içinde değil, doğrudan kökte geliyor (`{ "status": false, "message": "...", "error_code": "SPEND_BLOCKED" }`). Diğerlerinde `data.error_code` içinde.

### POST /coin/purchase-data
Coin satın alma ekranı (bakiye ve paketler). Cevap aynı, sadece kullanıcı token'dan.

### POST /coin/purchase-history
Aylık coin geçmişi. Artık varsayılan olarak hepsini veriyor: yüklemeler ve harcamalar birlikte. Gövdede isteğe bağlı `month`, `year` ve `type` var (`all` varsayılan, `load`, `spend`, `purchase`). Ay/yıl vermezsen son hareketin olduğu ay gelir. `type: "purchase"` gönderirsen eski cevap biçimi dönüyor (sadece satın almalar).

```json
{
  "status": true,
  "message": "11 - 2026 ait coin hareketleri",
  "data": [
    { "date": "2026-11-03", "type": "gift", "label": "Hediye", "direction": "out", "amount": 150, "description": "Kum saati x1", "other_user": { "id": 21, "name": "Ayşe" } },
    { "date": "2026-11-01", "type": "purchase", "label": "Coin Satın Alma", "direction": "in", "amount": 1000, "description": "Coin paketi, 99.9 TL", "other_user": null, "unit_price": 0.5, "total_price": 500, "tl_amount": 99.9 }
  ],
  "meta": { "period": { "month": 11, "year": 2026 }, "summary": { "loaded": 1500, "spent": 240, "net": 1260 }, "has_more": false }
}
```
`direction` in ise yükleme, out ise harcama. `amount` her zaman pozitif. Satın alma satırlarında `unit_price`, `total_price`, `tl_amount` dolu geliyor, diğerlerinde null. Hikaye ve mesaj harcamaları sadece bu sürümden sonrası için görünür, öncesi kayıtlı değil. Gerçek coin satın alma kaydı da şu an yazılmıyor (ödeme tarafı bağlı değil), o yüzden satın alma satırları boş kalabilir.

## Odalar

### GET /rooms
Oda listesinde her odada artık `level` alanı var (tamsayı). Oda seviyesi otomatik: odada kişilere gönderilen hediyelerin toplam coin değerine göre yükseliyor ve düşmüyor. Seviye basamaklarını admin panelinden (Odalar > Oda Seviyeleri) tanımlıyoruz. Hiç seviye tanımlı değilse `null` geliyor, bu durumda rozette "X" gösterin. `0` geçerli bir seviye, null ile karıştırmayın.

```json
{
  "status": true,
  "data": {
    "rooms": [
      { "id": "r_104", "name": "Sohbet & Müzik", "viewer_count": 12, "locked": false, "level": 5 },
      { "id": "r_105", "name": "Yeni oda", "viewer_count": 3, "locked": false, "level": null }
    ]
  }
}
```
(Diğer oda alanları eskisi gibi, kısalttım.) `level` aynı şekilde `/rooms/mine` ve `/search` sonuçlarındaki odalarda da geliyor.

## Hediye

### POST /gift/send-room
Odada hediye artık her zaman bir kişiye gönderiliyor, odaya hediye yok. Gövdeye **`toUserId` zorunlu** eklendi: `{ "giftId": 3, "roomId": "r_104", "toUserId": 21, "amount": 1 }`.

- Kişi seçilmezse 400, kişi kendine gönderirse 400 (`Kendinize hediye gönderemezsiniz`).
- Alıcı odada değilse 422. Alıcı oda sahibi, mikrofondaki biri ya da odadaki bir katılımcı olabilir.
- Elmas seçilen kişiye yazılıyor. Odada bir kişiye hediye gönderilince odanın seviyesi de ilerliyor.
- `rtm_event` içinde `receiver_id`, `receiver_name` ve `room_level` (hediyeden sonraki oda seviyesi, seviye tanımlı değilse `null`) geliyor.

Mikrofonda olmayan birinin profilindeki hediye kutusu da bu uçla, kişi önceden seçili olarak çalışmalı.

## Sıralama

### GET /leaderboard
Yayıncı, destekçi ve oda sıralaması. Parametreler: `type` (`anchor` yayıncılar, `supporter` destekçiler, `rooms` odalar) ve `period`.

`period` değerleri: `daily` (son 24 saat), `weekly` (son 7 gün, verilmezse bu), `monthly` (son 30 gün), `all` (**tüm zamanlar**, tarih sınırı yok). "Tüm zamanlar" için `all` gönderin. `all_time`, `alltime`, `total` da kabul edilir. **Tanınmayan bir değer artık 400 döner** (eskiden sessizce haftalığa düşüyordu, "tüm zamanlar" bu yüzden aylıktan küçük görünebiliyordu).

Cevapta `period` normalleştirilmiş değerdir, `since` pencerenin başlangıcıdır (`all` için `null`). Puan: yayıncı (`anchor`) için tüm elmas kazançları (hediyeler ve mesaj kazancı), bonus ve görev kazançları hariç. Destekçi ve oda için hediyeye harcanan coin.

```json
{ "status": true, "data": { "type": "supporter", "period": "all", "since": null,
  "top_three": [ { "rank": 1, "owner_name": "Ayşe", "score": "1.2m", "viewer_count": 1160998, "user_id": "21" } ],
  "others": [] } }
```

### Odadaki kişi sayısı
`viewer_count` artık her zaman odadaki gerçek katılımcı sayısı. `room/join`'i tekrar çağırmak (örneğin oda sahibi oda oluşturduktan sonra, yeniden bağlanırken) sayacı artırmıyor. Kullanıcı atılınca ya da engellenince de sayaç düşüyor.

## Not
Eski Türkçe adlar (`ajans/yayici_onay`, `ajans/yayici_onayla`, `ajans/yayici_reddet`, `profile/ajans_katil`) şimdilik çalışıyor, ileride kaldıracağız. Davet linki ucu henüz yok.
