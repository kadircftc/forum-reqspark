# Admin Block Sistemi Dokümantasyonu

Bu dokümantasyon, admin kullanıcılarının diğer kullanıcıları ve IP adreslerini block etme sistemi hakkında detaylı bilgi verir.

## 📋 Sistem Genel Bakış

Admin block sistemi **2 seviyeli** çalışır:

### 1. **Otomatik Block** (users tablosunda)
- Kullanıcı 3 kez yanlış şifre girerse `blocked = true` olur
- Bu sadece başarısız giriş denemeleri için

### 2. **Manuel Admin Block** (user_blocks tablosunda)
- Admin tarafından manuel olarak eklenen blocklar
- **Email**, **Username**, **IP** bazında block yapılabiliyor
- **Süreli** veya **kalıcı** block yapılabiliyor
- **Sebep** eklenebiliyor

## 🗄️ Veritabanı Yapısı

### user_blocks Tablosu
```sql
CREATE TABLE user_blocks (
  id SERIAL PRIMARY KEY,
  blocked_email VARCHAR(120),        -- Block edilen email
  blocked_username VARCHAR(120),    -- Block edilen username
  blocked_ip VARCHAR(45),           -- Block edilen IP adresi
  reason TEXT,                      -- Block sebebi
  created_at TIMESTAMP DEFAULT NOW(),
  blocked_until TIMESTAMP,          -- Block bitiş tarihi (NULL = kalıcı)
  created_by INTEGER REFERENCES users(id) -- Block eden admin
);
```

## 🔧 API Endpoints

Tüm admin block endpoint'leri `/admin/blocks` prefix'i ile başlar ve **admin yetkisi** gerektirir.

### 1. Kullanıcı Block Etme
**POST** `/admin/blocks/block-user`

```json
{
  "userId": 123,
  "reason": "Spam mesajlar gönderiyor",
  "blockedUntil": "2024-12-31T23:59:59Z" // Opsiyonel, null = kalıcı
}
```

**Response:**
```json
{
  "success": true,
  "block": {
    "id": 1,
    "blocked_email": "user@example.com",
    "blocked_username": "spammer123",
    "reason": "Spam mesajlar gönderiyor",
    "blocked_until": "2024-12-31T23:59:59Z",
    "created_at": "2024-01-15T10:30:00Z"
  },
  "message": "Kullanıcı başarıyla block edildi"
}
```

### 2. Kullanıcı Unblock Etme
**POST** `/admin/blocks/unblock-user`

```json
{
  "userId": 123
}
```

**Response:**
```json
{
  "success": true,
  "deletedBlocks": 1,
  "message": "Kullanıcının block'u kaldırıldı"
}
```

### 3. IP Adresi Block Etme
**POST** `/admin/blocks/block-ip`

```json
{
  "ipAddress": "192.168.1.100",
  "reason": "Saldırgan IP adresi",
  "blockedUntil": "2024-12-31T23:59:59Z" // Opsiyonel
}
```

**Response:**
```json
{
  "success": true,
  "block": {
    "id": 2,
    "blocked_ip": "192.168.1.100",
    "reason": "Saldırgan IP adresi",
    "blocked_until": "2024-12-31T23:59:59Z",
    "created_at": "2024-01-15T10:35:00Z"
  },
  "message": "IP adresi başarıyla block edildi"
}
```

### 4. Block Listesi Getirme
**POST** `/admin/blocks/list`

```json
{
  "page": 1,
  "limit": 20,
  "type": "all" // "user", "ip", "all"
}
```

**Response:**
```json
{
  "blocks": [
    {
      "id": 1,
      "blocked_email": "user@example.com",
      "blocked_username": "spammer123",
      "blocked_ip": null,
      "reason": "Spam mesajlar",
      "blocked_until": "2024-12-31T23:59:59Z",
      "created_at": "2024-01-15T10:30:00Z",
      "user_id": 123,
      "user_username": "spammer123",
      "blocked_by_admin": "admin_user"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 5,
    "pages": 1
  }
}
```

### 5. Block Detayı Getirme
**POST** `/admin/blocks/detail`

```json
{
  "blockId": 1
}
```

**Response:**
```json
{
  "block": {
    "id": 1,
    "blocked_email": "user@example.com",
    "blocked_username": "spammer123",
    "blocked_ip": null,
    "reason": "Spam mesajlar gönderiyor",
    "blocked_until": "2024-12-31T23:59:59Z",
    "created_at": "2024-01-15T10:30:00Z",
    "user_id": 123,
    "user_username": "spammer123",
    "user_email": "user@example.com",
    "blocked_by_admin": "admin_user"
  }
}
```

### 6. Block Kaydını Silme
**POST** `/admin/blocks/delete`

```json
{
  "blockId": 1
}
```

**Response:**
```json
{
  "success": true,
  "message": "Block kaydı başarıyla silindi"
}
```

### 7. Kullanıcı Arama (Block için)
**POST** `/admin/blocks/search-user`

```json
{
  "query": "spammer"
}
```

**Response:**
```json
{
  "users": [
    {
      "id": 123,
      "username": "spammer123",
      "email": "spammer@example.com",
      "role": "user",
      "blocked": false,
      "created_at": "2024-01-10T08:00:00Z",
      "last_login": "2024-01-15T09:00:00Z"
    }
  ]
}
```

