exports.up = function(knex) {
  return knex.schema.table('user_blocks', function(table) {
    table.integer('created_by').unsigned().references('id').inTable('users');
    table.index('created_by');
  });
};

exports.down = function(knex) {
  return knex.schema.table('user_blocks', function(table) {
    table.dropIndex('created_by');
    table.dropColumn('created_by');
  });
};
