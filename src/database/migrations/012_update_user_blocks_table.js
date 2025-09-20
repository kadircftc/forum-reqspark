exports.up = function(knex) {
  return knex.schema.table('user_blocks', function(table) {
    table.string('blocked_username', 120).after('blocked_email');
    table.index('blocked_username');
  });
};

exports.down = function(knex) {
  return knex.schema.table('user_blocks', function(table) {
    table.dropIndex('blocked_username');
    table.dropColumn('blocked_username');
  });
};
