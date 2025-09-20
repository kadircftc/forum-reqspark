const express = require('express');
const router = express.Router();
const authService = require('../services/authService');
const { authLimiter } = require('../middleware/rateLimiterMiddleware');
const { sendMail } = require('../config/email');
const { createValidationMiddleware, createLoginValidationMiddleware } = require('../middleware/validationMiddleware');

router.post('/register', authLimiter, createValidationMiddleware('auth.register'), async (req, res) => {
  try {
    const { username, email, password } = req.body;
    const user = await authService.register({ username, email, password });
    res.status(201).json({ message: 'Kayıt başarılı, doğrulama kodu gönderildi', user });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.post('/verify', createValidationMiddleware('auth.verify'), async (req, res) => {
  try {
    const { email, code } = req.body;
    const result = await authService.verifyCode({ email, code });
    if (!result || result.verified !== true) {
      return res.status(400).json({ verified: false, attempts_left: result?.attempts_left ?? 0 });
    }
    return res.json({ message: 'Doğrulama başarılı', verified: true, attempts_left: result.attempts_left });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.post('/login', authLimiter, createLoginValidationMiddleware(), async (req, res) => {
  try {
    const { email, username, password } = req.body;
    const ipAddress = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket.remoteAddress || null;
    const result = await authService.login({ email, username, password, ipAddress });
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.post('/refresh', createValidationMiddleware('auth.refresh'), async (req, res) => {
  try {
    const { refreshToken } = req.body;
    const result = await authService.refresh({ refreshToken });
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// E-posta test endpoint'i
router.post('/test-email', createValidationMiddleware('auth.testEmail'), async (req, res) => {
  try {
    const { email } = req.body;
    
    await sendMail({
      to: email,
      subject: 'Test E-posta',
      html: '<p>Bu bir test e-postasıdır.</p>',
      text: 'Bu bir test e-postasıdır.'
    });
    
    res.json({ message: 'Test e-postası gönderildi' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
