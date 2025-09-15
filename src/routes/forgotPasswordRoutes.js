const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const db = require('../database/connection');
const { sendMail } = require('../config/email');

// Şifremi unuttum - Email gönder
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ error: 'Email adresi gerekli' });
    }

    // Kullanıcıyı kontrol et
    const user = await db('users').where({ email }).first();
    
    if (!user) {
      // Güvenlik için kullanıcı yoksa da başarılı mesaj döndür
      return res.json({ 
        message: 'Eğer bu email adresi sistemimizde kayıtlıysa, şifre sıfırlama linki gönderilecektir.' 
      });
    }

    // Eski token'ları temizle
    await db('forgot_password_tokens')
      .where({ email })
      .del();

    // Yeni token oluştur
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 dakika

    // Token'ı veritabanına kaydet
    await db('forgot_password_tokens').insert({
      email,
      token,
      expires_at: expiresAt
    });

    // Email gönder
    const resetLink = `${process.env.FRONTEND_URL || 'https://forum.reqspark.com'}/reset-password?token=${token}`;
    
    const emailContent = {
      to: email,
      subject: 'Şifre Sıfırlama - Forum Reqspark',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Şifre Sıfırlama</h2>
          <p>Merhaba ${user.username},</p>
          <p>Şifrenizi sıfırlamak için aşağıdaki linke tıklayın:</p>
          <div style="margin: 20px 0;">
            <a href="${resetLink}" 
               style="background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">
              Şifremi Sıfırla
            </a>
          </div>
          <p style="color: #666; font-size: 14px;">
            Bu link 15 dakika geçerlidir. Eğer şifre sıfırlama talebinde bulunmadıysanız, bu emaili görmezden gelebilirsiniz.
          </p>
          <p style="color: #666; font-size: 14px;">
            Link çalışmıyorsa, aşağıdaki adresi tarayıcınıza kopyalayın:<br>
            <a href="${resetLink}">${resetLink}</a>
          </p>
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
          <p style="color: #999; font-size: 12px;">
            Forum ReqSpark Ekibi
          </p>
        </div>
      `
    };

    await sendMail(emailContent);

    res.json({ 
      message: 'Şifre sıfırlama linki email adresinize gönderildi.' 
    });

  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ error: 'Şifre sıfırlama linki gönderilemedi' });
  }
});

// Token doğrulama
router.post('/verify-reset-token', async (req, res) => {
  try {
    const { token  } = req.body;
    
    const tokenData = await db('forgot_password_tokens')
      .where({ token })
      .where('expires_at', '>', new Date())
      .where({ used: false })
      .first();
    
    if (!tokenData) {
      return res.status(400).json({ 
        error: 'Geçersiz veya süresi dolmuş token' 
      });
    }

    res.json({ 
      valid: true,
      email: tokenData.email 
    });

  } catch (error) {
    console.error('Token verification error:', error);
    res.status(500).json({ error: 'Token doğrulanamadı' });
  }
});

// Şifre sıfırlama
router.post('/reset-password', async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    
    if (!token || !newPassword) {
      return res.status(400).json({ error: 'Token ve yeni şifre gerekli' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'Şifre en az 6 karakter olmalıdır' });
    }

    // Token'ı kontrol et
    const tokenData = await db('forgot_password_tokens')
      .where({ token })
      .where('expires_at', '>', new Date())
      .where({ used: false })
      .first();
    
    if (!tokenData) {
      return res.status(400).json({ 
        error: 'Geçersiz veya süresi dolmuş token' 
      });
    }

    // Şifreyi hash'le
    const bcrypt = require('bcryptjs');
    const hashedPassword = await bcrypt.hash(newPassword, 12);

    // Kullanıcının şifresini güncelle
    await db('users')
      .where({ email: tokenData.email })
      .update({
        password_hash: hashedPassword
      });

    // Token'ı kullanıldı olarak işaretle
    await db('forgot_password_tokens')
      .where({ token })
      .update({
        used: true,
        used_at: new Date()
      });

    res.json({ 
      message: 'Şifreniz başarıyla sıfırlandı. Yeni şifrenizle giriş yapabilirsiniz.' 
    });

  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ error: 'Şifre sıfırlanamadı' });
  }
});

module.exports = router;
