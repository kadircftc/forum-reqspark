const express = require('express');
const router = express.Router();
const mailQueueService = require('../services/mailQueueService');
const { authMiddleware } = require('../middleware/authMiddleware');
const { roleMiddleware } = require('../middleware/roleMiddleware');
const { createCustomValidationMiddleware } = require('../middleware/validationMiddleware');

// Tüm admin mail kuyruğu route'ları admin yetkisi gerektirir
router.use(authMiddleware);
router.use(roleMiddleware('admin'));

/**
 * Admin: Mail kuyruğunu işle
 * POST /admin/mail-queue/process
 */
router.post('/process', createCustomValidationMiddleware({
  limit: { 
    required: false, 
    min: 1, 
    max: 100, 
    pattern: /^\d+$/, 
    message: 'Limit 1-100 arası olmalı' 
  }
}), async (req, res) => {
  try {
    const { limit = 10 } = req.body;

    const result = await mailQueueService.processMailQueue(Number(limit));
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * Admin: Mail kuyruğu istatistikleri
 * POST /admin/mail-queue/stats
 */
router.post('/stats', async (req, res) => {
  try {
    const stats = await mailQueueService.getMailQueueStats();
    res.json({ stats });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * Admin: Başarısız mailleri temizle
 * POST /admin/mail-queue/cleanup
 */
router.post('/cleanup', createCustomValidationMiddleware({
  daysOld: { 
    required: false, 
    min: 1, 
    max: 30, 
    pattern: /^\d+$/, 
    message: 'Gün sayısı 1-30 arası olmalı' 
  }
}), async (req, res) => {
  try {
    const { daysOld = 7 } = req.body;

    const result = await mailQueueService.cleanupFailedMails(Number(daysOld));
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * Admin: Mail kuyruğu listesi
 * POST /admin/mail-queue/list
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
  status: { 
    required: false, 
    pattern: /^(pending|sent|failed)$/, 
    message: 'Durum sadece pending, sent veya failed olabilir' 
  },
  mailType: { 
    required: false, 
    pattern: /^(announcement|welcome|verification)$/, 
    message: 'Mail türü geçersiz' 
  }
}), async (req, res) => {
  try {
    const { page = 1, limit = 20, status, mailType } = req.body;
    const offset = (page - 1) * limit;
    const db = require('../database/connection');

    let query = db('mail_queue')
      .select(
        'id',
        'to_email',
        'subject',
        'mail_type',
        'status',
        'retry_count',
        'error_message',
        'scheduled_at',
        'sent_at',
        'created_at',
        'metadata'
      );

    // Filtreler
    if (status) {
      query = query.where('status', status);
    }
    if (mailType) {
      query = query.where('mail_type', mailType);
    }

    // Toplam sayı
    const countQuery = query.clone().clearSelect().clearOrder().count({ count: '*' }).first();
    const total = Number((await countQuery).count || 0);

    // Veriler
    const mails = await query
      .orderBy('created_at', 'desc')
      .limit(limit)
      .offset(offset);

    res.json({
      mails,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

module.exports = router;
