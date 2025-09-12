exports.up = function(knex) {
  return knex.schema.createTable('users', function(table) {
    table.increments('id').primary();
    table.string('username', 50).unique().notNullable();
    table.string('email', 120).unique().notNullable();
    table.text('password_hash').notNullable();
    table.string('role', 20).defaultTo('user'); // 'user' | 'admin'
    table.boolean('is_verified').defaultTo(false);
    table.integer('failed_login_attempts').defaultTo(0);
    table.text('refresh_token'); // login olduğunda güncellenecek
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('last_login');
    table.string('last_ip', 45); // INET için VARCHAR(45) kullanıyoruz
    table.boolean('blocked').defaultTo(false);
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('users');
};
