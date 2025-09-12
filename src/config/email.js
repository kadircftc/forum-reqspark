const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: Number(process.env.EMAIL_PORT || 587),
  secure: true, // true for 465, false for other ports
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  },
  tls: {
    rejectUnauthorized: false
  },
  connectionTimeout: 60000, // 60 seconds
  greetingTimeout: 30000, // 30 seconds
  socketTimeout: 60000 // 60 seconds
});

// E-posta bağlantısını test et
transporter.verify((error, success) => {
  if (error) {
    console.log('❌ E-posta konfigürasyon hatası:', error.message);
  } else {
    console.log('✅ E-posta servisi hazır');
  }
});

async function sendMail({ to, subject, html, text }) {
  const from = process.env.EMAIL_FROM || 'forum@reqspark.com';
  return transporter.sendMail({ from, to, subject, html, text });
}

module.exports = { transporter, sendMail };
