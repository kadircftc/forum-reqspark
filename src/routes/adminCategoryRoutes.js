const express = require('express');
const router = express.Router();
const db = require('../database/connection');
const { authMiddleware } = require('../middleware/authMiddleware');
const { roleMiddleware } = require('../middleware/roleMiddleware');

// List admin categories (public)
router.post('/list',authMiddleware, async (req, res) => {
	const { page = 1, limit = 50 } = req.body || {};
	const safeLimit = Math.min(Number(limit) || 50, 100);
	const offset = ((Number(page) || 1) - 1) * safeLimit;

	const countRow = await db('admin_categories').count({ count: '*' }).first();
	const total = Number(countRow?.count || 0);
	const rows = await db('admin_categories')
		.orderBy('created_at', 'desc')
		.limit(safeLimit)
		.offset(offset);

	res.json({ items: rows, page: Number(page) || 1, limit: safeLimit, total, has_more: offset + rows.length < total });
});

// Create admin category
router.post('/', authMiddleware, roleMiddleware('admin'), async (req, res) => {
	const { name, description } = req.body;
	if (!name) return res.status(400).json({ error: 'name zorunlu' });
	try {
		const [cat] = await db('admin_categories').insert({ name, description }).returning(['id', 'name', 'description', 'created_at']);
		res.status(201).json({ category: cat });
	} catch (e) {
		res.status(400).json({ error: e.message });
	}
});

// Delete admin category
router.post('/delete', authMiddleware, roleMiddleware('admin'), async (req, res) => {
	const { id } = req.body;
	if (!id) return res.status(400).json({ error: 'id zorunlu' });
	await db('admin_categories').where({ id }).del();
	res.json({ success: true });
});

module.exports = router;
