const crypto = require('crypto');

function getKeyIv() {
	const keyB64 = process.env.CRYPTO_KEY;
	const ivB64 = process.env.CRYPTO_IV;
	if (!keyB64 || !ivB64) {
		throw new Error('CRYPTO_KEY ve CRYPTO_IV tanımlı olmalı');
	}
	const key = Buffer.from(keyB64, 'base64');
	const iv = Buffer.from(ivB64, 'base64');
	if (key.length !== 32 || iv.length !== 16) {
		throw new Error('CRYPTO_KEY 32 byte, CRYPTO_IV 16 byte olmalı (base64)');
	}
	return { key, iv };
}

function decryptAesGcm({ payload, tag }) {
	const { key, iv } = getKeyIv();
	const ciphertext = Buffer.from(payload, 'base64');
	const authTag = Buffer.from(tag, 'base64');
	const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
	decipher.setAuthTag(authTag);
	let decrypted = decipher.update(ciphertext, undefined, 'utf8');
	decrypted += decipher.final('utf8');
	return JSON.parse(decrypted);
}

function encryptAesGcm(obj) {
	const { key, iv } = getKeyIv();
	const plaintext = JSON.stringify({
		...obj,
		timestamp: Date.now()
	});
	const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
	let encrypted = cipher.update(plaintext, 'utf8');
	encrypted = Buffer.concat([encrypted, cipher.final()]);
	const tag = cipher.getAuthTag();
	return {
		payload: encrypted.toString('base64'),
		tag: tag.toString('base64')
	};
}

function payloadCryptoMiddleware(req, res, next) {
	console.log('🔍 Middleware çalışıyor - URL:', req.url);
	console.log('🔍 Content-Type:', req.get('Content-Type'));
	console.log('🔍 Body var mı:', !!req.body);

	// İstek: varsa payload+tag'i çöz ve req.body'ye yay
	if (req.is('application/json') && req.body && typeof req.body.payload === 'string' && typeof req.body.tag === 'string') {
		console.log('🔓 Payload+tag bulundu, şifre çözülüyor...');
		try {
			const decrypted = decryptAesGcm({ payload: req.body.payload, tag: req.body.tag });
			req.body = decrypted;
			console.log('✅ Şifre çözme başarılı:', Object.keys(decrypted));
		} catch (e) {
			console.log('❌ Şifre çözme hatası:', e.message);
			return res.status(400).json({ error: 'Geçersiz payload/tag' });
		}
	} else {
		console.log('ℹ️ Normal JSON isteği (payload+tag yok)');
	}

	// Cevap: res.json'u sar ve { payload, tag } döndür
	const originalJson = res.json.bind(res);
	res.json = (body) => {
		console.log('🔒 Response şifreleniyor...');
		try {
			// Timestamp ekle
			const bodyWithTimestamp = { ...body, timestamp: Date.now() };
			const encrypted = encryptAesGcm(bodyWithTimestamp);
			console.log('✅ Response şifreleme başarılı');
			return originalJson(encrypted);
		} catch (e) {
			console.log('❌ Response şifreleme hatası:', e.message);
			return originalJson(body);
		}
	};

	next();
}

module.exports = { payloadCryptoMiddleware, encryptAesGcm, decryptAesGcm };
