/**
 * Merkezi Validasyon Konfigürasyonu
 * Tüm route'lar için validasyon kuralları burada tanımlanır
 */

// Temel validasyon kuralları
const VALIDATION_RULES = {
  // Kullanıcı adı kuralları
  username: {
    minLength: 3,
    maxLength: 20,
    pattern: /^[a-zA-Z0-9_]+$/,
    message: 'Kullanıcı adı 3-20 karakter arası olmalı ve sadece harf, rakam ve alt çizgi içermeli'
  },

  // Şifre kuralları
  password: {
    minLength: 8,
    maxLength: 128,
    requireUppercase: true,
    requireLowercase: true,
    requireNumber: true,
    requireSpecialChar: false,
    pattern: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/,
    message: 'Şifre en az 8 karakter olmalı ve büyük harf, küçük harf, rakam içermeli'
  },

  // Email kuralları
  email: {
    pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    maxLength: 254,
    message: 'Geçerli bir email adresi giriniz'
  },

  // Doğrulama kodu kuralları
  verificationCode: {
    length: 6,
    pattern: /^\d{6}$/,
    message: 'Doğrulama kodu 6 haneli rakam olmalı'
  },

  // Thread başlık kuralları
  threadTitle: {
    minLength: 5,
    maxLength: 200,
    pattern: /^[a-zA-Z0-9\s\-_.,!?()]+$/,
    message: 'Başlık 5-200 karakter arası olmalı ve geçerli karakterler içermeli'
  },

  // Mesaj içerik kuralları
  messageContent: {
    minLength: 1,
    maxLength: 2000,
    pattern: /^[\s\S]*$/,
    message: 'Mesaj 1-2000 karakter arası olmalı'
  },

  // Kategori ID kuralları
  categoryId: {
    pattern: /^\d+$/,
    message: 'Geçerli bir kategori ID giriniz'
  },

  // Thread ID kuralları
  threadId: {
    pattern: /^\d+$/,
    message: 'Geçerli bir thread ID giriniz'
  },

  // Sayfa numarası kuralları
  page: {
    min: 1,
    max: 10000,
    pattern: /^\d+$/,
    message: 'Sayfa numarası 1-10000 arası olmalı'
  },

  // Limit kuralları
  limit: {
    min: 1,
    max: 100,
    pattern: /^\d+$/,
    message: 'Limit 1-100 arası olmalı'
  },

  // Timestamp kuralları
  timestamp: {
    pattern: /^\d{13}$/,
    message: 'Timestamp 13 haneli rakam olmalı'
  },

  // Duyuru kuralları
  announcementTitle: {
    minLength: 5,
    maxLength: 200,
    pattern: /^[\s\S]*$/,
    message: 'Duyuru başlığı 5-200 karakter arası olmalı'
  },

  announcementContent: {
    minLength: 10,
    maxLength: 5000,
    pattern: /^[\s\S]*$/,
    message: 'Duyuru içeriği 10-5000 karakter arası olmalı'
  }
};

// Route bazlı validasyon şemaları
const VALIDATION_SCHEMAS = {
  // Auth Routes
  'auth.register': {
    username: { required: true, ...VALIDATION_RULES.username },
    email: { required: true, ...VALIDATION_RULES.email },
    password: { required: true, ...VALIDATION_RULES.password }
  },

  'auth.verify': {
    email: { required: true, ...VALIDATION_RULES.email },
    code: { required: true, ...VALIDATION_RULES.verificationCode }
  },

  'auth.login': {
    email: { required: false, ...VALIDATION_RULES.email },
    password: { required: true, ...VALIDATION_RULES.password },
    username: { required: false, ...VALIDATION_RULES.username }
  },

  'auth.refresh': {
    refreshToken: { required: true, minLength: 1, message: 'Refresh token zorunlu' }
  },

  'auth.testEmail': {
    email: { required: true, ...VALIDATION_RULES.email }
  },

  // Thread Routes
  'thread.listByCategory': {
    category_id: { required: true, ...VALIDATION_RULES.categoryId }
  },

  'thread.search': {
    q: { required: false, maxLength: 100, message: 'Arama terimi en fazla 100 karakter olmalı' },
    category_id: { required: false, ...VALIDATION_RULES.categoryId },
    page: { required: false, ...VALIDATION_RULES.page },
    limit: { required: false, ...VALIDATION_RULES.limit }
  },

  'thread.show': {
    id: { required: true, ...VALIDATION_RULES.threadId }
  },

  'thread.create': {
    category_id: { required: true, ...VALIDATION_RULES.categoryId },
    title: { required: true, ...VALIDATION_RULES.threadTitle }
  },

  'thread.createWithMessage': {
    category_id: { required: true, ...VALIDATION_RULES.categoryId },
    title: { required: true, ...VALIDATION_RULES.threadTitle },
    content: { required: true, ...VALIDATION_RULES.messageContent },
    timestamp: { required: true, ...VALIDATION_RULES.timestamp }
  },

  'thread.delete': {
    id: { required: true, ...VALIDATION_RULES.threadId }
  },

  // Message Routes
  'message.listByThread': {
    thread_id: { required: true, ...VALIDATION_RULES.threadId },
    page: { required: false, ...VALIDATION_RULES.page }
  },

  'message.create': {
    thread_id: { required: true, ...VALIDATION_RULES.threadId },
    content: { required: true, ...VALIDATION_RULES.messageContent }
  },

  // Admin Announcement Routes
  'admin.announcement.create': {
    title: { required: true, ...VALIDATION_RULES.announcementTitle },
    content: { required: true, ...VALIDATION_RULES.announcementContent }
  },

  'admin.announcement.update': {
    announcementId: { required: true, ...VALIDATION_RULES.threadId },
    title: { required: false, ...VALIDATION_RULES.announcementTitle },
    content: { required: false, ...VALIDATION_RULES.announcementContent }
  },

  'admin.announcement.delete': {
    announcementId: { required: true, ...VALIDATION_RULES.threadId }
  },

  'admin.announcement.list': {
    page: { required: false, ...VALIDATION_RULES.page },
    limit: { required: false, ...VALIDATION_RULES.limit }
  },

  'admin.announcement.detail': {
    announcementId: { required: true, ...VALIDATION_RULES.threadId }
  },

  // User Announcement Routes
  'user.announcement.list': {
    page: { required: false, ...VALIDATION_RULES.page },
    limit: { required: false, ...VALIDATION_RULES.limit }
  },

  'user.announcement.detail': {
    announcementId: { required: true, ...VALIDATION_RULES.threadId }
  },

  'user.announcement.markRead': {
    announcementId: { required: true, ...VALIDATION_RULES.threadId }
  }
};

