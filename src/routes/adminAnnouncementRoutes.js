const express = require('express');
const router = express.Router();
const announcementService = require('../services/announcementService');
const { authMiddleware } = require('../middleware/authMiddleware');
const { roleMiddleware } = require('../middleware/roleMiddleware');
const { createValidationMiddleware, createCustomValidationMiddleware } = require('../middleware/validationMiddleware');

// Tüm admin duyuru route'ları admin yetkisi gerektirir
router.use(authMiddleware);
router.use(roleMiddleware('admin'));

/**
 * Admin: Duyuru oluştur
 * POST /admin/announcements/create
 */
router.post('/create', createCustomValidationMiddleware({
  title: { 
    required: true, 
    minLength: 5, 
    maxLength: 200, 
    message: 'Başlık 5-200 karakter arası olmalı' 
  },
  content: { 
    required: true, 
    minLength: 10, 
    maxLength: 5000, 
    message: 'İçerik 10-5000 karakter arası olmalı' 
  }
}), async (req, res) => {
  try {
    const { title, content } = req.body;
    const adminId = req.user.sub;

    const result = await announcementService.createAnnouncement({
      title,
      content,
      adminId
    });

    res.status(201).json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * Admin: Duyuru güncelle
 * POST /admin/announcements/update
 */
router.post('/update', createCustomValidationMiddleware({
  announcementId: { 
    required: true, 
    pattern: /^\d+$/, 
    message: 'Geçerli bir duyuru ID giriniz' 
  },
  title: { 
    required: false, 
    minLength: 5, 
    maxLength: 200, 
    message: 'Başlık 5-200 karakter arası olmalı' 
  },
  content: { 
    required: false, 
    minLength: 10, 
    maxLength: 5000, 
    message: 'İçerik 10-5000 karakter arası olmalı' 
  },
  isActive: { 
    required: false, 
    message: 'Aktiflik durumu true/false olmalı' 
  }
}), async (req, res) => {
  try {
    const { announcementId, title, content, isActive } = req.body;
    const adminId = req.user.sub;

    const result = await announcementService.updateAnnouncement(Number(announcementId), {
      title,
      content,
      isActive,
      adminId
    });

    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * Admin: Duyuru sil
 * POST /admin/announcements/delete
 */
router.post('/delete', createCustomValidationMiddleware({
  announcementId: { 
    required: true, 
    pattern: /^\d+$/, 
    message: 'Geçerli bir duyuru ID giriniz' 
  }
}), async (req, res) => {
  try {
    const { announcementId } = req.body;
    const adminId = req.user.sub;

    const result = await announcementService.deleteAnnouncement(Number(announcementId), adminId);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * Admin: Duyuru listesi
 * POST /admin/announcements/list
 */
router.post('/list', createCustomValidationMiddleware({
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
  },
  onlyActive: { 
    required: false, 
    message: 'Sadece aktif duyurular true/false olmalı' 
  }
}), async (req, res) => {
  try {
    const { page = 1, limit = 20, onlyActive = false } = req.body;

    const result = await announcementService.getAdminAnnouncementList({
      page: Number(page),
      limit: Number(limit),
      onlyActive: Boolean(onlyActive)
    });

    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * Admin: Duyuru detayı
 * POST /admin/announcements/detail
 */
router.post('/detail', createCustomValidationMiddleware({
  announcementId: { 
    required: true, 
    pattern: /^\d+$/, 
    message: 'Geçerli bir duyuru ID giriniz' 
  }
}), async (req, res) => {
  try {
    const { announcementId } = req.body;

    const result = await announcementService.getAnnouncementDetail(Number(announcementId));
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * Admin: Duyuru istatistikleri
 * POST /admin/announcements/stats
 */
router.post('/stats', async (req, res) => {
  try {
    const db = require('../database/connection');
    
    // Toplam duyuru sayısı
    const totalAnnouncements = await db('announcements').count({ count: '*' }).first();
    
    // Aktif duyuru sayısı
    const activeAnnouncements = await db('announcements').where('is_active', true).count({ count: '*' }).first();
    
    // Toplam okuma sayısı
    const totalReads = await db('announcement_reads').count({ count: '*' }).first();
    
    // En çok okunan duyurular (top 5)
    const mostReadAnnouncements = await db('announcements as a')
      .leftJoin('announcement_reads as ar', 'ar.announcement_id', 'a.id')
      .leftJoin('users as u', 'u.id', 'a.created_by')
      .select(
        'a.id',
        'a.title',
        'a.created_at',
        'u.username as created_by_username',
        db.raw('COUNT(ar.id) as read_count')
      )
      .groupBy('a.id', 'a.title', 'a.created_at', 'u.username')
      .orderBy('read_count', 'desc')
      .limit(5);

    res.json({
      stats: {
        total_announcements: Number(totalAnnouncements.count || 0),
        active_announcements: Number(activeAnnouncements.count || 0),
        total_reads: Number(totalReads.count || 0),
        most_read_announcements: mostReadAnnouncements
      }
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

module.exports = router;
