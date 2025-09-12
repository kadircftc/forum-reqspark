const express = require('express');
const router = express.Router();
const db = require('../database/connection');
const { authMiddleware } = require('../middleware/authMiddleware');
const { verificationMiddleware } = require('../middleware/verificationMiddleware');
const { roleMiddleware } = require('../middleware/roleMiddleware');

// List threads by category
router.post('/list-by-category', async (req, res) => {
	const { category_id } = req.body;
	if (!category_id) return res.status(400).json({ error: 'category_id zorunlu' });
	const threads = await db('threads').where({ category_id }).orderBy('created_at', 'desc');
	res.json({ threads });
});

// Search + pagination (POST; read operation)
router.post('/search', async (req, res) => {
	const { q, category_id, page = 1, limit = 50 } = req.body || {};
	const safeLimit = Math.min(Number(limit) || 50, 100);
	const offset = ((Number(page) || 1) - 1) * safeLimit;

	// Base query with filters only (no order or limit for count)
	const baseQuery = db('threads').modify((qb) => {
		if (category_id) qb.where('category_id', category_id);
		if (q && String(q).trim()) qb.whereILike('title', `%${String(q).trim()}%`);
	});

	// Count should not include orderBy to avoid GROUP BY error
	const countRow = await baseQuery.clone().clearSelect().clearOrder().count({ count: '*' }).first();
	const total = Number(countRow?.count || 0);

	// Data query with ordering and pagination
	const rows = await baseQuery.clone()
		.orderBy('created_at', 'desc')
		.limit(safeLimit)
		.offset(offset);

	res.json({
		items: rows,
		page: Number(page) || 1,
		limit: safeLimit,
		total,
		has_more: offset + rows.length < total
	});
});

// Show thread
router.post('/show', async (req, res) => {
	const { id } = req.body;
	if (!id) return res.status(400).json({ error: 'id zorunlu' });
	const thread = await db('threads').where({ id }).first();
	if (!thread) return res.status(404).json({ error: 'Thread bulunamadı' });
	res.json({ thread });
});

// Create thread (verified)
router.post('/', authMiddleware, verificationMiddleware, async (req, res) => {
	const { category_id, title } = req.body;
	if (!category_id || !title) return res.status(400).json({ error: 'category_id ve title zorunlu' });
	const userId = req.user.sub;
	const [thr] = await db('threads').insert({ category_id, user_id: userId, title }).returning(['id', 'category_id', 'user_id', 'title', 'created_at']);
	res.status(201).json({ thread: thr });
});

// Delete thread (owner or admin)
router.post('/delete', authMiddleware, async (req, res) => {
	const { id } = req.body;
	if (!id) return res.status(400).json({ error: 'id zorunlu' });
	const userId = req.user.sub;
	const thread = await db('threads').where({ id }).first();
	if (!thread) return res.status(404).json({ error: 'Thread bulunamadı' });
	if (thread.user_id !== userId && req.user.role !== 'admin') {
		return res.status(403).json({ error: 'Silme yetkiniz yok' });
	}
	await db('threads').where({ id }).del();
	res.json({ success: true });
});

module.exports = router;
