exports.up = function(knex) {
  return knex.schema.createTable('forgot_password_tokens', function(table) {
    table.increments('id').primary();
    table.string('email').notNullable().comment('Kullanıcı email adresi');
    table.string('token').notNullable().unique().comment('Şifre sıfırlama token');
    table.timestamp('expires_at').notNullable().comment('Token son kullanma tarihi');
    table.boolean('used').defaultTo(false).comment('Token kullanıldı mı');
    table.timestamp('used_at').nullable().comment('Token kullanılma tarihi');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    
    // Index'ler
    table.index(['email']);
    table.index(['token']);
    table.index(['expires_at']);
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('forgot_password_tokens');
};
