const express = require('express');
const router = express.Router();
const authService = require('../services/authService');
const { authLimiter } = require('../middleware/rateLimiterMiddleware');
const { sendMail } = require('../config/email');

router.post('/register', authLimiter, async (req, res) => {
  try {
    const { username, email, password } = req.body;
    if (!username || !email || !password) {
      return res.status(400).json({ error: 'username, email ve password zorunludur' });
    }
    const user = await authService.register({ username, email, password });
    res.status(201).json({ message: 'Kayıt başarılı, doğrulama kodu gönderildi', user });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.post('/verify', async (req, res) => {
  try {
    const { email, code } = req.body;
    if (!email || !code) {
      return res.status(400).json({ error: 'email ve code zorunludur' });
    }
    const result = await authService.verifyCode({ email, code });
    if (!result || result.verified !== true) {
      return res.status(400).json({ verified: false, attempts_left: result?.attempts_left ?? 0 });
    }
    return res.json({ message: 'Doğrulama başarılı', verified: true, attempts_left: result.attempts_left });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.post('/login', authLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'email ve password zorunludur' });
    }
    const ipAddress = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket.remoteAddress || null;
    const result = await authService.login({ email, password, ipAddress });
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.post('/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return res.status(400).json({ error: 'refreshToken zorunludur' });
    }
    const result = await authService.refresh({ refreshToken });
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// E-posta test endpoint'i
router.post('/test-email', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'email zorunludur' });
    }
    
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
