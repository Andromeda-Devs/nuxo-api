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
    var dateObj = new Date();
    var month = dateObj.getUTCMonth() + 1; //months from 1-12
    var day = dateObj.getUTCDate();
    var year = dateObj.getUTCFullYear();
    const newdate = year + "/" + month + "/" + day;
    await knex('users-permissions_user').del();
    const admin = await knex('strapi_administrator').first('id');
    await knex('users-permissions_user').insert(users);
    await knex('users-permissions_user').update({
      created_by: admin.id,
      updated_by:admin.id
    });
    const unaEmpresa = await knex('users-permissions_user').where({username : "unaEmpresa"}).first();
    const multiEmpresas = await knex('users-permissions_user').where({username : "multiEmpresas"}).first();

    await knex('ruts').del();
    await knex('ruts').insert([
      {
        rut: '16593992-1',
        password:'Felipe23',
        user: unaEmpresa.id,
        certificatePassword:"MerSpa2021@",
        published_at:newdate,
        favorite:true,

      }, 
      {
        rut: '13416199-K',
        password:'msepulveda',
        user: multiEmpresas.id,
        certificatePassword:"123456",
        published_at:newdate,
        favorite:true,
      }
    ]);
}

exports.seed = crateUsers;