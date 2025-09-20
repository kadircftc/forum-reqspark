# Mail Kuyruklama Sistemi Dokümantasyonu

Bu dokümantasyon, forum uygulamasındaki mail kuyruklama sistemi hakkında detaylı bilgi verir.

## 📋 Sistem Genel Bakış

Mail kuyruklama sistemi **3 ana bileşenden** oluşur:

### 1. **Mail Kuyruğu**
- Toplu mail gönderimi için kuyruklama sistemi
- Başarısız mailler için otomatik tekrar deneme
- Mail durumu takibi (pending, sent, failed)

### 2. **Duyuru Maili**
- Duyuru oluşturulunca tüm kullanıcılara otomatik mail
- Kişiselleştirilmiş içerik (username değiştirme)
- Güzel HTML tasarım

### 3. **Hoş Geldin Maili**
- Kullanıcı verify olunca otomatik hoş geldin maili
- Tatlı ve samimi içerik
- Forum özelliklerini tanıtma

## 🗄️ Veritabanı Yapısı

### mail_queue Tablosu
```sql
CREATE TABLE mail_queue (
  id SERIAL PRIMARY KEY,
  to_email VARCHAR(254) NOT NULL,        -- Alıcı email
  subject VARCHAR(200) NOT NULL,         -- Mail konusu
  html_content TEXT NOT NULL,            -- HTML içerik
  text_content TEXT,                     -- Text içerik (opsiyonel)
  mail_type VARCHAR(50) NOT NULL,        -- 'announcement', 'welcome', 'verification'
  metadata JSON,                         -- Ek veriler
  status VARCHAR(20) DEFAULT 'pending',  -- 'pending', 'sent', 'failed'
  retry_count INTEGER DEFAULT 0,         -- Tekrar deneme sayısı
  error_message TEXT,                    -- Hata mesajı
  scheduled_at TIMESTAMP DEFAULT NOW(),  -- Gönderim zamanı
  sent_at TIMESTAMP,                     -- Gönderim tarihi
  created_at TIMESTAMP DEFAULT NOW()
);
```

## 🔧 Otomatik Mail Gönderimi

### 1. **Duyuru Maili**
Duyuru oluşturulunca otomatik olarak tüm aktif kullanıcılara mail gönderilir:

```javascript
// Duyuru oluşturulunca
POST /admin/announcements/create
{
  "title": "Yeni Forum Kuralları",
  "content": "Forum kurallarımız güncellenmiştir..."
}

// Otomatik olarak tüm kullanıcılara mail gönderilir
```

### 2. **Hoş Geldin Maili**
Kullanıcı verify olunca otomatik hoş geldin maili gönderilir:

```javascript
// Kullanıcı verify olunca
POST /auth/verify
{
  "email": "user@example.com",
  "code": "123456"
}

// Otomatik olarak hoş geldin maili gönderilir
```

## 📧 Mail İçerikleri

### Duyuru Maili
- **Konu**: `📢 Yeni Duyuru: [Başlık]`
- **İçerik**: Duyuru başlığı ve içeriği
- **Kişiselleştirme**: `{username}` placeholder'ı
- **Tasarım**: Modern HTML tasarım
- **Buton**: "Foruma Git" butonu

### Hoş Geldin Maili
- **Konu**: `🎉 ReqSpark Forum'a Hoş Geldin!`
- **İçerik**: 
  - "Hey Spark forumumuza hoş geldin seni aramızda görmekten mutluluk duyuyoruz"
  - "Öğrencilerin aralarındaki iletişimi etkileşimi sağlamak amacıyla buradayız"
  - "Hadi bir thread başlat ve konuşmaya dahil ol"
- **Özellikler**: Forum özelliklerini tanıtma
- **Tasarım**: Renkli ve çekici HTML tasarım

## 🔧 Admin Mail Kuyruğu Yönetimi

### 1. Mail Kuyruğunu İşleme
**POST** `/admin/mail-queue/process`

```json
{
  "limit": 10
}
```

**Response:**
```json
{
  "success": true,
  "processed": 10,
  "sent": 8,
  "failed": 2,
  "message": "10 mail işlendi (8 başarılı, 2 başarısız)"
}
```

### 2. Mail Kuyruğu İstatistikleri
**POST** `/admin/mail-queue/stats`

**Response:**
```json
{
  "stats": {
    "total": 150,
    "today": 25,
    "by_status": {
      "pending": 5,
      "sent": 140,
      "failed": 5
    }
  }
}
```

### 3. Mail Kuyruğu Listesi
**POST** `/admin/mail-queue/list`

```json
{
  "page": 1,
  "limit": 20,
  "status": "pending",
  "mailType": "announcement"
}
```

**Response:**
```json
{
  "mails": [
    {
      "id": 1,
      "to_email": "user@example.com",
      "subject": "📢 Yeni Duyuru: Forum Kuralları",
      "mail_type": "announcement",
      "status": "pending",
      "retry_count": 0,
      "scheduled_at": "2024-01-15T10:30:00Z",
      "created_at": "2024-01-15T10:30:00Z",
      "metadata": {
        "announcement_id": 1,
        "username": "user123"
      }
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

### 4. Başarısız Mailleri Temizleme
**POST** `/admin/mail-queue/cleanup`

```json
{
  "daysOld": 7
}
```

**Response:**
```json
{
  "success": true,
  "deleted_count": 3,
  "message": "3 başarısız mail temizlendi"
}
```

## ⚙️ Otomatik İşleme

### Cron Job
Sistem her 5 dakikada bir otomatik olarak mail kuyruğunu işler:

```javascript
// Her 5 dakikada bir çalışır
setInterval(async () => {
  const result = await mailQueueService.processMailQueue(20);
  if (result.processed > 0) {
    console.log(`📧 Mail kuyruğu işlendi: ${result.processed} mail`);
  }
}, 5 * 60 * 1000);
```

### Tekrar Deneme Sistemi
- **Maksimum deneme**: 3 kez
- **Deneme aralığı**: 5, 10, 15 dakika
- **Başarısız olanlar**: `failed` olarak işaretlenir

## 🚀 Kullanım Senaryoları

### Senaryo 1: Duyuru Oluşturma ve Mail Gönderimi
```javascript
// 1. Admin duyuru oluşturur
POST /admin/announcements/create
{
  "title": "Önemli Duyuru",
  "content": "Bu önemli bir duyurudur."
}

