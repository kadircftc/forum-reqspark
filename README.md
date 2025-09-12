# Forum ReqSpark

Node.js ve PostgreSQL kullanılarak geliştirilmiş forum uygulaması.

## 🚀 Özellikler

- **Kullanıcı Yönetimi**: Kayıt, giriş, doğrulama sistemi
- **Forum Kategorileri**: Konuları kategorilere ayırma
- **Thread Sistemi**: Başlık oluşturma ve yönetimi
- **Mesajlaşma**: Thread'lere mesaj ekleme
- **Güvenlik**: Rate limiting, IP engelleme, şifre hashleme
- **Migration Sistemi**: Veritabanı değişikliklerini yönetme

## 📋 Gereksinimler

- Node.js (v16 veya üzeri)
- PostgreSQL (v12 veya üzeri)
- npm veya yarn

## 🛠️ Kurulum

### 1. Projeyi klonlayın
```bash
git clone <repository-url>
cd forum-reqspark
```

### 2. Bağımlılıkları yükleyin
```bash
npm install
```

### 3. Environment dosyasını oluşturun
```bash
cp env.example .env
```

### 4. .env dosyasını düzenleyin
```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=forum_reqspark
DB_USER=your_username
DB_PASSWORD=your_password
PORT=3000
NODE_ENV=development
```

### 5. PostgreSQL veritabanını oluşturun
```sql
CREATE DATABASE forum_reqspark;
```

### 6. Migration'ları çalıştırın
```bash
npm run migrate
```

### 7. Uygulamayı başlatın
```bash
# Development
npm run dev

# Production
npm start
```

## 📊 Veritabanı Şeması

### Tablolar

1. **users** - Kullanıcı bilgileri
2. **user_blocks** - IP/email engelleme listesi
3. **verification_codes** - E-mail doğrulama kodları
4. **categories** - Forum kategorileri
5. **threads** - Konu başlıkları
6. **messages** - Mesajlar

## 🔧 Migration Komutları

```bash
# Son migration'ları çalıştır
npm run migrate

# Migration'ları geri al
npm run migrate:rollback

# Yeni migration oluştur
npm run migrate:make migration_name

# Seed verilerini yükle
npm run db:seed
```

## 📁 Proje Yapısı

```
forum-reqspark/
├── src/
│   ├── database/
│   │   ├── migrations/          # Migration dosyaları
│   │   ├── seeds/              # Seed dosyaları
│   │   └── connection.js       # DB bağlantısı
│   └── app.js                  # Ana uygulama dosyası
├── package.json
├── knexfile.js                 # Knex konfigürasyonu
├── env.example                 # Environment örneği
└── README.md
```

## 🔒 Güvenlik

- **Rate Limiting**: IP başına istek sınırlaması
- **Helmet**: HTTP güvenlik başlıkları
- **Password Hashing**: bcryptjs ile şifre hashleme
- **Input Validation**: Giriş verilerinin doğrulanması
- **IP Blocking**: Kötü niyetli IP'lerin engellenmesi

## 🚦 API Endpoints

### Temel Endpoints

- `GET /` - API bilgileri
- `GET /health` - Sistem durumu kontrolü

### Auth Endpoints

- `POST /auth/register`
  - Body: `{ username, email, password }`
  - Davranış: Kullanıcıyı oluşturur, 6 haneli doğrulama kodu üretir ve mail gönderir.

- `POST /auth/verify`
  - Body: `{ email, code }`
  - Davranış: Kod eşleşirse `users.is_verified = true` yapar (3 hak, 15 dk).

- `POST /auth/login`
  - Body: `{ email, password }`
  - Davranış: `bcrypt.compare` ile doğrular; `user_blocks` ve kullanıcı `blocked` durumu kontrol edilir. 3 hatalı denemede hesap kilitlenir. Başarılı girişte `accessToken` ve `refreshToken` döner, `users.refresh_token` güncellenir.

## 🐛 Hata Ayıklama

### Veritabanı Bağlantı Sorunu
```bash
# PostgreSQL servisinin çalıştığını kontrol edin
pg_ctl status

# Veritabanı bağlantısını test edin
npm run migrate
```

### Migration Sorunları
```bash
# Migration durumunu kontrol edin
npx knex migrate:status

# Migration'ları sıfırlayın (DİKKAT: Veri kaybı olur!)
npx knex migrate:rollback --all
npx knex migrate:latest
```

## 📝 Geliştirme

### Yeni Migration Oluşturma
```bash
npm run migrate:make add_new_table
```

### Seed Verisi Ekleme
```bash
# src/database/seeds/ klasörüne seed dosyası ekleyin
npm run db:seed
```

## 🤝 Katkıda Bulunma

1. Fork yapın
2. Feature branch oluşturun (`git checkout -b feature/amazing-feature`)
3. Commit yapın (`git commit -m 'Add amazing feature'`)
4. Push yapın (`git push origin feature/amazing-feature`)
5. Pull Request oluşturun

## 📄 Lisans

Bu proje MIT lisansı altında lisanslanmıştır.