## 🔒 Güvenlik Kuralları

### Yetkilendirme
- Tüm endpoint'ler **admin yetkisi** gerektirir
- `authMiddleware` + `roleMiddleware('admin')` kontrolü

### Validasyon Kuralları
- **userId**: Sadece rakam, zorunlu
- **ipAddress**: Geçerli IP formatı, zorunlu
- **reason**: Maksimum 500 karakter, opsiyonel
- **blockedUntil**: Geçerli tarih formatı, opsiyonel
- **query**: 2-50 karakter arası, zorunlu

### İş Kuralları
- Admin kendini block edemez
- Admin başka admini block edemez
- Zaten block edilmiş kullanıcı tekrar block edilemez
- Block silindiğinde users tablosundaki flag otomatik güncellenir

## 🚀 Kullanım Senaryoları

### Senaryo 1: Spam Kullanıcısını Block Etme
```javascript
// 1. Kullanıcıyı ara
POST /admin/blocks/search-user
{
  "query": "spammer123"
}

// 2. Kullanıcıyı block et
POST /admin/blocks/block-user
{
  "userId": 123,
  "reason": "Spam mesajlar gönderiyor",
  "blockedUntil": "2024-12-31T23:59:59Z"
}
```

### Senaryo 2: Saldırgan IP'yi Block Etme
```javascript
POST /admin/blocks/block-ip
{
  "ipAddress": "192.168.1.100",
  "reason": "DDoS saldırısı",
  "blockedUntil": "2024-12-31T23:59:59Z"
}
```

### Senaryo 3: Block Listesini İnceleme
```javascript
POST /admin/blocks/list
{
  "page": 1,
  "limit": 10,
  "type": "user"
}
```

## 🔍 Block Kontrolü Nasıl Çalışır?

### Login Sırasında Kontrol
```javascript
// authService.js - login fonksiyonunda
const blocked = await isBlocked(user.email, ipAddress, user.username);
if (blocked || user.blocked) {
  throw new Error('Hesabınız veya IP adresiniz engellenmiş');
}
```

### isBlocked Fonksiyonu
```javascript
async function isBlocked(email, ipAddress, username) {
  // Email veya username kontrolü
  const [blockByEmail] = await db('user_blocks')
    .where(function() {
      this.where('blocked_email', email)
        .orWhere('blocked_username', username);
    })
    .andWhere(function() {
      this.whereNull('blocked_until')
        .orWhere('blocked_until', '>', db.fn.now());
    })
    .limit(1);

  // IP kontrolü
  const [blockByIp] = await db('user_blocks')
    .where('blocked_ip', ipAddress)
    .andWhere(function() {
      this.whereNull('blocked_until')
        .orWhere('blocked_until', '>', db.fn.now());
    })
    .limit(1);

  return Boolean(blockByEmail || blockByIp);
}
```

## 📊 Block Türleri

### 1. **Email Block**
- Kullanıcının email adresini block eder
- O email ile giriş yapılamaz

### 2. **Username Block**
- Kullanıcının username'ini block eder
- O username ile giriş yapılamaz

### 3. **IP Block**
- Belirli IP adresini block eder
- O IP'den giriş yapılamaz

### 4. **Kombine Block**
- Hem email hem username block edilir
- En güvenli yöntem

## ⏰ Süreli vs Kalıcı Block

### Süreli Block
```json
{
  "blockedUntil": "2024-12-31T23:59:59Z"
}
```
- Belirtilen tarihte otomatik olarak kalkar
- Geçici cezalar için uygun

### Kalıcı Block
```json
{
  "blockedUntil": null
}
```
- Manuel olarak kaldırılana kadar devam eder
- Ciddi ihlaller için uygun

## 🛠️ Hata Yönetimi

### Yaygın Hatalar
- `"Kullanıcı bulunamadı"` - Geçersiz userId
- `"Kendinizi block edemezsiniz"` - Admin kendini block etmeye çalışıyor
- `"Admin kullanıcıları block edilemez"` - Admin başka admini block etmeye çalışıyor
- `"Kullanıcı zaten block edilmiş"` - Tekrar block etmeye çalışıyor
- `"Geçersiz IP adresi"` - Yanlış IP formatı
- `"Geçersiz tarih formatı"` - Yanlış tarih formatı

### HTTP Status Kodları
- `200` - Başarılı işlem
- `201` - Başarılı oluşturma
- `400` - Validasyon hatası
- `401` - Yetkisiz erişim
- `403` - Admin yetkisi gerekli

## 📝 Örnek Frontend Kullanımı

```javascript
// React örneği
const blockUser = async (userId, reason, blockedUntil) => {
  try {
    const response = await fetch('/admin/blocks/block-user', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        userId,
        reason,
        blockedUntil
      })
    });
    
    const result = await response.json();
    if (result.success) {
      alert('Kullanıcı başarıyla block edildi');
    }
  } catch (error) {
    console.error('Block hatası:', error);
  }
};
```

Bu sistem sayesinde admin kullanıcıları forum güvenliğini sağlayabilir ve problemli kullanıcıları etkili bir şekilde yönetebilir! 🛡️
