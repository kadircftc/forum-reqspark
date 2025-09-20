const express = require('express');
const router = express.Router();
const db = require('../database/connection');
const { authMiddleware } = require('../middleware/authMiddleware');
const { authLimiter } = require('../middleware/rateLimiterMiddleware');

router.post('/me', authMiddleware, async (req, res) => {
	const userId = req.user.sub;
	const user = await db('users')
		.select('id', 'username', 'email', 'role', 'is_verified', 'created_at', 'last_login')
		.where({ id: userId })
		.first();
	
	if (!user) {
		return res.status(404).json({ error: 'Kullanıcı bulunamadı' });
	}
	
	res.json({ user });
});

router.post('/check-username', authLimiter, async (req, res) => {
	const user = await db('users')
		.select('id', 'username', 'email', 'role', 'is_verified', 'created_at', 'last_login')
		.where({ username: req.body.username })
		.first();
	
	if (user) {
		return res.status(200).json({ available: false });
	}
	
	return res.status(200).json({ available: true });
});


module.exports = router;
