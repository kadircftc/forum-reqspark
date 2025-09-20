const express = require('express');
const router = express.Router();
const adminBlockService = require('../services/adminBlockService');
const { authMiddleware } = require('../middleware/authMiddleware');
const { roleMiddleware } = require('../middleware/roleMiddleware');
const { createValidationMiddleware, createCustomValidationMiddleware } = require('../middleware/validationMiddleware');

// Tüm admin block route'ları admin yetkisi gerektirir
router.use(authMiddleware);
router.use(roleMiddleware('admin'));

/**
 * Kullanıcıyı block et
 * POST /admin/blocks/block-user
 */
router.post('/block-user', createCustomValidationMiddleware({
  userId: { 
    required: true, 
    pattern: /^\d+$/, 
    message: 'Geçerli bir kullanıcı ID giriniz' 
  },
  reason: { 
    required: false, 
    maxLength: 500, 
    message: 'Sebep en fazla 500 karakter olmalı' 
  },
  blockedUntil: { 
    required: false, 
    message: 'Geçerli bir tarih formatı giriniz' 
  }
}), async (req, res) => {
  try {
    const { userId, reason, blockedUntil } = req.body;
    const adminId = req.user.sub;

    // Tarih formatını kontrol et
    let parsedDate = null;
    if (blockedUntil) {
      parsedDate = new Date(blockedUntil);
      if (isNaN(parsedDate.getTime())) {
        return res.status(400).json({ error: 'Geçersiz tarih formatı' });
      }
    }

    const result = await adminBlockService.blockUser({
      userId: Number(userId),
      reason,
      blockedUntil: parsedDate,
      adminId
    });

    res.status(201).json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * Kullanıcının block'unu kaldır
 * POST /admin/blocks/unblock-user
 */
router.post('/unblock-user', createCustomValidationMiddleware({
  userId: { 
    required: true, 
    pattern: /^\d+$/, 
    message: 'Geçerli bir kullanıcı ID giriniz' 
  }
}), async (req, res) => {
  try {
    const { userId } = req.body;
    const adminId = req.user.sub;

    const result = await adminBlockService.unblockUser(Number(userId), adminId);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * IP adresini block et
 * POST /admin/blocks/block-ip
 */
router.post('/block-ip', createCustomValidationMiddleware({
  ipAddress: { 
    required: true, 
    pattern: /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/, 
    message: 'Geçerli bir IP adresi giriniz' 
  },
  reason: { 
    required: false, 
    maxLength: 500, 
    message: 'Sebep en fazla 500 karakter olmalı' 
  },
  blockedUntil: { 
    required: false, 
    message: 'Geçerli bir tarih formatı giriniz' 
  }
}), async (req, res) => {
  try {
    const { ipAddress, reason, blockedUntil } = req.body;
    const adminId = req.user.sub;

    // Tarih formatını kontrol et
    let parsedDate = null;
    if (blockedUntil) {
      parsedDate = new Date(blockedUntil);
      if (isNaN(parsedDate.getTime())) {
        return res.status(400).json({ error: 'Geçersiz tarih formatı' });
      }
    }

    const result = await adminBlockService.blockIpAddress({
      ipAddress,
      reason,
      blockedUntil: parsedDate,
      adminId
    });

    res.status(201).json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * Block listesini getir
 * POST /admin/blocks/list
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
  type: { 
    required: false, 
    pattern: /^(user|ip|all)$/, 
    message: 'Tür sadece user, ip veya all olabilir' 
  }
}), async (req, res) => {
  try {
    const { page = 1, limit = 20, type = 'all' } = req.body;

    const result = await adminBlockService.getBlockList({
      page: Number(page),
      limit: Number(limit),
      type
    });

    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * Block detayını getir
 * POST /admin/blocks/detail
 */
router.post('/detail', createCustomValidationMiddleware({
  blockId: { 
    required: true, 
    pattern: /^\d+$/, 
    message: 'Geçerli bir block ID giriniz' 
  }
}), async (req, res) => {
  try {
    const { blockId } = req.body;

    const block = await adminBlockService.getBlockDetail(Number(blockId));
    res.json({ block });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * Block kaydını sil
 * POST /admin/blocks/delete
 */
router.post('/delete', createCustomValidationMiddleware({
  blockId: { 
    required: true, 
    pattern: /^\d+$/, 
    message: 'Geçerli bir block ID giriniz' 
  }
}), async (req, res) => {
  try {
    const { blockId } = req.body;
    const adminId = req.user.sub;

    const result = await adminBlockService.deleteBlock(Number(blockId), adminId);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * Kullanıcı arama (block için)
 * POST /admin/blocks/search-user
 */
router.post('/search-user', createCustomValidationMiddleware({
  query: { 
    required: true, 
    minLength: 2, 
    maxLength: 50, 
    message: 'Arama terimi 2-50 karakter arası olmalı' 
  }
}), async (req, res) => {
  try {
    const { query } = req.body;
    const db = require('../database/connection');

    // Username veya email ile arama
    const users = await db('users')
      .select('id', 'username', 'email', 'role', 'blocked', 'created_at', 'last_login')
      .where(function() {
        this.whereILike('username', `%${query}%`)
          .orWhereILike('email', `%${query}%`);
      })
      .limit(10);

    res.json({ users });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

module.exports = router;
