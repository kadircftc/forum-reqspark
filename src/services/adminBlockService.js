/**
 * Admin Block Servisleri
 * Admin kullanıcıları block/unblock etmek için servisler
 */

const db = require('../database/connection');

/**
 * Kullanıcıyı block et
 * @param {Object} params - Block parametreleri
 * @param {number} params.userId - Block edilecek kullanıcı ID
 * @param {string} params.reason - Block sebebi
 * @param {Date} params.blockedUntil - Block bitiş tarihi (null = kalıcı)
 * @param {number} params.adminId - Block eden admin ID
 * @returns {Object} Block sonucu
 */
async function blockUser({ userId, reason, blockedUntil, adminId }) {
  try {
    // Kullanıcıyı bul
    const user = await db('users').where({ id: userId }).first();
    if (!user) {
      throw new Error('Kullanıcı bulunamadı');
    }

    // Admin kendini block edemez
    if (userId === adminId) {
      throw new Error('Kendinizi block edemezsiniz');
    }

    // Admin başka admini block edemez
    if (user.role === 'admin') {
      throw new Error('Admin kullanıcıları block edilemez');
    }

    // Kullanıcı zaten block edilmiş mi kontrol et
    const existingBlock = await db('user_blocks')
      .where(function() {
        this.where('blocked_email', user.email)
          .orWhere('blocked_username', user.username);
      })
      .andWhere(function() {
        this.whereNull('blocked_until').orWhere('blocked_until', '>', db.fn.now());
      })
      .first();

    if (existingBlock) {
      throw new Error('Kullanıcı zaten block edilmiş');
    }

    // Block kaydı oluştur
    const [blockRecord] = await db('user_blocks')
      .insert({
        blocked_email: user.email,
        blocked_username: user.username,
        reason: reason || 'Admin tarafından block edildi',
        blocked_until: blockedUntil,
        created_by: adminId
      })
      .returning(['id', 'blocked_email', 'blocked_username', 'reason', 'blocked_until', 'created_at']);

    // Users tablosunda da block flag'i güncelle
    await db('users').where({ id: userId }).update({ blocked: true });

    return {
      success: true,
      block: blockRecord,
      message: 'Kullanıcı başarıyla block edildi'
    };
  } catch (error) {
    throw new Error(`Block işlemi başarısız: ${error.message}`);
  }
}

/**
 * Kullanıcının block'unu kaldır
 * @param {number} userId - Unblock edilecek kullanıcı ID
 * @param {number} adminId - Unblock eden admin ID
 * @returns {Object} Unblock sonucu
 */
async function unblockUser(userId, adminId) {
  try {
    // Kullanıcıyı bul
    const user = await db('users').where({ id: userId }).first();
    if (!user) {
      throw new Error('Kullanıcı bulunamadı');
    }

    // Aktif block kayıtlarını bul ve sil
    const deletedBlocks = await db('user_blocks')
      .where(function() {
        this.where('blocked_email', user.email)
          .orWhere('blocked_username', user.username);
      })
      .andWhere(function() {
        this.whereNull('blocked_until').orWhere('blocked_until', '>', db.fn.now());
      })
      .del();

    // Users tablosunda block flag'i false yap
    await db('users').where({ id: userId }).update({ blocked: false });

    return {
      success: true,
      deletedBlocks,
      message: 'Kullanıcının block\'u kaldırıldı'
    };
  } catch (error) {
    throw new Error(`Unblock işlemi başarısız: ${error.message}`);
  }
}

/**
 * IP adresini block et
 * @param {Object} params - IP block parametreleri
 * @param {string} params.ipAddress - Block edilecek IP
 * @param {string} params.reason - Block sebebi
 * @param {Date} params.blockedUntil - Block bitiş tarihi
 * @param {number} params.adminId - Block eden admin ID
 * @returns {Object} Block sonucu
 */
async function blockIpAddress({ ipAddress, reason, blockedUntil, adminId }) {
  try {
    // IP zaten block edilmiş mi kontrol et
    const existingBlock = await db('user_blocks')
      .where('blocked_ip', ipAddress)
      .andWhere(function() {
        this.whereNull('blocked_until').orWhere('blocked_until', '>', db.fn.now());
      })
      .first();

    if (existingBlock) {
      throw new Error('Bu IP adresi zaten block edilmiş');
    }

    // IP block kaydı oluştur
    const [blockRecord] = await db('user_blocks')
      .insert({
        blocked_ip: ipAddress,
        reason: reason || 'Admin tarafından IP block edildi',
        blocked_until: blockedUntil,
        created_by: adminId
      })
      .returning(['id', 'blocked_ip', 'reason', 'blocked_until', 'created_at']);

    return {
      success: true,
      block: blockRecord,
      message: 'IP adresi başarıyla block edildi'
    };
  } catch (error) {
    throw new Error(`IP block işlemi başarısız: ${error.message}`);
  }
}

