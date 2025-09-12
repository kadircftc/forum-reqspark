const express = require('express');
const router = express.Router();
const db = require('../database/connection');
const { authMiddleware } = require('../middleware/authMiddleware');
const { roleMiddleware } = require('../middleware/roleMiddleware');

// Create report (any authenticated user)
router.post('/', authMiddleware, async (req, res) => {
	const { message_id, reason } = req.body;
	if (!message_id) return res.status(400).json({ error: 'message_id zorunlu' });
	// message var mı?
	const msg = await db('messages').where({ id: message_id }).first();
	if (!msg) return res.status(404).json({ error: 'Mesaj bulunamadı' });
	const reporterId = req.user.sub;
	const [report] = await db('message_reports')
		.insert({ message_id, reporter_id: reporterId, reason })
		.returning(['id','message_id','reporter_id','reason','created_at']);
	res.status(201).json({ report });
});

// Admin list reports
router.post('/list', authMiddleware, roleMiddleware('admin'), async (req, res) => {
	const { page = 1, limit = 50 } = req.body || {};
	const safeLimit = Math.min(Number(limit) || 50, 100);
	const offset = ((Number(page) || 1) - 1) * safeLimit;

	const base = db('message_reports as r')
		.leftJoin('messages as m', 'm.id', 'r.message_id')
		.leftJoin('users as u', 'u.id', 'r.reporter_id')
		.select('r.id','r.message_id','r.reason','r.created_at','u.username as reporter_username','m.content as message_content');

	const countRow = await base.clone().clearSelect().clearOrder().count({ count: '*' }).first();
	const total = Number(countRow?.count || 0);
	const rows = await base.clone().orderBy('r.created_at', 'desc').limit(safeLimit).offset(offset);

	res.json({ items: rows, page: Number(page)||1, limit: safeLimit, total, has_more: offset + rows.length < total });
});

module.exports = router;