// 2. Sistem otomatik olarak:
// - Duyuruyu veritabanına kaydeder
// - Tüm aktif kullanıcıları bulur
// - Her kullanıcı için mail kuyruğa ekler
// - 5 dakika içinde mailler gönderilir
```

### Senaryo 2: Kullanıcı Verify Olma ve Hoş Geldin Maili
```javascript
// 1. Kullanıcı verify olur
POST /auth/verify
{
  "email": "user@example.com",
  "code": "123456"
}

// 2. Sistem otomatik olarak:
// - Kullanıcıyı verified olarak işaretler
// - Hoş geldin maili kuyruğa ekler
// - 5 dakika içinde mail gönderilir
```

### Senaryo 3: Mail Kuyruğu Yönetimi
```javascript
// 1. Mail kuyruğu durumunu kontrol et
POST /admin/mail-queue/stats

// 2. Bekleyen mailleri manuel işle
POST /admin/mail-queue/process
{
  "limit": 50
}

// 3. Başarısız mailleri temizle
POST /admin/mail-queue/cleanup
{
  "daysOld": 7
}
```

## 📊 Mail Türleri

### 1. **announcement**
- Duyuru mailleri
- Tüm aktif kullanıcılara gönderilir
- Kişiselleştirilmiş içerik

### 2. **welcome**
- Hoş geldin mailleri
- Sadece verify olan kullanıcılara gönderilir
- Samimi ve tanıtıcı içerik

### 3. **verification**
- Doğrulama kodu mailleri
- Sadece ilgili kullanıcıya gönderilir
- Kod içerikli mail

## 🛠️ Hata Yönetimi

### Mail Gönderim Hataları
- **SMTP hatası**: Tekrar deneme
- **Geçersiz email**: Failed olarak işaretle
- **Rate limit**: Bekleme süresi ekle

### Kuyruk Hataları
- **Veritabanı hatası**: Log'la ve devam et
- **Servis hatası**: Tekrar deneme
- **Sistem hatası**: Admin'e bildir

## 📝 Örnek Mail İçerikleri

### Duyuru Maili Örneği
```html
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; }
    .container { max-width: 600px; margin: 0 auto; }
    .header { background-color: #007bff; color: white; padding: 20px; }
    .content { padding: 20px; }
    .btn { background-color: #28a745; color: white; padding: 10px 20px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🚀 ReqSpark Forum</h1>
    </div>
    <div class="content">
      <p>Merhaba {username},</p>
      <h2>📢 Yeni Duyuru: Forum Kuralları</h2>
      <p>Forum kurallarımız güncellenmiştir...</p>
      <a href="https://forum.reqspark.com" class="btn">Foruma Git</a>
    </div>
  </div>
</body>
</html>
```

### Hoş Geldin Maili Örneği
```html
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; }
    .container { max-width: 600px; margin: 0 auto; }
    .header { background-color: #28a745; color: white; padding: 20px; }
    .content { padding: 20px; }
    .highlight { background-color: #fff3cd; padding: 15px; }
    .btn { background-color: #28a745; color: white; padding: 15px 30px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🚀 ReqSpark Forum</h1>
    </div>
    <div class="content">
      <h2>🎉 Hoş Geldin {username}!</h2>
      <p>ReqSpark Forumumuza hoş geldin! Seni aramızda görmekten mutluluk duyuyoruz.</p>
      <div class="highlight">
        💬 Öğrencilerin aralarındaki iletişimi ve etkileşimi sağlamak amacıyla buradayız. 
        Hadi bir thread başlat ve konuşmaya dahil ol!
      </div>
      <a href="https://forum.reqspark.com" class="btn">🚀 Foruma Git ve Başla!</a>
    </div>
  </div>
</body>
</html>
```

## 🔒 Güvenlik

### Mail Güvenliği
- **Rate limiting**: Aynı email'e çok sık mail gönderilmez
- **Validation**: Email formatı kontrol edilir
- **Sanitization**: HTML içerik temizlenir

### Kuyruk Güvenliği
- **Admin yetkisi**: Sadece adminler kuyruğu yönetebilir
- **Logging**: Tüm işlemler log'lanır
- **Error handling**: Hatalar güvenli şekilde yönetilir

## 📈 Performans

### Optimizasyonlar
- **Batch processing**: Toplu mail işleme
- **Async processing**: Asenkron mail gönderimi
- **Queue management**: Kuyruk yönetimi
- **Retry mechanism**: Akıllı tekrar deneme

### Monitoring
- **Mail istatistikleri**: Gönderim oranları
- **Hata takibi**: Başarısız mailler
- **Performans metrikleri**: İşlem süreleri

Bu sistem sayesinde forum kullanıcıları önemli duyuruları kaçırmaz ve yeni üyeler sıcak bir karşılama alır! 📧✨
