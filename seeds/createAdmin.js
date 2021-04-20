const bcrypt = require('bcryptjs');

exports.seed = function (knex) {
  // Deletes ALL existing entries
  return knex('strapi_administrator').del()
    .then(function () {
      // Inserts seed entries
      return knex('strapi_administrator').insert([
        { firstname:"admin",
          lastname:"admin", 
          username:"admin",
          email:"admin@gmail.com", 
          password:bcrypt.hashSync("123456", 10),
          isActive: true
        }
      ]).then(()=>{
        return knex('strapi_users_roles').del().then( ()=> {
           return knex('strapi_administrator').first('id')
           .then((admin)=>{
            return knex('strapi_users_roles').insert([
              { 
                role_id:1,
                user_id: admin.id,
              }
            ])

           });
        })
      });
    });
};
