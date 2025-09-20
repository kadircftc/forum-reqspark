exports.up = function(knex) {
  return knex.schema.createTable('mail_queue', function(table) {
    table.increments('id').primary();
    table.string('to_email', 254).notNullable(); // Alıcı email
    table.string('subject', 200).notNullable(); // Mail konusu
    table.text('html_content').notNullable(); // HTML içerik
    table.text('text_content'); // Text içerik (opsiyonel)
    table.string('mail_type', 50).notNullable(); // 'announcement', 'welcome', 'verification' vb.
    table.json('metadata'); // Ek veriler (duyuru ID, kullanıcı ID vb.)
    table.string('status', 20).defaultTo('pending'); // 'pending', 'sent', 'failed'
    table.integer('retry_count').defaultTo(0); // Tekrar deneme sayısı
    table.text('error_message'); // Hata mesajı
    table.timestamp('scheduled_at').defaultTo(knex.fn.now()); // Gönderim zamanı
    table.timestamp('sent_at'); // Gönderim tarihi
    table.timestamp('created_at').defaultTo(knex.fn.now());
    
    // Index'ler
    table.index('status');
    table.index('mail_type');
    table.index('scheduled_at');
    table.index('to_email');
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('mail_queue');
};
