const express = require('express');
const router = express.Router();
const db = require('../database/connection');
const { authMiddleware } = require('../middleware/authMiddleware');
const { verificationMiddleware } = require('../middleware/verificationMiddleware');
const { roleMiddleware } = require('../middleware/roleMiddleware');
const { createValidationMiddleware } = require('../middleware/validationMiddleware');

// List threads by category
router.post('/list-by-category', authMiddleware, createValidationMiddleware('thread.listByCategory'), async (req, res) => {
	const { category_id } = req.body;
	
	const threads = await db('threads as t')
		.leftJoin('messages as m', 'm.thread_id', 't.id')
		.where({ 't.category_id': category_id })
		.select('t.id', 't.category_id', 't.user_id', 't.title', 't.created_at')
		.count('m.id as message_count')
		.groupBy('t.id', 't.category_id', 't.user_id', 't.title', 't.created_at')
		.orderBy('t.created_at', 'desc');
	
	res.json({ threads });
});

// Search + pagination (POST; read operation)
router.post('/search', authMiddleware, createValidationMiddleware('thread.search'), async (req, res) => {
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
		.leftJoin('messages as m', 'm.thread_id', 'threads.id')
		.select('threads.id', 'threads.category_id', 'threads.user_id', 'threads.title', 'threads.created_at')
		.count('m.id as message_count')
		.groupBy('threads.id', 'threads.category_id', 'threads.user_id', 'threads.title', 'threads.created_at')
		.orderBy('threads.created_at', 'desc')
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
router.post('/show', authMiddleware, createValidationMiddleware('thread.show'), async (req, res) => {
	const { id } = req.body;
	const thread = await db('threads').where({ id }).first();
	if (!thread) return res.status(404).json({ error: 'Thread bulunamadı' });
	res.json({ thread });
});

// Create thread (verified)
router.post('/', authMiddleware, verificationMiddleware, createValidationMiddleware('thread.create'), async (req, res) => {
	const { category_id, title } = req.body;
	const userId = req.user.sub;
	const [thr] = await db('threads').insert({ category_id, user_id: userId, title }).returning(['id', 'category_id', 'user_id', 'title', 'created_at']);
	res.status(201).json({ thread: thr });
});

// Create thread + first message (verified)
router.post('/with-message', authMiddleware, verificationMiddleware, createValidationMiddleware('thread.createWithMessage'), async (req, res) => {
	const { category_id, title, content } = req.body;
	const userId = req.user.sub;
	const ipAddress = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket.remoteAddress || null;

	// Transaction ile thread + mesaj oluştur
	const trx = await db.transaction();
	try {
		const [thr] = await trx('threads').insert({ category_id, user_id: userId, title }).returning(['id', 'category_id', 'user_id', 'title', 'created_at']);
		const [msg] = await trx('messages').insert({ thread_id: thr.id, user_id: userId, content, ip_address: ipAddress }).returning(['id', 'thread_id', 'user_id', 'content', 'ip_address', 'created_at']);
		await trx.commit();
		return res.status(201).json({ thread: thr, message: { ...msg, is_mine: true, align: 'right' } });
	} catch (e) {
		await trx.rollback();
		console.log(e);
		return res.status(400).json({ error: e.message });
	}
});

// Delete thread (owner or admin)
router.post('/delete', authMiddleware, createValidationMiddleware('thread.delete'), async (req, res) => {
	const { id } = req.body;
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
