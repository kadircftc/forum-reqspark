require('dotenv').config();
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const db = require('./database/connection');
const { payloadCryptoMiddleware } = require('./middleware/payloadCrypto');
const authRoutes = require('./routes/authRoutes');
const categoryRoutes = require('./routes/categoryRoutes');
const threadRoutes = require('./routes/threadRoutes');
const messageRoutes = require('./routes/messageRoutes');
const reportRoutes = require('./routes/reportRoutes');
const adminCategoryRoutes = require('./routes/adminCategoryRoutes');
const adminThreadRoutes = require('./routes/adminThreadRoutes');
const userRoutes = require('./routes/userRoutes');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(payloadCryptoMiddleware);

// Rate limiting
const limiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 15 dakika
  max: 100, // Her IP için 15 dakikada maksimum 100 istek
  message: 'Çok fazla istek gönderildi, lütfen daha sonra tekrar deneyin.'
});
app.use(limiter);

// Routes
app.use('/auth', authRoutes);
app.use('/categories', categoryRoutes);
app.use('/threads', threadRoutes);
app.use('/messages', messageRoutes);
app.use('/reports', reportRoutes);
app.use('/admin/categories', adminCategoryRoutes);
app.use('/admin/threads', adminThreadRoutes);
app.use('/user', userRoutes);
app.get('/', (req, res) => {
  res.json({
    message: 'Forum ReqSpark API',
    version: '1.0.0',
    status: 'running'
  });
});

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    await db.raw('SELECT 1');
    res.json({
      status: 'healthy',
      database: 'connected',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      status: 'unhealthy',
      database: 'disconnected',
      error: error.message
    });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({
    error: 'Sunucu hatası',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Bir hata oluştu'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Endpoint bulunamadı',
    message: `${req.method} ${req.originalUrl} endpoint'i mevcut değil`
  });
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  db.destroy(() => {
    console.log('Database connection closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  db.destroy(() => {
    console.log('Database connection closed');
    process.exit(0);
  });
});

// Socket.io bağlantı yönetimi - Global mesajlaşma
io.on('connection', (socket) => {
  console.log('Yeni kullanıcı bağlandı:', socket.id);

  // Token'dan kullanıcı ID'sini al ve socket'e ayarla
  const token = socket.handshake.auth?.token;
  console.log(`Socket ${socket.id} bağlandı, token:`, token ? 'var' : 'yok');
  
  if (token) {
    try {
      const { verifyAccessToken } = require('./services/tokenService');
      const payload = verifyAccessToken(token);
      socket.userId = payload.sub;
      console.log(`✅ Kullanıcı ${socket.id} token'dan ID alındı: ${socket.userId}`);
    } catch (error) {
      console.log(`❌ Token geçersiz: ${socket.id}`, error.message);
      socket.disconnect();
    }
  } else {
    console.log(`❌ Token bulunamadı: ${socket.id}`);
    socket.disconnect();
  }

  // Bağlantı kesildiğinde
  socket.on('disconnect', () => {
    console.log('Kullanıcı bağlantısı kesildi:', socket.id);
  });
});

// Socket.io instance'ını global olarak erişilebilir yap
app.set('io', io);

server.listen(PORT, () => {
  console.log(`🚀 Server ${PORT} portunda çalışıyor`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`🔌 Socket.io aktif - Global mesajlaşma`);
});

module.exports = { app, server, io };
