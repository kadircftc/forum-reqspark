const db = require('../database/connection');

async function verificationMiddleware(req, res, next) {
	if (!req.user) {
		return res.status(401).json({ error: 'Yetkisiz' });
	}
	try {
		const user = await db('users').where({ id: req.user.sub }).first('is_verified');
		if (!user || user.is_verified !== true) {
			return res.status(403).json({ error: 'E-posta doğrulaması gerekli' });
		}
		return next();
	} catch (e) {
		return res.status(500).json({ error: 'Doğrulama kontrolü başarısız' });
	}
}

module.exports = { verificationMiddleware };
