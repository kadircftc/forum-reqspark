const express = require('express');
const router = express.Router();
const announcementService = require('../services/announcementService');
const { authMiddleware } = require('../middleware/authMiddleware');
const { createValidationMiddleware, createCustomValidationMiddleware } = require('../middleware/validationMiddleware');

/**
 * Kullanıcı: Duyuru listesi (okuma durumu ile)
 * POST /announcements/list
 */
router.post('/list', authMiddleware, createCustomValidationMiddleware({
  page: { 
    required: false, 
    min: 1, 
    max: 1000, 
    pattern: /^\d+$/, 
    message: 'Sayfa numarası 1-1000 arası olmalı' 
  },
  limit: { 
    required: false, 
    min: 1, 
    max: 100, 
    pattern: /^\d+$/, 
    message: 'Limit 1-100 arası olmalı' 
  }
}), async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.body;
    const userId = req.user.sub;

    const result = await announcementService.getUserAnnouncementList(userId, {
      page: Number(page),
      limit: Number(limit)
    });

    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * Kullanıcı: Duyuru detayı (okuma durumu ile)
 * POST /announcements/detail
 */
router.post('/detail', authMiddleware, createCustomValidationMiddleware({
  announcementId: { 
    required: true, 
    pattern: /^\d+$/, 
    message: 'Geçerli bir duyuru ID giriniz' 
  }
}), async (req, res) => {
  try {
    const { announcementId } = req.body;
    const userId = req.user.sub;

    const result = await announcementService.getAnnouncementDetail(Number(announcementId), userId);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * Kullanıcı: Duyuru okundu olarak işaretle
 * POST /announcements/mark-read
 */
router.post('/mark-read', authMiddleware, createCustomValidationMiddleware({
  announcementId: { 
    required: true, 
    pattern: /^\d+$/, 
    message: 'Geçerli bir duyuru ID giriniz' 
  }
}), async (req, res) => {
  try {
    const { announcementId } = req.body;
    const userId = req.user.sub;

    const result = await announcementService.markAnnouncementAsRead(Number(announcementId), userId);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * Kullanıcı: Okunmamış duyuru sayısı
 * POST /announcements/unread-count
 */
router.post('/unread-count', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.sub;

    const result = await announcementService.getUnreadAnnouncementCount(userId);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * Kullanıcı: Tüm duyuruları okundu olarak işaretle
 * POST /announcements/mark-all-read
 */
router.post('/mark-all-read', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.sub;
    const db = require('../database/connection');

    // Aktif duyuruları getir
    const activeAnnouncements = await db('announcements')
      .select('id')
      .where('is_active', true);

    let markedCount = 0;

    // Her duyuru için okuma kaydı oluştur (zaten varsa atla)
    for (const announcement of activeAnnouncements) {
      const existingRead = await db('announcement_reads')
        .where({ 
          announcement_id: announcement.id, 
          user_id: userId 
        })
        .first();

      if (!existingRead) {
        await db('announcement_reads').insert({
          announcement_id: announcement.id,
          user_id: userId
        });
        markedCount++;
      }
    }

    res.json({
      success: true,
      message: `${markedCount} duyuru okundu olarak işaretlendi`,
      marked_count: markedCount
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

module.exports = router;
