/**
 * Duyuru Servisleri
 * Admin ve kullanıcı duyuru işlemleri için servisler
 */

const db = require('../database/connection');
const announcementMailService = require('./announcementMailService');

/**
 * Admin: Duyuru oluştur
 * @param {Object} params - Duyuru parametreleri
 * @param {string} params.title - Duyuru başlığı
 * @param {string} params.content - Duyuru içeriği
 * @param {number} params.adminId - Duyuruyu ekleyen admin ID
 * @returns {Object} Duyuru sonucu
 */
async function createAnnouncement({ title, content, adminId }) {
  try {
    // Admin bilgilerini al
    const admin = await db('users').where({ id: adminId }).first();
    if (!admin) {
      throw new Error('Admin kullanıcı bulunamadı');
    }

    const [announcement] = await db('announcements')
      .insert({
        title,
        content,
        created_by: adminId,
        is_active: true
      })
      .returning(['id', 'title', 'content', 'created_by', 'is_active', 'created_at', 'updated_at']);

    // Duyuru maili gönder (asenkron olarak)
    try {
      await announcementMailService.sendAnnouncementMail({
        title: announcement.title,
        content: announcement.content,
        createdByUsername: admin.username,
        announcementId: announcement.id
      });
      console.log(`📧 Duyuru maili kuyruğa eklendi: ${announcement.title}`);
    } catch (mailError) {
      console.error('❌ Duyuru maili gönderme hatası:', mailError.message);
      // Mail hatası duyuru oluşturmayı engellemez
    }

    return {
      success: true,
      announcement,
      message: 'Duyuru başarıyla oluşturuldu ve tüm kullanıcılara mail gönderildi'
    };
  } catch (error) {
    throw new Error(`Duyuru oluşturma hatası: ${error.message}`);
  }
}

/**
 * Admin: Duyuru güncelle
 * @param {number} announcementId - Duyuru ID
 * @param {Object} params - Güncellenecek parametreler
 * @param {string} params.title - Duyuru başlığı
 * @param {string} params.content - Duyuru içeriği
 * @param {boolean} params.isActive - Duyuru aktif mi
 * @param {number} params.adminId - Güncelleyen admin ID
 * @returns {Object} Güncelleme sonucu
 */
async function updateAnnouncement(announcementId, { title, content, isActive, adminId }) {
  try {
    // Duyuru var mı kontrol et
    const existingAnnouncement = await db('announcements').where({ id: announcementId }).first();
    if (!existingAnnouncement) {
      throw new Error('Duyuru bulunamadı');
    }

    const updateData = {
      updated_at: db.fn.now()
    };

    if (title !== undefined) updateData.title = title;
    if (content !== undefined) updateData.content = content;
    if (isActive !== undefined) updateData.is_active = isActive;

    const [updatedAnnouncement] = await db('announcements')
      .where({ id: announcementId })
      .update(updateData)
      .returning(['id', 'title', 'content', 'created_by', 'is_active', 'created_at', 'updated_at']);

    return {
      success: true,
      announcement: updatedAnnouncement,
      message: 'Duyuru başarıyla güncellendi'
    };
  } catch (error) {
    throw new Error(`Duyuru güncelleme hatası: ${error.message}`);
  }
}

/**
 * Admin: Duyuru sil
 * @param {number} announcementId - Duyuru ID
 * @param {number} adminId - Silen admin ID
 * @returns {Object} Silme sonucu
 */
async function deleteAnnouncement(announcementId, adminId) {
  try {
    // Duyuru var mı kontrol et
    const existingAnnouncement = await db('announcements').where({ id: announcementId }).first();
    if (!existingAnnouncement) {
      throw new Error('Duyuru bulunamadı');
    }

    // Duyuruyu sil (CASCADE ile announcement_reads da silinir)
    await db('announcements').where({ id: announcementId }).del();

    return {
      success: true,
      message: 'Duyuru başarıyla silindi'
    };
  } catch (error) {
    throw new Error(`Duyuru silme hatası: ${error.message}`);
  }
}

/**
 * Admin: Duyuru listesi (tüm duyurular)
 * @param {Object} params - Filtreleme parametreleri
 * @param {number} params.page - Sayfa numarası
 * @param {number} params.limit - Sayfa başına kayıt sayısı
 * @param {boolean} params.onlyActive - Sadece aktif duyurular
 * @returns {Object} Duyuru listesi
 */
async function getAdminAnnouncementList({ page = 1, limit = 20, onlyActive = false }) {
  try {
    const offset = (page - 1) * limit;
    
    let query = db('announcements as a')
      .leftJoin('users as u', 'u.id', 'a.created_by')
      .select(
        'a.id',
        'a.title',
        'a.content',
        'a.is_active',
        'a.created_at',
        'a.updated_at',
        'a.created_by',
        'u.username as created_by_username',
        'u.email as created_by_email'
      );

    // Sadece aktif duyurular filtresi
    if (onlyActive) {
      query = query.where('a.is_active', true);
    }

    // Toplam sayı
    const countQuery = query.clone().clearSelect().clearOrder().count({ count: '*' }).first();
    const total = Number((await countQuery).count || 0);

    // Veriler
    const announcements = await query
      .orderBy('a.created_at', 'desc')
      .limit(limit)
      .offset(offset);

    return {
      announcements,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    };
  } catch (error) {
    throw new Error(`Admin duyuru listesi getirilemedi: ${error.message}`);
  }
}

/**
 * Kullanıcı: Duyuru listesi (okuma durumu ile)
 * @param {number} userId - Kullanıcı ID
 * @param {Object} params - Filtreleme parametreleri
 * @param {number} params.page - Sayfa numarası
 * @param {number} params.limit - Sayfa başına kayıt sayısı
 * @returns {Object} Duyuru listesi (okuma durumu ile)
 */