// Validasyon fonksiyonları
const validateField = (value, rules) => {
  const errors = [];

  // Required kontrolü
  if (rules.required && (!value || value.toString().trim() === '')) {
    errors.push(`${rules.message || 'Bu alan zorunludur'}`);
    return errors;
  }

  // Required değilse ve boşsa kontrol etme
  if (!rules.required && (!value || value.toString().trim() === '')) {
    return errors;
  }

  const stringValue = value.toString().trim();

  // Uzunluk kontrolleri
  if (rules.minLength && stringValue.length < rules.minLength) {
    errors.push(`${rules.message || `En az ${rules.minLength} karakter olmalı`}`);
  }

  if (rules.maxLength && stringValue.length > rules.maxLength) {
    errors.push(`${rules.message || `En fazla ${rules.maxLength} karakter olmalı`}`);
  }

  // Pattern kontrolü
  if (rules.pattern && !rules.pattern.test(stringValue)) {
    errors.push(rules.message || 'Geçersiz format');
  }

  // Sayısal kontroller
  if (rules.min !== undefined && Number(value) < rules.min) {
    errors.push(`${rules.message || `En az ${rules.min} olmalı`}`);
  }

  if (rules.max !== undefined && Number(value) > rules.max) {
    errors.push(`${rules.message || `En fazla ${rules.max} olmalı`}`);
  }

  // Şifre özel kontrolleri
  if (rules.requireUppercase && !/[A-Z]/.test(stringValue)) {
    errors.push('En az bir büyük harf içermeli');
  }

  if (rules.requireLowercase && !/[a-z]/.test(stringValue)) {
    errors.push('En az bir küçük harf içermeli');
  }

  if (rules.requireNumber && !/\d/.test(stringValue)) {
    errors.push('En az bir rakam içermeli');
  }

  if (rules.requireSpecialChar && !/[@$!%*?&]/.test(stringValue)) {
    errors.push('En az bir özel karakter içermeli');
  }

  return errors;
};

// Ana validasyon fonksiyonu
const validateRequest = (schemaName, data) => {
  const schema = VALIDATION_SCHEMAS[schemaName];
  if (!schema) {
    throw new Error(`Validasyon şeması bulunamadı: ${schemaName}`);
  }

  const errors = {};
  let hasErrors = false;

  // Şemadaki her alanı kontrol et
  for (const [fieldName, rules] of Object.entries(schema)) {
    const fieldErrors = validateField(data[fieldName], rules);
    if (fieldErrors.length > 0) {
      errors[fieldName] = fieldErrors;
      hasErrors = true;
    }
  }

  // Şemada tanımlı olmayan alanları kontrol et (opsiyonel)
  for (const [fieldName, value] of Object.entries(data)) {
    if (!schema[fieldName] && value !== undefined && value !== null && value !== '') {
      console.warn(`Uyarı: '${fieldName}' alanı için validasyon kuralı tanımlanmamış`);
    }
  }

  return {
    isValid: !hasErrors,
    errors: hasErrors ? errors : null
  };
};

module.exports = {
  VALIDATION_RULES,
  VALIDATION_SCHEMAS,
  validateRequest,
  validateField
};
