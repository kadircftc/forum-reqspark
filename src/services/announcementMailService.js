/**
 * Duyuru Mail Servisi
 * Duyuru oluşturulunca tüm kullanıcılara mail gönderme
 */

const mailQueueService = require('./mailQueueService');

/**
 * Duyuru maili gönder
 * @param {Object} params - Duyuru mail parametreleri
 * @param {string} params.title - Duyuru başlığı
 * @param {string} params.content - Duyuru içeriği
 * @param {string} params.createdByUsername - Duyuruyu oluşturan admin username
 * @param {number} params.announcementId - Duyuru ID
 * @returns {Object} Mail gönderim sonucu
 */
async function sendAnnouncementMail({ title, content, createdByUsername, announcementId }) {
  try {
    const subject = `📢 Yeni Duyuru: ${title}`;
    
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Yeni Duyuru</title>
        <style>
          body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f4f4f4;
          }
          .container {
            background-color: #ffffff;
            border-radius: 10px;
            padding: 30px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
          }
          .header {
            text-align: center;
            margin-bottom: 30px;
            padding-bottom: 20px;
            border-bottom: 3px solid #007bff;
          }
          .logo {
            font-size: 28px;
            font-weight: bold;
            color: #007bff;
            margin-bottom: 10px;
          }
          .announcement-title {
            font-size: 24px;
            font-weight: bold;
            color: #2c3e50;
            margin-bottom: 20px;
            padding: 15px;
            background-color: #e8f4fd;
            border-left: 4px solid #007bff;
            border-radius: 5px;
          }
          .announcement-content {
            font-size: 16px;
            line-height: 1.8;
            margin-bottom: 30px;
            padding: 20px;
            background-color: #f8f9fa;
            border-radius: 8px;
            border: 1px solid #e9ecef;
          }
          .footer {
            text-align: center;
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #e9ecef;
            color: #6c757d;
            font-size: 14px;
          }
          .btn {
            display: inline-block;
            padding: 12px 24px;
            background-color: #007bff;
            color: white;
            text-decoration: none;
            border-radius: 5px;
            font-weight: bold;
            margin: 20px 0;
          }
          .btn:hover {
            background-color: #0056b3;
          }
          .admin-info {
            font-size: 14px;
            color: #6c757d;
            margin-top: 20px;
            padding: 10px;
            background-color: #f8f9fa;
            border-radius: 5px;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo">🚀 ReqSpark Forum</div>
            <p>Merhaba {username},</p>
          </div>
          
          <div class="announcement-title">
            📢 ${title}
          </div>
          
          <div class="announcement-content">
            ${content.replace(/\n/g, '<br>')}
          </div>
          
          <div style="text-align: center;">
            <a href="https://forum.reqspark.com" class="btn">Foruma Git</a>
          </div>
          
          
          <div class="footer">
            <p>ReqSpark Forum Ekibi</p>
            <p><small>Bu maili almak istemiyorsanız forum ayarlarınızdan bildirim tercihlerinizi değiştirebilirsiniz.</small></p>
          </div>
        </div>
      </body>
      </html>
    `;

    const textContent = `
Merhaba {username},

🚀 ReqSpark Forum - Yeni Duyuru

📢 ${title}

${content}


Foruma gitmek için: https://forum.reqspark.com


ReqSpark Forum Ekibi
    `;

    // Toplu mail kuyruğa ekle
    const result = await mailQueueService.addBulkMailToQueue({
      subject,
      htmlContent,
      textContent,
      mailType: 'announcement',
      metadata: {
        announcement_id: announcementId,
        announcement_title: title,
        created_by_username: createdByUsername
      }
    });

    return {
      success: true,
      ...result,
      message: 'Duyuru maili tüm kullanıcılara kuyruğa eklendi'
    };
  } catch (error) {
    throw new Error(`Duyuru maili gönderme hatası: ${error.message}`);
  }
}

module.exports = {
  sendAnnouncementMail
};
