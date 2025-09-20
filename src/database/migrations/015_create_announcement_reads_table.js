exports.up = function(knex) {
  return knex.schema.createTable('announcement_reads', function(table) {
    table.increments('id').primary();
    table.integer('announcement_id').unsigned().notNullable().references('id').inTable('announcements').onDelete('CASCADE');
    table.integer('user_id').unsigned().notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.timestamp('read_at').defaultTo(knex.fn.now());
    
    // Bir kullanıcı aynı duyuruyu sadece bir kez okuyabilir
    table.unique(['announcement_id', 'user_id']);
    
    // Index'ler
    table.index('announcement_id');
    table.index('user_id');
    table.index('read_at');
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('announcement_reads');
};
