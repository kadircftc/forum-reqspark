exports.up = function(knex) {
	return knex.schema.createTable('message_reports', function(table) {
		table.increments('id').primary();
		table.integer('message_id').unsigned().references('id').inTable('messages').onDelete('CASCADE');
		table.integer('reporter_id').unsigned().references('id').inTable('users').onDelete('SET NULL');
		table.text('reason');
		table.timestamp('created_at').defaultTo(knex.fn.now());
		// Indexes
		table.index('message_id');
		table.index('reporter_id');
	});
};

exports.down = function(knex) {
	return knex.schema.dropTable('message_reports');
};
