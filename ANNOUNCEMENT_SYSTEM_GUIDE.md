# Duyuru Sistemi Dokümantasyonu

Bu dokümantasyon, forum uygulamasındaki duyuru sistemi hakkında detaylı bilgi verir.

## 📋 Sistem Genel Bakış

Duyuru sistemi **2 seviyeli** çalışır:

### 1. **Admin Duyuru Yönetimi**
- Adminler duyuru oluşturabilir, güncelleyebilir, silebilir
- Duyuru istatistiklerini görüntüleyebilir
- Duyuru durumunu aktif/pasif yapabilir

### 2. **Kullanıcı Duyuru Görüntüleme**
- Kullanıcılar aktif duyuruları görüntüleyebilir
- Duyuru okuma durumu takip edilir
- Okunmamış duyuru sayısı gösterilir

## 🗄️ Veritabanı Yapısı

### announcements Tablosu
```sql
CREATE TABLE announcements (
  id SERIAL PRIMARY KEY,
  title VARCHAR(200) NOT NULL,           -- Duyuru başlığı
  content TEXT NOT NULL,                 -- Duyuru içeriği
  created_by INTEGER REFERENCES users(id), -- Duyuruyu ekleyen admin
  is_active BOOLEAN DEFAULT true,        -- Duyuru aktif mi
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### announcement_reads Tablosu
```sql
CREATE TABLE announcement_reads (
  id SERIAL PRIMARY KEY,
  announcement_id INTEGER REFERENCES announcements(id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  read_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(announcement_id, user_id)       -- Bir kullanıcı aynı duyuruyu sadece bir kez okuyabilir
);
```

## 🔧 API Endpoints

### Admin Endpoints (`/admin/announcements`)

Tüm admin endpoint'leri **admin yetkisi** gerektirir.

#### 1. Duyuru Oluşturma
**POST** `/admin/announcements/create`

```json
{
  "title": "Yeni Forum Kuralları",
  "content": "Forum kurallarımız güncellenmiştir. Lütfen okuyunuz."
}
```

**Response:**
```json
{
  "success": true,
  "announcement": {
    "id": 1,
    "title": "Yeni Forum Kuralları",
    "content": "Forum kurallarımız güncellenmiştir. Lütfen okuyunuz.",
    "created_by": 5,
    "is_active": true,
    "created_at": "2024-01-15T10:30:00Z",
    "updated_at": "2024-01-15T10:30:00Z"
  },
  "message": "Duyuru başarıyla oluşturuldu"
}
```

#### 2. Duyuru Güncelleme
**POST** `/admin/announcements/update`

```json
{
  "announcementId": 1,
  "title": "Güncellenmiş Forum Kuralları",
  "content": "Forum kurallarımız tekrar güncellenmiştir.",
  "isActive": true
}
```

**Response:**
```json
{
  "success": true,
  "announcement": {
    "id": 1,
    "title": "Güncellenmiş Forum Kuralları",
    "content": "Forum kurallarımız tekrar güncellenmiştir.",
    "created_by": 5,
    "is_active": true,
    "created_at": "2024-01-15T10:30:00Z",
    "updated_at": "2024-01-15T11:00:00Z"
  },
  "message": "Duyuru başarıyla güncellendi"
}
```

#### 3. Duyuru Silme
**POST** `/admin/announcements/delete`

```json
{
  "announcementId": 1
}
```

**Response:**
```json
{
  "success": true,
  "message": "Duyuru başarıyla silindi"
}
```

#### 4. Admin Duyuru Listesi
**POST** `/admin/announcements/list`

```json
{
  "page": 1,
  "limit": 20,
  "onlyActive": false
}
```

**Response:**
```json
{
  "announcements": [
    {
      "id": 1,
      "title": "Yeni Forum Kuralları",
      "content": "Forum kurallarımız güncellenmiştir...",
      "is_active": true,
      "created_at": "2024-01-15T10:30:00Z",
      "updated_at": "2024-01-15T10:30:00Z",
      "created_by": 5,
      "created_by_username": "admin_user",
      "created_by_email": "admin@example.com"
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

#### 5. Duyuru Detayı (Admin)
**POST** `/admin/announcements/detail`

```json
{
  "announcementId": 1
}
```

**Response:**
```json
{
  "announcement": {
    "id": 1,
    "title": "Yeni Forum Kuralları",
    "content": "Forum kurallarımız güncellenmiştir...",
    "is_active": true,
    "created_at": "2024-01-15T10:30:00Z",
    "updated_at": "2024-01-15T10:30:00Z",
    "created_by": 5,
    "created_by_username": "admin_user",
    "created_by_email": "admin@example.com"
  }
}
```

#### 6. Duyuru İstatistikleri
**POST** `/admin/announcements/stats`

**Response:**
```json
{
  "stats": {
    "total_announcements": 10,
    "active_announcements": 8,
    "total_reads": 150,
    "most_read_announcements": [
      {
        "id": 1,
        "title": "Yeni Forum Kuralları",
        "created_at": "2024-01-15T10:30:00Z",
        "created_by_username": "admin_user",
        "read_count": 45
      }
    ]
  }
}
```

### Kullanıcı Endpoints (`/announcements`)

Tüm kullanıcı endpoint'leri **kullanıcı yetkisi** gerektirir.

#### 1. Kullanıcı Duyuru Listesi (Okuma Durumu ile)
**POST** `/announcements/list`

```json
{
  "page": 1,
  "limit": 20
}
```

**Response:**
```json
{
  "announcements": [
    {
      "id": 1,
      "title": "Yeni Forum Kuralları",
      "content": "Forum kurallarımız güncellenmiştir...",
      "created_at": "2024-01-15T10:30:00Z",
      "updated_at": "2024-01-15T10:30:00Z",
      "created_by": 5,
      "created_by_username": "admin_user",
      "is_read": false,
      "read_at": null
    },
    {
      "id": 2,
      "title": "Sistem Bakımı",
      "content": "Sistem bakımı yapılacaktır...",
      "created_at": "2024-01-14T09:00:00Z",
      "updated_at": "2024-01-14T09:00:00Z",
      "created_by": 5,
      "created_by_username": "admin_user",
      "is_read": true,
      "read_at": "2024-01-14T15:30:00Z"
    }
  ],
  "unread_count": 1,
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 2,
    "pages": 1
  }
}
```

#### 2. Duyuru Detayı (Kullanıcı)
**POST** `/announcements/detail`

```json
{
  "announcementId": 1
}
```

**Response:**
```json
{
  "announcement": {
    "id": 1,
    "title": "Yeni Forum Kuralları",
    "content": "Forum kurallarımız güncellenmiştir...",
    "is_active": true,
    "created_at": "2024-01-15T10:30:00Z",
    "updated_at": "2024-01-15T10:30:00Z",
    "created_by": 5,
    "created_by_username": "admin_user",
    "created_by_email": "admin@example.com",
    "is_read": false,
    "read_at": null
  }
}
```

#### 3. Duyuru Okundu Olarak İşaretleme
**POST** `/announcements/mark-read`

```json
{
  "announcementId": 1
}
```

**Response:**
```json
{
  "success": true,
  "message": "Duyuru okundu olarak işaretlendi",
  "read_at": "2024-01-15T12:00:00Z"
}
```

#### 4. Okunmamış Duyuru Sayısı
**POST** `/announcements/unread-count`

**Response:**
```json
{
  "unread_count": 3
}
```

#### 5. Tüm Duyuruları Okundu Olarak İşaretleme
**POST** `/announcements/mark-all-read`

**Response:**
```json
{
  "success": true,
  "message": "2 duyuru okundu olarak işaretlendi",
  "marked_count": 2
}
```

## 🔒 Güvenlik Kuralları

### Yetkilendirme
- **Admin endpoint'leri**: `authMiddleware` + `roleMiddleware('admin')`
- **Kullanıcı endpoint'leri**: `authMiddleware`

### Validasyon Kuralları
- **title**: 5-200 karakter, zorunlu
- **content**: 10-5000 karakter, zorunlu
- **announcementId**: Sadece rakam, zorunlu
- **page**: 1-1000 arası, opsiyonel
- **limit**: 1-100 arası, opsiyonel

## 🚀 Kullanım Senaryoları

### Senaryo 1: Admin Duyuru Oluşturma
```javascript
// 1. Duyuru oluştur
POST /admin/announcements/create
{
  "title": "Önemli Duyuru",
  "content": "Bu önemli bir duyurudur."
}

// 2. Duyuru listesini kontrol et
POST /admin/announcements/list
{
  "page": 1,
  "limit": 10
}
```

### Senaryo 2: Kullanıcı Duyuru Okuma
```javascript
// 1. Duyuru listesini getir
POST /announcements/list
{
  "page": 1,
  "limit": 10
}

// 2. Okunmamış sayısını kontrol et
POST /announcements/unread-count

// 3. Duyuru detayını görüntüle
POST /announcements/detail
{
  "announcementId": 1
}

// 4. Duyuruyu okundu olarak işaretle
POST /announcements/mark-read
{
  "announcementId": 1
}
```

### Senaryo 3: Toplu Okuma İşlemi
```javascript
// Tüm duyuruları okundu olarak işaretle
POST /announcements/mark-all-read
```

## 📊 Özellikler

### Admin Özellikleri
- ✅ Duyuru oluşturma
- ✅ Duyuru güncelleme
- ✅ Duyuru silme
- ✅ Duyuru listeleme (tüm duyurular)
- ✅ Duyuru detayı görüntüleme
- ✅ Duyuru istatistikleri
- ✅ Aktif/pasif durumu yönetimi

### Kullanıcı Özellikleri
- ✅ Aktif duyuruları görüntüleme
- ✅ Okuma durumu takibi
- ✅ Okunmamış duyuru sayısı
- ✅ Duyuru detayı görüntüleme
- ✅ Duyuru okundu olarak işaretleme
- ✅ Toplu okuma işlemi

## 🛠️ Hata Yönetimi

### Yaygın Hatalar
- `"Duyuru bulunamadı"` - Geçersiz announcementId
- `"Duyuru bulunamadı veya aktif değil"` - Pasif duyuru
- `"Duyuru zaten okunmuş"` - Tekrar okuma işlemi
- `"Başlık 5-200 karakter arası olmalı"` - Validasyon hatası
- `"İçerik 10-5000 karakter arası olmalı"` - Validasyon hatası

### HTTP Status Kodları
- `200` - Başarılı işlem
- `201` - Başarılı oluşturma
- `400` - Validasyon hatası
- `401` - Yetkisiz erişim
- `403` - Admin yetkisi gerekli

## 📝 Örnek Frontend Kullanımı

### React Örneği - Duyuru Listesi
```javascript
const AnnouncementList = () => {
  const [announcements, setAnnouncements] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    // Duyuru listesini getir
    fetchAnnouncements();
    // Okunmamış sayısını getir
    fetchUnreadCount();
  }, []);

  const fetchAnnouncements = async () => {
    const response = await fetch('/announcements/list', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${userToken}`
      },
      body: JSON.stringify({ page: 1, limit: 20 })
    });
    const data = await response.json();
    setAnnouncements(data.announcements);
    setUnreadCount(data.unread_count); // Okunmamış sayısını da güncelle
  };

  const markAsRead = async (announcementId) => {
    await fetch('/announcements/mark-read', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${userToken}`
      },
      body: JSON.stringify({ announcementId })
    });
    // Listeyi yenile
    fetchAnnouncements();
    fetchUnreadCount();
  };

  return (
    <div>
      <h2>Duyurular ({unreadCount} okunmamış)</h2>
      {announcements.map(announcement => (
        <div key={announcement.id} className={announcement.is_read ? 'read' : 'unread'}>
          <h3>{announcement.title}</h3>
          <p>{announcement.content}</p>
          {!announcement.is_read && (
            <button onClick={() => markAsRead(announcement.id)}>
              Okundu Olarak İşaretle
            </button>
          )}
        </div>
      ))}
    </div>
  );
};
```

### Admin Panel Örneği
```javascript
const AdminAnnouncementPanel = () => {
  const [announcements, setAnnouncements] = useState([]);

  const createAnnouncement = async (title, content) => {
    const response = await fetch('/admin/announcements/create', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      },
      body: JSON.stringify({ title, content })
    });
    const result = await response.json();
    if (result.success) {
      // Listeyi yenile
      fetchAnnouncements();
    }
  };

  const deleteAnnouncement = async (announcementId) => {
    if (confirm('Duyuruyu silmek istediğinizden emin misiniz?')) {
      await fetch('/admin/announcements/delete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminToken}`
        },
        body: JSON.stringify({ announcementId })
      });
      fetchAnnouncements();
    }
  };

  return (
    <div>
      <h2>Duyuru Yönetimi</h2>
      {/* Duyuru oluşturma formu */}
      <CreateAnnouncementForm onSubmit={createAnnouncement} />
      
      {/* Duyuru listesi */}
      {announcements.map(announcement => (
        <div key={announcement.id}>
          <h3>{announcement.title}</h3>
          <p>{announcement.content}</p>
          <button onClick={() => deleteAnnouncement(announcement.id)}>
            Sil
          </button>
        </div>
      ))}
    </div>
  );
};
```

Bu sistem sayesinde adminler etkili bir şekilde duyuru yönetimi yapabilir ve kullanıcılar duyuruları takip edebilir! 📢
