exports.up = function(knex) {
  return knex.schema.createTable('admin_categories', function(table) {
    table.increments('id').primary();
    table.string('name', 100).unique().notNullable();
    table.text('description');
    table.timestamp('created_at').defaultTo(knex.fn.now());
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('admin_categories');
};
