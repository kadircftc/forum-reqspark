/**
 * Hoş Geldin Mail Servisi
 * Kullanıcı verify olunca hoş geldin maili gönderme
 */

const mailQueueService = require('./mailQueueService');

/**
 * Hoş geldin maili gönder
 * @param {Object} params - Hoş geldin mail parametreleri
 * @param {string} params.email - Kullanıcı email
 * @param {string} params.username - Kullanıcı username
 * @returns {Object} Mail gönderim sonucu
 */
async function sendWelcomeMail({ email, username }) {
  try {
    const subject = '🎉 ReqSpark Forum\'a Hoş Geldin!';
    
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Hoş Geldin</title>
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
            border-bottom: 3px solid #28a745;
          }
          .logo {
            font-size: 32px;
            font-weight: bold;
            color: #28a745;
            margin-bottom: 10px;
          }
          .welcome-title {
            font-size: 28px;
            font-weight: bold;
            color: #2c3e50;
            margin-bottom: 20px;
            text-align: center;
          }
          .welcome-content {
            font-size: 16px;
            line-height: 1.8;
            margin-bottom: 30px;
            padding: 20px;
            background-color: #f8f9fa;
            border-radius: 8px;
            border: 1px solid #e9ecef;
          }
          .highlight {
            background-color: #fff3cd;
            padding: 15px;
            border-radius: 8px;
            border-left: 4px solid #ffc107;
            margin: 20px 0;
            font-weight: bold;
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
            padding: 15px 30px;
            background-color: #28a745;
            color: white;
            text-decoration: none;
            border-radius: 8px;
            font-weight: bold;
            margin: 20px 0;
            font-size: 16px;
          }
          .btn:hover {
            background-color: #218838;
          }
          .features {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 15px;
            margin: 20px 0;
          }
          .feature {
            padding: 15px;
            background-color: #e8f5e8;
            border-radius: 8px;
            text-align: center;
          }
          .feature-icon {
            font-size: 24px;
            margin-bottom: 10px;
          }
          @media (max-width: 600px) {
            .features {
              grid-template-columns: 1fr;
            }
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo">🚀 ReqSpark Forum</div>
          </div>
          
          <div class="welcome-title">
            🎉 Hoş Geldin ${username}!
          </div>
          
          <div class="welcome-content">
            <p>Merhaba <strong>${username}</strong>,</p>
            
            <p>ReqSpark Forumumuza hoş geldin! Seni aramızda görmekten mutluluk duyuyoruz. 🎊</p>
            
            <div class="highlight">
              💬 Öğrencilerin aralarındaki iletişimi ve etkileşimi sağlamak amacıyla buradayız. 
              Hadi bir thread başlat ve konuşmaya dahil ol!
            </div>
            
            <p>Forumumuzda şunları yapabilirsin:</p>
            
            <div class="features">
              <div class="feature">
                <div class="feature-icon">💭</div>
                <strong>Thread Oluştur</strong><br>
                <small>İlgi alanların hakkında konuş</small>
              </div>
              <div class="feature">
                <div class="feature-icon">💬</div>
                <strong>Mesaj Gönder</strong><br>
                <small>Diğer öğrencilerle etkileşim kur</small>
              </div>
              <div class="feature">
                <div class="feature-icon">📚</div>
                <strong>Kategoriler</strong><br>
                <small>Farklı konularda tartış</small>
              </div>
              <div class="feature">
                <div class="feature-icon">🔔</div>
                <strong>Duyurular</strong><br>
                <small>Önemli haberleri takip et</small>
              </div>
            </div>
            
            <p>Hemen başlamak için aşağıdaki butona tıkla ve ilk thread'ini oluştur!</p>
          </div>
          
          <div style="text-align: center;">
            <a href="https://forum.reqspark.com" class="btn">🚀 Foruma Git ve Başla!</a>
          </div>
          
          <div class="footer">
            <p><strong>ReqSpark Forum Ekibi</strong></p>
            <p>Öğrenci topluluğumuzun bir parçası olduğun için teşekkürler! 🙏</p>
            <p><small>Bu maili almak istemiyorsanız forum ayarlarınızdan bildirim tercihlerinizi değiştirebilirsiniz.</small></p>
          </div>
        </div>
      </body>
      </html>
    `;

    const textContent = `
Merhaba ${username},

🎉 ReqSpark Forum'a Hoş Geldin!

ReqSpark Forumumuza hoş geldin! Seni aramızda görmekten mutluluk duyuyoruz.

💬 Öğrencilerin aralarındaki iletişimi ve etkileşimi sağlamak amacıyla buradayız. 
Hadi bir thread başlat ve konuşmaya dahil ol!

Forumumuzda şunları yapabilirsin:

💭 Thread Oluştur - İlgi alanların hakkında konuş
💬 Mesaj Gönder - Diğer öğrencilerle etkileşim kur  
📚 Kategoriler - Farklı konularda tartış
🔔 Duyurular - Önemli haberleri takip et

Hemen başlamak için: https://forum.reqspark.com

ReqSpark Forum Ekibi
Öğrenci topluluğumuzun bir parçası olduğun için teşekkürler! 🙏
    `;

    // Mail kuyruğa ekle
    const result = await mailQueueService.addToMailQueue({
      toEmail: email,
      subject,
      htmlContent,
      textContent,
      mailType: 'welcome',
      metadata: {
        username: username,
        welcome_date: new Date().toISOString()
      }
    });

    return {
      success: true,
      ...result,
      message: 'Hoş geldin maili kuyruğa eklendi'
    };
  } catch (error) {
    throw new Error(`Hoş geldin maili gönderme hatası: ${error.message}`);
  }
}

module.exports = {
  sendWelcomeMail
};
