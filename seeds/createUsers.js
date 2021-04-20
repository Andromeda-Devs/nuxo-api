const bcrypt = require('bcryptjs');

const users = [
  { 
    username : "unaEmpresa",
    email:"email-test@gmail.com", 
    provider:'local', 
    password:bcrypt.hashSync("123456", 10),
    confirmed:false,
    blocked:false,
    role: 1, 
  },
  { 
    username:"multiEmpresas",
    email:"email-test2@gmail.com", 
    provider:'local', 
    password:bcrypt.hashSync("123456", 10),
    confirmed:false,
    blocked:false,
    role: 1, 
  },
];

const crateUsers =  async (knex) =>{
    await knex('users-permissions_user').del();
    const admin = await knex('strapi_administrator').first('id');
    await knex('users-permissions_user').insert(users);
    await knex('users-permissions_user').update({
      created_by: admin.id,
      updated_by:admin.id
    });
    const unaEmpresa = await knex('users-permissions_user').where({username : "unaEmpresa"}).first();
    await knex('ruts').del();
    await knex('ruts').insert([
      {
        rut: '16.593.992-1',
        password:'Felipe23',
        user: unaEmpresa.id,
      }
    ]);
}

exports.seed = crateUsers;