const express = require('express');
const router = express.Router();
const db = require('../database/connection');
const { authMiddleware } = require('../middleware/authMiddleware');
const { roleMiddleware } = require('../middleware/roleMiddleware');

// List categories
router.get('/',authMiddleware, async (req, res) => {
	const categories = await db('categories').select('*').orderBy('created_at', 'desc');
	res.json({ categories });
});

// Create category (admin)
router.post('/', authMiddleware, roleMiddleware('admin'), async (req, res) => {
	const { name, description } = req.body;
	if (!name) return res.status(400).json({ error: 'name zorunlu' });
	try {
		const [cat] = await db('categories').insert({ name, description }).returning(['id', 'name', 'description', 'created_at']);
		res.status(201).json({ category: cat });
	} catch (e) {
		res.status(400).json({ error: e.message });
	}
});

// Delete category (admin) - body ile id
router.post('/delete', authMiddleware, roleMiddleware('admin'), async (req, res) => {
	const { id } = req.body;
	if (!id) return res.status(400).json({ error: 'id zorunlu' });
	await db('categories').where({ id }).del();
	res.json({ success: true });
});

module.exports = router;
