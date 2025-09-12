exports.up = function(knex) {
  return knex.schema.createTable('user_blocks', function(table) {
    table.increments('id').primary();
    table.string('blocked_email', 120);
    table.string('blocked_ip', 45); // INET için VARCHAR(45)
    table.text('reason');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('blocked_until');
    
    // Index'ler
    table.index('blocked_email');
    table.index('blocked_ip');
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('user_blocks');
};
