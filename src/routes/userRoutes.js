const express = require('express');
const router = express.Router();
const db = require('../database/connection');
const { authMiddleware } = require('../middleware/authMiddleware');

// Get user info (self)
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


module.exports = router;
