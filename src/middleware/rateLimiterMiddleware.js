const rateLimit = require('express-rate-limit');

const authLimiter = rateLimit({
	windowMs: 15 * 60 * 1000,
	max: 100,
	message: 'Çok fazla deneme. Lütfen 15 dakika sonra tekrar deneyin.'
});

module.exports = { authLimiter };