/**
 * Block listesini getir
 * @param {Object} params - Filtreleme parametreleri
 * @param {number} params.page - Sayfa numarası
 * @param {number} params.limit - Sayfa başına kayıt sayısı
 * @param {string} params.type - Block türü ('user', 'ip', 'all')
 * @returns {Object} Block listesi
 */
async function getBlockList({ page = 1, limit = 20, type = 'all' }) {
  try {
    const offset = (page - 1) * limit;
    
    let query = db('user_blocks as ub')
      .leftJoin('users as u', function() {
        this.on('u.email', '=', 'ub.blocked_email')
          .orOn('u.username', '=', 'ub.blocked_username');
      })
      .leftJoin('users as admin', 'admin.id', 'ub.created_by')
      .select(
        'ub.id',
        'ub.blocked_email',
        'ub.blocked_username', 
        'ub.blocked_ip',
        'ub.reason',
        'ub.blocked_until',
        'ub.created_at',
        'u.id as user_id',
        'u.username as user_username',
        'admin.username as blocked_by_admin'
      );

    // Tür filtresi
    if (type === 'user') {
      query = query.where(function() {
        this.whereNotNull('ub.blocked_email').orWhereNotNull('ub.blocked_username');
      });
    } else if (type === 'ip') {
      query = query.whereNotNull('ub.blocked_ip');
    }

    // Toplam sayı
    const countQuery = query.clone().clearSelect().clearOrder().count({ count: '*' }).first();
    const total = Number((await countQuery).count || 0);

    // Veriler
    const blocks = await query
      .orderBy('ub.created_at', 'desc')
      .limit(limit)
      .offset(offset);

    return {
      blocks,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    };
  } catch (error) {
    throw new Error(`Block listesi getirilemedi: ${error.message}`);
  }
}

/**
 * Block detayını getir
 * @param {number} blockId - Block ID
 * @returns {Object} Block detayı
 */
async function getBlockDetail(blockId) {
  try {
    const block = await db('user_blocks as ub')
      .leftJoin('users as u', function() {
        this.on('u.email', '=', 'ub.blocked_email')
          .orOn('u.username', '=', 'ub.blocked_username');
      })
      .leftJoin('users as admin', 'admin.id', 'ub.created_by')
      .select(
        'ub.*',
        'u.id as user_id',
        'u.username as user_username',
        'u.email as user_email',
        'admin.username as blocked_by_admin'
      )
      .where('ub.id', blockId)
      .first();

    if (!block) {
      throw new Error('Block kaydı bulunamadı');
    }

    return block;
  } catch (error) {
    throw new Error(`Block detayı getirilemedi: ${error.message}`);
  }
}

/**
 * Block kaydını sil
 * @param {number} blockId - Block ID
 * @param {number} adminId - Silen admin ID
 * @returns {Object} Silme sonucu
 */
async function deleteBlock(blockId, adminId) {
  try {
    const block = await db('user_blocks').where({ id: blockId }).first();
    if (!block) {
      throw new Error('Block kaydı bulunamadı');
    }

    // Block kaydını sil
    await db('user_blocks').where({ id: blockId }).del();

    // Eğer bu bir kullanıcı block'u ise, users tablosundaki flag'i de güncelle
    if (block.blocked_email || block.blocked_username) {
      const user = await db('users')
        .where(function() {
          if (block.blocked_email) this.where('email', block.blocked_email);
          if (block.blocked_username) this.orWhere('username', block.blocked_username);
        })
        .first();

      if (user) {
        // Bu kullanıcının başka aktif block'u var mı kontrol et
        const otherBlocks = await db('user_blocks')
          .where(function() {
            this.where('blocked_email', user.email)
              .orWhere('blocked_username', user.username);
          })
          .andWhere(function() {
            this.whereNull('blocked_until').orWhere('blocked_until', '>', db.fn.now());
          })
          .first();

        // Başka aktif block yoksa users tablosundaki flag'i false yap
        if (!otherBlocks) {
          await db('users').where({ id: user.id }).update({ blocked: false });
        }
      }
    }

    return {
      success: true,
      message: 'Block kaydı başarıyla silindi'
    };
  } catch (error) {
    throw new Error(`Block silme işlemi başarısız: ${error.message}`);
  }
}

module.exports = {
  blockUser,
  unblockUser,
  blockIpAddress,
  getBlockList,
  getBlockDetail,
  deleteBlock
};
