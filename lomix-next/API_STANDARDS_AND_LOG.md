# Lomix API Geliştirme Standartları ve Çalışma Günlüğü

Bu dosya, projedeki API geliştirmelerini standartlaştırmak ve geçmiş kararları hatırlamak amacıyla oluşturulmuştur.

## 1. Response Standartları (ApiResponseHelper)
Tüm API yanıtları `@/lib/api-response` içerisindeki `ApiResponseHelper` sınıfını kullanmalıdır.

### Başarılı Yanıt (Success)
```typescript
return ApiResponseHelper.success(data, "Mesaj", 200);
```
**Format:**
```json
{
  "success": true,
  "message": "İşlem başarılı",
  "data": { ... }
}
```

### Hata Yanıtı (Error)
```typescript
return ApiResponseHelper.error("Hata mesajı", 400);
```
**Format:**
```json
{
  "success": false,
  "message": "Hata mesajı"
}
```

## 2. Kritik Mimari Kararlar

### Story (Hikaye) Sistemi
- `/api/mobile/add_story` (klasör) silindi.
- Yeni hikaye ekleme işlemi artık **`/api/mobile/stories`** endpoint'ine **POST** isteği atılarak yapılmaktadır.
- Mantık: `src/app/api/mobile/stories/route.ts` içerisindeki `POST` metodundadır.

### Aile (Family) Mesajları
- Redundant olan `/api/mobile/families` klasörü silindi.
- Tüm mesajlaşma trafiği tekilleştirilmiş olan **`/api/mobile/family/messages`** üzerinden dönmektedir.

### Dashboard (Admin Paneli) Sadeleştirilmesi
- Dinamik menü yapısı ve `Menu` veritabanı tablosu kaldırıldı.
- `src/components/Sidebar.tsx` artık statik bir menü yapısı (`STATIC_MENUS`) kullanıyor.
- Dinamik sayfa yapısı (`[...slug]`) ve menü yönetim sayfaları temizlendi.

## 3. Dil ve Mesajlar
- Şu an için API dönüş mesajları **Türkçe** olarak yapılandırılmıştır. 
- İleride çoklu dil desteği (i18n) eklendiğinde bu mesajlar dinamik hale getirilecektir.

## 4. Standardize Edilmiş Endpoint Listesi
Aşağıdaki yollar yeni `ApiResponseHelper` yapısına ve standart dönüş formatına (`success`, `message`, `data`) geçirilmiştir:
- `/api/mobile/profile`
- `/api/mobile/rooms`
- `/api/mobile/rooms/video`
- `/api/mobile/stories` (GET/POST)
- `/api/mobile/stories/users`
- `/api/mobile/users/recommended`
- `/api/mobile/auth/*` (Login, Register, Verify, Password Reset, Social Auth vb.)

## 5. İpucu: DB vs API Mapping
Mobil uygulamanın beklediği alan isimleri (`image_url`, `action_type` vb.) ile veritabanı sütun isimleri (`avatar`, `interaction_type`) farklı olabilir. Bu durumda veritabanını güncellemek yerine `route.ts` içerisinde mapping (eşleştirme) yapılması tercih edilir.
