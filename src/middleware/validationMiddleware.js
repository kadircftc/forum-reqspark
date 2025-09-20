/**
 * Validasyon Middleware
 * Route'larda kullanılacak validasyon middleware'i
 */

const { validateRequest } = require('../config/validation');

/**
 * Validasyon middleware factory fonksiyonu
 * @param {string} schemaName - VALIDATION_SCHEMAS'dan schema adı
 * @returns {Function} Express middleware fonksiyonu
 */
const createValidationMiddleware = (schemaName) => {
  return (req, res, next) => {
    try {
      // POST body'den veri al
      const data = req.body || {};
      
      // Validasyonu çalıştır
      const validationResult = validateRequest(schemaName, data);
      
      if (!validationResult.isValid) {
        return res.status(400).json({
          error: 'Validasyon hatası',
          details: validationResult.errors
        });
      }
      
      // Validasyon başarılı, devam et
      next();
    } catch (error) {
      console.error('Validasyon middleware hatası:', error);
      return res.status(500).json({
        error: 'Validasyon sistemi hatası',
        details: error.message
      });
    }
  };
};

/**
 * Özel validasyon middleware'i (manuel schema ile)
 * @param {Object} schema - Validasyon şeması
 * @returns {Function} Express middleware fonksiyonu
 */
const createCustomValidationMiddleware = (schema) => {
  return (req, res, next) => {
    try {
      const data = req.body || {};
      const errors = {};
      let hasErrors = false;

      // Şemadaki her alanı kontrol et
      for (const [fieldName, rules] of Object.entries(schema)) {
        const { validateField } = require('../config/validation');
        const fieldErrors = validateField(data[fieldName], rules);
        if (fieldErrors.length > 0) {
          errors[fieldName] = fieldErrors;
          hasErrors = true;
        }
      }

      if (hasErrors) {
        return res.status(400).json({
          error: 'Validasyon hatası',
          details: errors
        });
      }

      next();
    } catch (error) {
      console.error('Özel validasyon middleware hatası:', error);
      return res.status(500).json({
        error: 'Validasyon sistemi hatası',
        details: error.message
      });
    }
  };
};

/**
 * Login için özel validasyon middleware'i
 * En az email veya username'den biri gerekli
 * @returns {Function} Express middleware fonksiyonu
 */
const createLoginValidationMiddleware = () => {
  return (req, res, next) => {
    try {
      const data = req.body || {};
      const errors = {};
      let hasErrors = false;

      // Password zorunlu
      const { validateField } = require('../config/validation');
      const passwordErrors = validateField(data.password, {
        required: true,
        ...require('../config/validation').VALIDATION_RULES.password
      });
      if (passwordErrors.length > 0) {
        errors.password = passwordErrors;
        hasErrors = true;
      }

      // Email veya username'den en az biri gerekli
      if (!data.email && !data.username) {
        errors.login = ['Email veya kullanıcı adı gerekli'];
        hasErrors = true;
      }

      // Email varsa validasyon yap
      if (data.email) {
        const emailErrors = validateField(data.email, {
          required: false,
          ...require('../config/validation').VALIDATION_RULES.email
        });
        if (emailErrors.length > 0) {
          errors.email = emailErrors;
          hasErrors = true;
        }
      }

      // Username varsa validasyon yap
      if (data.username) {
        const usernameErrors = validateField(data.username, {
          required: false,
          ...require('../config/validation').VALIDATION_RULES.username
        });
        if (usernameErrors.length > 0) {
          errors.username = usernameErrors;
          hasErrors = true;
        }
      }

      if (hasErrors) {
        return res.status(400).json({
          error: 'Validasyon hatası',
          details: errors
        });
      }

      next();
    } catch (error) {
      console.error('Login validasyon middleware hatası:', error);
      return res.status(500).json({
        error: 'Validasyon sistemi hatası',
        details: error.message
      });
    }
  };
};

/**
 * Hızlı validasyon fonksiyonu (route içinde kullanım için)
 * @param {string} schemaName - Schema adı
 * @param {Object} data - Validasyon edilecek veri
 * @returns {Object} Validasyon sonucu
 */
const quickValidate = (schemaName, data) => {
  return validateRequest(schemaName, data);
};

module.exports = {
  createValidationMiddleware,
  createCustomValidationMiddleware,
  createLoginValidationMiddleware,
  quickValidate
};
