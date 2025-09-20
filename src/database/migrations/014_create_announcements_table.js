exports.up = function(knex) {
  return knex.schema.createTable('announcements', function(table) {
    table.increments('id').primary();
    table.string('title', 200).notNullable(); // Duyuru başlığı
    table.text('content').notNullable(); // Duyuru içeriği
    table.integer('created_by').unsigned().notNullable().references('id').inTable('users'); // Duyuruyu ekleyen admin
    table.boolean('is_active').defaultTo(true); // Duyuru aktif mi
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    
    // Index'ler
    table.index('created_by');
    table.index('is_active');
    table.index('created_at');
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('announcements');
};
