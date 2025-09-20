# Merkezi Validasyon Sistemi Kullanım Kılavuzu

Bu dokümantasyon, projenizde kurduğumuz merkezi validasyon sisteminin nasıl kullanılacağını açıklar.

## 📁 Dosya Yapısı

```
src/
├── config/
│   └── validation.js          # Validasyon kuralları ve şemaları
├── middleware/
│   └── validationMiddleware.js # Validasyon middleware'i
└── routes/
    ├── authRoutes.js          # Güncellenmiş route'lar
    ├── threadRoutes.js        # Güncellenmiş route'lar
    └── messageRoutes.js        # Güncellenmiş route'lar
```

## 🔧 Temel Kullanım

### 1. Route'da Validasyon Middleware Kullanımı

```javascript
const { createValidationMiddleware } = require('../middleware/validationMiddleware');

// Önceden tanımlanmış şema ile
router.post('/register', createValidationMiddleware('auth.register'), async (req, res) => {
  // Validasyon geçti, req.body'deki veriler güvenli
  const { username, email, password } = req.body;
  // ... işlemler
});
```

### 2. Özel Validasyon Şeması ile Kullanım

```javascript
const { createCustomValidationMiddleware } = require('../middleware/validationMiddleware');

const customSchema = {
  name: { 
    required: true, 
    minLength: 2, 
    maxLength: 50,
    message: 'İsim 2-50 karakter arası olmalı' 
  },
  age: { 
    required: true, 
    min: 18, 
    max: 100,
    pattern: /^\d+$/,
    message: 'Yaş 18-100 arası rakam olmalı' 
  }
};

router.post('/custom', createCustomValidationMiddleware(customSchema), async (req, res) => {
  // Özel validasyon geçti
});
```

## 📋 Mevcut Validasyon Şemaları

### Auth Routes
- `auth.register` - Kullanıcı kaydı
- `auth.verify` - Email doğrulama
- `auth.login` - Giriş
- `auth.refresh` - Token yenileme
- `auth.testEmail` - Email test

### Thread Routes
- `thread.listByCategory` - Kategoriye göre thread listesi
- `thread.search` - Thread arama
- `thread.show` - Thread detayı
- `thread.create` - Thread oluşturma
- `thread.createWithMessage` - Thread + mesaj oluşturma
- `thread.delete` - Thread silme

### Message Routes
- `message.listByThread` - Thread'e göre mesaj listesi
- `message.create` - Mesaj oluşturma

## ⚙️ Validasyon Kuralları

### Temel Kurallar
```javascript
{
  required: true,           // Zorunlu alan
  minLength: 3,             // Minimum karakter sayısı
  maxLength: 20,            // Maksimum karakter sayısı
  pattern: /^[a-z]+$/i,    // Regex pattern
  message: 'Özel hata mesajı' // Özel hata mesajı
}
```

### Sayısal Kurallar
```javascript
{
  min: 1,                   // Minimum değer
  max: 100,                 // Maksimum değer
  pattern: /^\d+$/          // Sadece rakam
}
```

### Şifre Kuralları
```javascript
{
  minLength: 8,
  requireUppercase: true,   // Büyük harf zorunlu
  requireLowercase: true,   // Küçük harf zorunlu
  requireNumber: true,      // Rakam zorunlu
  requireSpecialChar: false // Özel karakter opsiyonel
}
```

## 🆕 Yeni Validasyon Şeması Ekleme

### 1. validation.js dosyasına şema ekleyin:

```javascript
// VALIDATION_SCHEMAS objesine ekleyin
'newRoute.create': {
  name: { required: true, ...VALIDATION_RULES.username },
  email: { required: true, ...VALIDATION_RULES.email },
  description: { 
    required: false, 
    maxLength: 500, 
    message: 'Açıklama en fazla 500 karakter olmalı' 
  }
}
```

### 2. Route'da kullanın:

```javascript
router.post('/create', createValidationMiddleware('newRoute.create'), async (req, res) => {
  // Validasyon otomatik çalışır
});
```

## 🔍 Hata Mesajları

Validasyon hatası durumunda şu format döner:

```json
{
  "error": "Validasyon hatası",
  "details": {
    "username": ["Kullanıcı adı 3-20 karakter arası olmalı"],
    "password": [
      "En az bir büyük harf içermeli",
      "En az bir rakam içermeli"
    ]
  }
}
```

## 🚀 Avantajlar

1. **Merkezi Yönetim**: Tüm validasyon kuralları tek yerden yönetilir
2. **Tutarlılık**: Aynı alanlar için aynı kurallar uygulanır
3. **Kolay Bakım**: Kural değişiklikleri tek yerden yapılır
4. **Temiz Kod**: Route'lar daha temiz ve okunabilir
5. **Hata Mesajları**: Detaylı ve kullanıcı dostu hata mesajları
6. **Genişletilebilirlik**: Yeni kurallar kolayca eklenebilir

## 📝 Örnek Kullanım Senaryoları

### Senaryo 1: Yeni Route Ekleme
```javascript
// 1. validation.js'e şema ekle
'user.updateProfile': {
  username: { required: false, ...VALIDATION_RULES.username },
  bio: { required: false, maxLength: 200 }
}

// 2. Route'da kullan
router.post('/update-profile', 
  authMiddleware, 
  createValidationMiddleware('user.updateProfile'), 
  async (req, res) => {
    // Validasyon geçti
  }
);
```

### Senaryo 2: Özel Validasyon
```javascript
// Route içinde hızlı validasyon
const { quickValidate } = require('../middleware/validationMiddleware');

router.post('/special', async (req, res) => {
  const validation = quickValidate('auth.register', req.body);
  if (!validation.isValid) {
    return res.status(400).json({ errors: validation.errors });
  }
  // Devam et
});
```

## 🎯 İpuçları

1. **Şema İsimlendirme**: `modul.fonksiyon` formatını kullanın
2. **Hata Mesajları**: Türkçe ve açıklayıcı mesajlar yazın
3. **Güvenlik**: Şifre kurallarını sıkı tutun
4. **Performans**: Gereksiz validasyonlardan kaçının
5. **Test**: Her şema için test yazın

Bu sistem sayesinde artık her route için ayrı ayrı validasyon yazmanıza gerek yok. Tüm kurallar merkezi olarak yönetiliyor ve tutarlı bir şekilde uygulanıyor.