async function getUserAnnouncementList(userId, { page = 1, limit = 20 }) {
  try {
    const offset = (page - 1) * limit;
    
    // Aktif duyuruları getir ve okuma durumunu kontrol et
    const query = db('announcements as a')
      .leftJoin('users as u', 'u.id', 'a.created_by')
      .leftJoin('announcement_reads as ar', function() {
        this.on('ar.announcement_id', '=', 'a.id')
          .andOn('ar.user_id', '=', db.raw('?', [userId]));
      })
      .select(
        'a.id',
        'a.title',
        'a.content',
        'a.created_at',
        'a.updated_at',
        'a.created_by',
        'u.username as created_by_username',
        db.raw('CASE WHEN ar.id IS NOT NULL THEN true ELSE false END as is_read'),
        'ar.read_at'
      )
      .where('a.is_active', true);

    // Toplam sayı
    const countQuery = query.clone().clearSelect().clearOrder().count({ count: '*' }).first();
    const total = Number((await countQuery).count || 0);

    // Veriler
    const announcements = await query
      .orderBy('a.created_at', 'desc')
      .limit(limit)
      .offset(offset);

    // Okunmamış duyuru sayısını hesapla
    const unreadCount = await db('announcements as a')
      .leftJoin('announcement_reads as ar', function() {
        this.on('ar.announcement_id', '=', 'a.id')
          .andOn('ar.user_id', '=', db.raw('?', [userId]));
      })
      .where('a.is_active', true)
      .whereNull('ar.id')
      .count({ count: '*' })
      .first();

    return {
      announcements,
      unread_count: Number(unreadCount.count || 0),
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    };
  } catch (error) {
    throw new Error(`Kullanıcı duyuru listesi getirilemedi: ${error.message}`);
  }
}

/**
 * Kullanıcı: Duyuru okundu olarak işaretle
 * @param {number} announcementId - Duyuru ID
 * @param {number} userId - Kullanıcı ID
 * @returns {Object} Okuma sonucu
 */
async function markAnnouncementAsRead(announcementId, userId) {
  try {
    // Duyuru var mı ve aktif mi kontrol et
    const announcement = await db('announcements')
      .where({ id: announcementId, is_active: true })
      .first();
    
    if (!announcement) {
      throw new Error('Duyuru bulunamadı veya aktif değil');
    }

    // Zaten okunmuş mu kontrol et
    const existingRead = await db('announcement_reads')
      .where({ announcement_id: announcementId, user_id: userId })
      .first();

    if (existingRead) {
      return {
        success: true,
        message: 'Duyuru zaten okunmuş',
        read_at: existingRead.read_at
      };
    }

    // Okuma kaydı oluştur
    const [readRecord] = await db('announcement_reads')
      .insert({
        announcement_id: announcementId,
        user_id: userId
      })
      .returning(['id', 'read_at']);

    return {
      success: true,
      message: 'Duyuru okundu olarak işaretlendi',
      read_at: readRecord.read_at
    };
  } catch (error) {
    throw new Error(`Duyuru okuma işlemi hatası: ${error.message}`);
  }
}

/**
 * Duyuru detayını getir
 * @param {number} announcementId - Duyuru ID
 * @param {number} userId - Kullanıcı ID (opsiyonel, okuma durumu için)
 * @returns {Object} Duyuru detayı
 */
async function getAnnouncementDetail(announcementId, userId = null) {
  try {
    let query = db('announcements as a')
      .leftJoin('users as u', 'u.id', 'a.created_by')
      .select(
        'a.id',
        'a.title',
        'a.content',
        'a.is_active',
        'a.created_at',
        'a.updated_at',
        'a.created_by',
        'u.username as created_by_username',
        'u.email as created_by_email'
      )
      .where('a.id', announcementId);

    // Kullanıcı ID varsa okuma durumunu da getir
    if (userId) {
      query = query
        .leftJoin('announcement_reads as ar', function() {
          this.on('ar.announcement_id', '=', 'a.id')
            .andOn('ar.user_id', '=', db.raw('?', [userId]));
        })
        .select(
          db.raw('CASE WHEN ar.id IS NOT NULL THEN true ELSE false END as is_read'),
          'ar.read_at'
        );
    }

    const announcement = await query.first();

    if (!announcement) {
      throw new Error('Duyuru bulunamadı');
    }

    return { announcement };
  } catch (error) {
    throw new Error(`Duyuru detayı getirilemedi: ${error.message}`);
  }
}

/**
 * Kullanıcı: Okunmamış duyuru sayısını getir
 * @param {number} userId - Kullanıcı ID
 * @returns {Object} Okunmamış duyuru sayısı
 */
async function getUnreadAnnouncementCount(userId) {
  try {
    const result = await db('announcements as a')
      .leftJoin('announcement_reads as ar', function() {
        this.on('ar.announcement_id', '=', 'a.id')
          .andOn('ar.user_id', '=', db.raw('?', [userId]));
      })
      .where('a.is_active', true)
      .whereNull('ar.id')
      .count({ count: '*' })
      .first();

    return {
      unread_count: Number(result.count || 0)
    };
  } catch (error) {
    throw new Error(`Okunmamış duyuru sayısı getirilemedi: ${error.message}`);
  }
}

module.exports = {
  createAnnouncement,
  updateAnnouncement,
  deleteAnnouncement,
  getAdminAnnouncementList,
  getUserAnnouncementList,
  markAnnouncementAsRead,
  getAnnouncementDetail,
  getUnreadAnnouncementCount
};
