/**
 * Mail Kuyruklama Servisi
 * Toplu mail gönderimi için kuyruklama sistemi
 */

const db = require('../database/connection');
const { sendMail } = require('../config/email');

/**
 * Mail kuyruğa ekle
 * @param {Object} params - Mail parametreleri
 * @param {string} params.toEmail - Alıcı email
 * @param {string} params.subject - Mail konusu
 * @param {string} params.htmlContent - HTML içerik
 * @param {string} params.textContent - Text içerik (opsiyonel)
 * @param {string} params.mailType - Mail türü
 * @param {Object} params.metadata - Ek veriler
 * @param {Date} params.scheduledAt - Gönderim zamanı (opsiyonel)
 * @returns {Object} Kuyruk sonucu
 */
async function addToMailQueue({ toEmail, subject, htmlContent, textContent, mailType, metadata, scheduledAt }) {
  try {
    const [mailRecord] = await db('mail_queue')
      .insert({
        to_email: toEmail,
        subject,
        html_content: htmlContent,
        text_content: textContent,
        mail_type: mailType,
        metadata: metadata ? JSON.stringify(metadata) : null,
        scheduled_at: scheduledAt || db.fn.now(),
        status: 'pending'
      })
      .returning(['id', 'to_email', 'subject', 'mail_type', 'status', 'created_at']);

    return {
      success: true,
      mail: mailRecord,
      message: 'Mail kuyruğa eklendi'
    };
  } catch (error) {
    throw new Error(`Mail kuyruğa ekleme hatası: ${error.message}`);
  }
}

/**
 * Bekleyen mailleri işle
 * @param {number} limit - İşlenecek mail sayısı
 * @returns {Object} İşlem sonucu
 */
async function processMailQueue(limit = 10) {
  try {
    // Bekleyen mailleri getir
    const pendingMails = await db('mail_queue')
      .where('status', 'pending')
      .where('scheduled_at', '<=', db.fn.now())
      .orderBy('created_at', 'asc')
      .limit(limit);

    let processedCount = 0;
    let successCount = 0;
    let failedCount = 0;

    for (const mail of pendingMails) {
      try {
        // Mail gönder
        await sendMail({
          to: mail.to_email,
          subject: mail.subject,
          html: mail.html_content,
          text: mail.text_content
        });

        // Başarılı olarak işaretle
        await db('mail_queue')
          .where('id', mail.id)
          .update({
            status: 'sent',
            sent_at: db.fn.now()
          });

        successCount++;
        console.log(`✅ Mail gönderildi: ${mail.to_email} - ${mail.subject}`);
      } catch (error) {
        // Hata durumunda retry count'u artır
        const newRetryCount = mail.retry_count + 1;
        const maxRetries = 3;

        if (newRetryCount >= maxRetries) {
          // Maksimum deneme sayısına ulaştı, failed olarak işaretle
          await db('mail_queue')
            .where('id', mail.id)
            .update({
              status: 'failed',
              retry_count: newRetryCount,
              error_message: error.message
            });
          failedCount++;
          console.log(`❌ Mail başarısız (max retry): ${mail.to_email} - ${error.message}`);
        } else {
          // Tekrar deneme için scheduled_at'i güncelle (5 dakika sonra)
          await db('mail_queue')
            .where('id', mail.id)
            .update({
              retry_count: newRetryCount,
              error_message: error.message,
              scheduled_at: db.raw('NOW() + INTERVAL ? MINUTE', [5 * newRetryCount])
            });
          console.log(`⚠️ Mail tekrar denenecek (${newRetryCount}/${maxRetries}): ${mail.to_email}`);
        }
      }

      processedCount++;
    }

    return {
      success: true,
      processed: processedCount,
      sent: successCount,
      failed: failedCount,
      message: `${processedCount} mail işlendi (${successCount} başarılı, ${failedCount} başarısız)`
    };
  } catch (error) {
    throw new Error(`Mail kuyruğu işleme hatası: ${error.message}`);
  }
}

/**
 * Toplu mail kuyruğa ekle (duyuru için)
 * @param {Object} params - Toplu mail parametreleri
 * @param {string} params.subject - Mail konusu
 * @param {string} params.htmlContent - HTML içerik
 * @param {string} params.textContent - Text içerik
 * @param {string} params.mailType - Mail türü
 * @param {Object} params.metadata - Ek veriler
 * @returns {Object} Toplu mail sonucu
 */
async function addBulkMailToQueue({ subject, htmlContent, textContent, mailType, metadata }) {
  try {
    // Tüm aktif kullanıcıları getir
    const users = await db('users')
      .select('email', 'username')
      .where('is_verified', true)
      .where('blocked', false);

    let queuedCount = 0;
    const errors = [];

    // Her kullanıcı için mail kuyruğa ekle
    for (const user of users) {
      try {
        // Kişiselleştirilmiş içerik oluştur
        const personalizedHtml = htmlContent.replace(/\{username\}/g, user.username);
        const personalizedText = textContent ? textContent.replace(/\{username\}/g, user.username) : null;

        await addToMailQueue({
          toEmail: user.email,
          subject,
          htmlContent: personalizedHtml,
          textContent: personalizedText,
          mailType,
          metadata: {
            ...metadata,
            user_id: user.id,
            username: user.username
          }
        });

        queuedCount++;
      } catch (error) {
        errors.push({
          email: user.email,
          error: error.message
        });
      }
    }

    return {
      success: true,
      queued_count: queuedCount,
      total_users: users.length,
      errors: errors,
      message: `${queuedCount}/${users.length} kullanıcıya mail kuyruğa eklendi`
    };
  } catch (error) {
    throw new Error(`Toplu mail kuyruğa ekleme hatası: ${error.message}`);
  }
}

/**
 * Mail kuyruğu istatistikleri
 * @returns {Object} İstatistikler
 */
async function getMailQueueStats() {
  try {
    const stats = await db('mail_queue')
      .select('status')
      .count({ count: '*' })
      .groupBy('status');

    const totalStats = await db('mail_queue')
      .count({ count: '*' })
      .first();

    const todayStats = await db('mail_queue')
      .where('created_at', '>=', db.raw('CURRENT_DATE'))
      .count({ count: '*' })
      .first();

    return {
      total: Number(totalStats.count || 0),
      today: Number(todayStats.count || 0),
      by_status: stats.reduce((acc, stat) => {
        acc[stat.status] = Number(stat.count || 0);
        return acc;
      }, {})
    };
  } catch (error) {
    throw new Error(`Mail kuyruğu istatistikleri getirilemedi: ${error.message}`);
  }
}

/**
 * Başarısız mailleri temizle
 * @param {number} daysOld - Kaç gün önceki başarısız mailleri temizle
 * @returns {Object} Temizleme sonucu
 */
async function cleanupFailedMails(daysOld = 7) {
  try {
    const deletedCount = await db('mail_queue')
      .where('status', 'failed')
      .where('created_at', '<', db.raw('NOW() - INTERVAL ? DAY', [daysOld]))
      .del();

    return {
      success: true,
      deleted_count: deletedCount,
      message: `${deletedCount} başarısız mail temizlendi`
    };
  } catch (error) {
    throw new Error(`Başarısız mail temizleme hatası: ${error.message}`);
  }
}

module.exports = {
  addToMailQueue,
  processMailQueue,
  addBulkMailToQueue,
  getMailQueueStats,
  cleanupFailedMails
};
