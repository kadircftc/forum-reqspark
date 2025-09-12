const { verifyAccessToken } = require('../services/tokenService');

function authMiddleware(req, res, next) {
	const auth = req.headers.authorization || '';
	const parts = auth.split(' ');
	if (parts.length !== 2 || parts[0] !== 'Bearer') {
		return res.status(401).json({ error: 'Yetkisiz: token yok' });
	}
	try {
		const payload = verifyAccessToken(parts[1]);
		req.user = payload;
		return next();
	} catch (e) {
		return res.status(401).json({ error: 'Geçersiz token' });
	}
}

module.exports = { authMiddleware };
