const express = require('express');
const router = express.Router();
const db = require('../database/connection');
const { authMiddleware } = require('../middleware/authMiddleware');
const { verifyAccessToken } = require('../services/tokenService');
const { verificationMiddleware } = require('../middleware/verificationMiddleware');

// List messages by thread
router.post('/list-by-thread',authMiddleware, async (req, res) => {
	const { thread_id, page = 1 } = req.body;
	if (!thread_id) return res.status(400).json({ error: 'thread_id zorunlu' });
	const pageSize = 10;
	const safePage = Math.max(1, Number(page) || 1);
	const offset = (safePage - 1) * pageSize;

	// İstek atan kullanıcıyı opsiyonel olarak belirle (Authorization header varsa)
	let requesterId = null;
	const auth = req.headers.authorization || '';
	const parts = auth.split(' ');
	if (parts.length === 2 && parts[0] === 'Bearer') {
		try {
			const payload = verifyAccessToken(parts[1]);
			requesterId = payload.sub;
		} catch (e) {
			// token geçersiz ise yok say
		}
	}

	// Toplam mesaj sayısı
	const countRow = await db('messages as m').where({ 'm.thread_id': thread_id }).count({ count: '*' }).first();
	const total = Number(countRow?.count || 0);

	// Sondan 10: en yeni kayıtlar önce gelsin
	const rowsDesc = await db('messages as m')
		.leftJoin('users as u', 'u.id', 'm.user_id')
		.where({ 'm.thread_id': thread_id })
		.select('m.id','m.thread_id','m.user_id','m.content','m.created_at','u.username')
		.orderBy('m.created_at', 'desc')
		.limit(pageSize)
		.offset(offset);

	// Görünüm: en yeni en altta olacak şekilde ASC sırala (son 10'u ters çevir)
	const rowsAsc = rowsDesc.slice().reverse();

	// UI için hizalama bilgileri
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

// Create message (verified)
router.post('/', authMiddleware, verificationMiddleware, async (req, res) => {
	try {
		const { thread_id, content } = req.body;
		if (!thread_id || !content) return res.status(400).json({ error: 'thread_id ve content zorunlu' });

		// Thread var mı kontrol et
		const thread = await db('threads').where({ id: thread_id }).first();
		if (!thread) {
			return res.status(400).json({ error: 'Geçersiz thread_id' });
		}

		const userId = req.user.sub;
		const ipAddress = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket.remoteAddress || null;
		
		// Mesajı oluştur
		const [msg] = await db('messages')
			.insert({ thread_id, user_id: userId, content, ip_address: ipAddress })
			.returning(['id', 'thread_id', 'user_id', 'content', 'ip_address', 'created_at']);

		// Detaylı bilgileri al (thread, kategori, kullanıcı)
		const messageDetails = await db('messages as m')
			.leftJoin('threads as t', 't.id', 'm.thread_id')
			.leftJoin('categories as c', 'c.id', 't.category_id')
			.leftJoin('users as u', 'u.id', 'm.user_id')
			.where('m.id', msg.id)
			.select(
				'm.id', 'm.thread_id', 'm.user_id', 'm.content', 'm.created_at',
				't.title as thread_title',
				'c.id as category_id', 'c.name as category_name',
				'u.username'
			)
			.first();
		
		const response = { 
			...messageDetails,
			is_mine: true, 
			align: 'right' 
		};

		// Global broadcast - mesaj gönderen hariç herkese gönder
		const io = req.app.get('io');
		if (io) {
			const broadcastMessage = {
				...messageDetails,
				is_mine: false, // Diğer kullanıcılar için
				align: 'left'
			};
			
			// Tüm bağlı socket'lere gönder (mesaj gönderen hariç)
			let sentCount = 0;
			io.sockets.sockets.forEach((socket) => {
				if (socket.userId && socket.userId !== userId) {
					socket.emit('new_message', broadcastMessage);
					sentCount++;
				}
			});
			console.log(`Mesaj broadcast edildi - Gönderen: ${userId}, Gönderilen: ${sentCount}`);
		}

		return res.status(201).json({ message: response });
	} catch (e) {
		return res.status(400).json({ error: e.message });
	}
});

module.exports = router;
