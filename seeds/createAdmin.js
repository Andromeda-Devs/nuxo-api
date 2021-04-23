const bcrypt = require('bcryptjs');

exports.seed = async (knex) =>{
  // Deletes ALL existing entries
  await knex('strapi_administrator').del()
      // Inserts seed entries
  await knex('strapi_administrator').insert([
        { firstname:"admin",
          lastname:"admin", 
          username:"admin",
          email:"admin@gmail.com", 
          password:bcrypt.hashSync("123456", 10),
          isActive: true
        }]);
  await knex('strapi_users_roles').del();
  const admin= await knex('strapi_administrator').first('id');
  return knex('strapi_users_roles').insert([
              { 
                role_id:1,
                user_id: admin.id,
              }
            ]);

};
