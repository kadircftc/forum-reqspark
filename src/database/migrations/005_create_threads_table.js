exports.up = function(knex) {
  return knex.schema.createTable('threads', function(table) {
    table.increments('id').primary();
    table.integer('category_id').unsigned().references('id').inTable('categories').onDelete('CASCADE');
    table.integer('user_id').unsigned().references('id').inTable('users').onDelete('SET NULL');
    table.string('title', 200).notNullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
    
    // Index'ler
    table.index('category_id');
    table.index('user_id');
    table.index('created_at');
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('threads');
};
