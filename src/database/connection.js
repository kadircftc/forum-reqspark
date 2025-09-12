const knex = require('knex');
const config = require('../../knexfile');

const environment = process.env.NODE_ENV || 'development';
const db = knex(config[environment]);

// Test database connection
db.raw('SELECT 1')
  .then(() => {
    console.log('✅ Database bağlantısı başarılı');
  })
  .catch((err) => {
    console.error('❌ Database bağlantı hatası:', err.message);
    process.exit(1);
  });

module.exports = db;
