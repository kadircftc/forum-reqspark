function roleMiddleware(requiredRole) {
	return function (req, res, next) {
		if (!req.user) {
			return res.status(401).json({ error: 'Yetkisiz' });
		}
		if (req.user.role !== requiredRole) {
			return res.status(403).json({ error: 'Erişim yasak' });
		}
		next();
	};
}

module.exports = { roleMiddleware };
