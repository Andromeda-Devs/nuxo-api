const bcrypt = require('bcryptjs');

exports.seed =  async (knex) => {
  // Inserts seed entries
  return knex('users-permissions_permission').update({
    enabled: true,
  })
};
