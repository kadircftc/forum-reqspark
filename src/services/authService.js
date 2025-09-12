const bcrypt = require('bcryptjs');
const db = require('../database/connection');
const { sendMail } = require('../config/email');
const { generateAccessToken, generateRefreshToken, verifyRefreshToken } = require('./tokenService');

function generate6DigitCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

async function isBlocked(email, ipAddress) {
  const now = db.raw('NOW()');
  const [blockByEmail] = await db('user_blocks')
    .where(function() {
      this.where('blocked_email', email);
    })
    .andWhere(function() {
      this.whereNull('blocked_until').orWhere('blocked_until', '>', db.fn.now());
    })
    .limit(1);

  const [blockByIp] = await db('user_blocks')
    .where(function() {
      this.where('blocked_ip', ipAddress);
    })
    .andWhere(function() {
      this.whereNull('blocked_until').orWhere('blocked_until', '>', db.fn.now());
    })
    .limit(1);

  return Boolean(blockByEmail || blockByIp);
}

async function register({ username, email, password }) {
  // Önce kullanıcı adı benzersiz mi kontrol et
  const existingUsername = await db('users').where({ username }).first();
  if (existingUsername) {
    throw new Error('Bu kullanıcı adı zaten kullanılıyor');
  }
  // E-posta benzersiz mi kontrol et
  const existingEmail = await db('users').where({ email }).first();
  if (existingEmail) {
    throw new Error('Bu e-posta ile bir hesap zaten mevcut');
  }
  const hashed = await bcrypt.hash(password, 10);
  const [user] = await db('users')
    .insert({ username, email, password_hash: hashed })
    .returning(['id', 'email', 'username']);

  const code = generate6DigitCode();
  await db('verification_codes').insert({
    user_id: user.id,
    code,
    attempts_left: 3,
    expires_at: new Date(Date.now() + 15 * 60 * 1000) // 15 dakika
  });

  // E-posta gönderimi
  const subject = 'Hesap Doğrulama Kodu';
  const html = `<p>Doğrulama kodunuz: <b>${code}</b></p><p>15 dakika içinde kullanınız.</p>`;
  
  try {
    console.log('📧 E-posta gönderiliyor:', email);
    await sendMail({ to: email, subject, html, text: `Kod: ${code}` });
    console.log('✅ E-posta başarıyla gönderildi');
  } catch (emailError) {
    console.log('❌ E-posta gönderme hatası:', emailError.message);
    // E-posta hatası olsa bile kullanıcıyı oluştur, sadece log'la
    console.log('⚠️ Kullanıcı oluşturuldu ama e-posta gönderilemedi',emailError );
  }

  return { id: user.id, email: user.email, username: user.username };
}

async function verifyCode({ email, code }) {
  const user = await db('users').where({ email }).first();
  if (!user) throw new Error('Kullanıcı bulunamadı');
  if (user.is_verified) return { verified: true };

  const vCode = await db('verification_codes')
    .where({ user_id: user.id })
    .orderBy('created_at', 'desc')
    .first();
  console.log("eeeeee",vCode);

  if (!vCode) throw new Error('Doğrulama kodu bulunamadı');
  if (vCode.expires_at && new Date(vCode.expires_at) < new Date()) {
    throw new Error('Doğrulama kodunun süresi dolmuş');
  }
  if (vCode.attempts_left <= 0) {
    throw new Error('Doğrulama hakkınız kalmadı. Kalan deneme: 0');
  }

  if (vCode.code !== code) {
    const newAttempts = vCode.attempts_left - 1;
    await db('verification_codes')
      .where({ id: vCode.id })
      .update({ attempts_left: newAttempts });
    return { verified: false, attempts_left: Math.max(newAttempts, 0) };
  }

  await db('users').where({ id: user.id }).update({ is_verified: true });
  // İsteğe bağlı: kodu sil
  await db('verification_codes').where({ id: vCode.id }).del();

  return { verified: true, attempts_left: vCode.attempts_left };
}

async function login({ email, password, ipAddress }) {
  const user = await db('users').where({ email }).first();
  if (!user) throw new Error('Geçersiz e-posta veya şifre');

  // Ban listesi kontrolü
  const blocked = await isBlocked(email, ipAddress);
  if (blocked || user.blocked) {
    throw new Error('Hesabınız veya IP adresiniz engellenmiş');
  }

  const passwordOk = await bcrypt.compare(password, user.password_hash);
  if (!passwordOk) {
    const attempts = (user.failed_login_attempts || 0) + 1;
    const updates = { failed_login_attempts: attempts, last_ip: ipAddress };
    let blockedFlag = false;
    if (attempts >= 3) {
      updates.blocked = true;
      blockedFlag = true;
    }
    await db('users').where({ id: user.id }).update(updates);
    if (blockedFlag) throw new Error('3 başarısız denemeden dolayı hesap kilitlendi');
    throw new Error('Geçersiz e-posta veya şifre');
  }

  // Başarılı giriş: sayaç sıfırla, son giriş bilgilerini güncelle
  await db('users')
    .where({ id: user.id })
    .update({ failed_login_attempts: 0, last_login: db.fn.now(), last_ip: ipAddress, blocked: false });

  const payload = { sub: user.id, email: user.email, role: user.role };
  const accessToken = generateAccessToken(payload);
  const refreshToken = generateRefreshToken(payload);

  await db('users').where({ id: user.id }).update({ refresh_token: refreshToken });

  return { accessToken, refreshToken, user: { id: user.id, email: user.email, username: user.username, role: user.role, is_verified: user.is_verified } };
}

module.exports = {
  register,
  verifyCode,
  login,
  async refresh({ refreshToken }) {
    if (!refreshToken) {
      throw new Error('refreshToken gerekli');
    }
    let payload;
    try {
      payload = verifyRefreshToken(refreshToken);
    } catch (e) {
      throw new Error('Geçersiz refresh token');
    }

    const user = await db('users').where({ id: payload.sub }).first();
    if (!user) {
      throw new Error('Kullanıcı bulunamadı');
    }
    if (user.blocked) {
      throw new Error('Hesabınız engellenmiş');
    }
    if (!user.refresh_token || user.refresh_token !== refreshToken) {
      throw new Error('Refresh token eşleşmiyor');
    }

    // Token rotation: yeni refresh üret ve DB'ye yaz
    const payloadForTokens = { sub: user.id, email: user.email, role: user.role };
    const newAccess = generateAccessToken(payloadForTokens);
    const newRefresh = generateRefreshToken(payloadForTokens);

    await db('users').where({ id: user.id }).update({ refresh_token: newRefresh });

    return { accessToken: newAccess, refreshToken: newRefresh };
  }
};
