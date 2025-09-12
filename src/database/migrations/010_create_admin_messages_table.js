exports.up = function(knex) {
  return knex.schema.createTable('admin_messages', function(table) {
    table.increments('id').primary();
    table.integer('admin_thread_id').unsigned().references('id').inTable('admin_threads').onDelete('CASCADE');
    table.integer('user_id').unsigned().references('id').inTable('users').onDelete('SET NULL');
    table.text('content').notNullable();
    table.string('ip_address', 45); // INET için VARCHAR(45)
    table.timestamp('created_at').defaultTo(knex.fn.now());
    
    // Index'ler
    table.index('admin_thread_id');
    table.index('user_id');
    table.index('created_at');
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('admin_messages');
};
