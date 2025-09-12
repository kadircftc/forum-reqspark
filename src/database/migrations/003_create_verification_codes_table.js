exports.up = function(knex) {
  return knex.schema.createTable('verification_codes', function(table) {
    table.increments('id').primary();
    table.integer('user_id').unsigned().references('id').inTable('users').onDelete('CASCADE');
    table.string('code', 6).notNullable();
    table.integer('attempts_left').defaultTo(3);
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('expires_at').notNullable();
    
    // Index'ler
    table.index('user_id');
    table.index('code');
    table.index('expires_at');
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('verification_codes');
};
