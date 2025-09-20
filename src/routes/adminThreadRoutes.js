const express = require('express');
const router = express.Router();
const db = require('../database/connection');
const { authMiddleware } = require('../middleware/authMiddleware');
const { roleMiddleware } = require('../middleware/roleMiddleware');

// List all admin threads (public)
router.post('/list', authMiddleware, async (req, res) => {
	const threads = await db('admin_threads as t')
		.leftJoin('admin_messages as m', 'm.admin_thread_id', 't.id')
		.select('t.id', 't.admin_category_id', 't.user_id', 't.title', 't.created_at')
		.count('m.id as message_count')
		.groupBy('t.id', 't.admin_category_id', 't.user_id', 't.title', 't.created_at')
		.orderBy('t.created_at', 'desc');
	
	res.json({ threads });
});

// List admin threads by category (public)
router.post('/list-by-category',authMiddleware, async (req, res) => {
	const { admin_category_id } = req.body;
	if (!admin_category_id) return res.status(400).json({ error: 'admin_category_id zorunlu' });
	
	const threads = await db('admin_threads as t')
		.leftJoin('admin_messages as m', 'm.admin_thread_id', 't.id')
		.where({ 't.admin_category_id': admin_category_id })
		.select('t.id', 't.admin_category_id', 't.user_id', 't.title', 't.created_at')
		.count('m.id as message_count')
		.groupBy('t.id', 't.admin_category_id', 't.user_id', 't.title', 't.created_at')
		.orderBy('t.created_at', 'desc');
	
	res.json({ threads });
});

// Create admin thread
router.post('/', authMiddleware, roleMiddleware('admin'), async (req, res) => {
	const { admin_category_id, title } = req.body;
	if (!admin_category_id || !title) return res.status(400).json({ error: 'admin_category_id ve title zorunlu' });
	const userId = req.user.sub;
	const [thr] = await db('admin_threads').insert({ admin_category_id, user_id: userId, title }).returning(['id', 'admin_category_id', 'user_id', 'title', 'created_at']);
	res.status(201).json({ thread: thr });
});

// Create admin thread + first message
router.post('/with-message', authMiddleware, roleMiddleware('admin'), async (req, res) => {
	const { admin_category_id, title, content } = req.body;
	if (!admin_category_id || !title || !content) return res.status(400).json({ error: 'admin_category_id, title ve content zorunlu' });
	const userId = req.user.sub;
	const ipAddress = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket.remoteAddress || null;

	const trx = await db.transaction();
	try {
		const [thr] = await trx('admin_threads').insert({ admin_category_id, user_id: userId, title }).returning(['id', 'admin_category_id', 'user_id', 'title', 'created_at']);
		const [msg] = await trx('admin_messages').insert({ admin_thread_id: thr.id, user_id: userId, content, ip_address: ipAddress }).returning(['id', 'admin_thread_id', 'user_id', 'content', 'ip_address', 'created_at']);
		await trx.commit();
		return res.status(201).json({ thread: thr, message: { ...msg, is_mine: true, align: 'right' } });
	} catch (e) {
		await trx.rollback();
		return res.status(400).json({ error: e.message });
	}
});

// Add message to admin thread
router.post('/add-message', authMiddleware, roleMiddleware('admin'), async (req, res) => {
	try{
	
	const { admin_thread_id, content } = req.body;
	if (!admin_thread_id || !content) return res.status(400).json({ error: 'admin_thread_id ve content zorunlu' });
	
	// Admin thread var mı kontrol et
	const thread = await db('admin_threads').where({ id: admin_thread_id }).first();
	if (!thread) return res.status(404).json({ error: 'Admin thread bulunamadı' });
	console.log(thread);
	const userId = req.user.sub;
	const ipAddress = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket.remoteAddress || null;
	const [msg] = await db('admin_messages').insert({ admin_thread_id, user_id: userId, content, ip_address: ipAddress }).returning(['id', 'admin_thread_id', 'user_id', 'content', 'ip_address', 'created_at']);
	res.status(201).json({ message: { ...msg, is_mine: true, align: 'right' } });
	} catch (e) {
		console.log(e);
		return res.status(400).json({ error: e.message });
	}
});

// List admin messages by thread (public)
router.post('/list-messages',authMiddleware, async (req, res) => {
	const { admin_thread_id, page = 1 } = req.body;
	if (!admin_thread_id) return res.status(400).json({ error: 'admin_thread_id zorunlu' });
	const pageSize = 10;
	const safePage = Math.max(1, Number(page) || 1);
	const offset = (safePage - 1) * pageSize;

	// Toplam mesaj sayısı
	const countRow = await db('admin_messages as m').where({ 'm.admin_thread_id': admin_thread_id }).count({ count: '*' }).first();
	const total = Number(countRow?.count || 0);

	// Sondan 10: en yeni kayıtlar önce gelsin
	const rowsDesc = await db('admin_messages as m')
		.leftJoin('users as u', 'u.id', 'm.user_id')
		.where({ 'm.admin_thread_id': admin_thread_id })
		.select('m.id','m.admin_thread_id','m.user_id','m.content','m.created_at','u.username')
		.orderBy('m.created_at', 'desc')
		.limit(pageSize)
		.offset(offset);

	// Görünüm: en yeni en altta olacak şekilde ASC sırala
	const rowsAsc = rowsDesc.slice().reverse();

	// UI için hizalama bilgileri (opsiyonel auth)
	let requesterId = null;
	const auth = req.headers.authorization || '';
	const parts = auth.split(' ');
	if (parts.length === 2 && parts[0] === 'Bearer') {
		try {
			const { verifyAccessToken } = require('../services/tokenService');
			const payload = verifyAccessToken(parts[1]);
			requesterId = payload.sub;
		} catch (e) {
			// token geçersiz ise yok say
		}
	}

	const decorated = rowsAsc.map((m) => {
		const isMine = requesterId != null && m.user_id === requesterId;
		return { ...m, username: m.username || null, is_mine: isMine, align: isMine ? 'right' : 'left' };
	});

	res.json({
		messages: decorated,
		page: safePage,
		limit: pageSize,
		total,
		has_more: offset + rowsDesc.length < total
	});
});

// Delete admin thread
router.post('/delete', authMiddleware, roleMiddleware('admin'), async (req, res) => {
	const { id } = req.body;
	if (!id) return res.status(400).json({ error: 'id zorunlu' });
	await db('admin_threads').where({ id }).del();
	res.json({ success: true });
});

module.exports = router;
