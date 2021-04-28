'use strict';

const me = async (ctx) => {
  const { id }  = await strapi.plugins[
    'users-permissions'
  ].services.jwt.getToken(ctx);
  const user = await strapi.query('user', 'users-permissions').findOne({ id });
  delete user.created_at;
  delete user.updated_at;
  delete user.updated_by;
  delete user.created_by;
  const ruts = await strapi.query("rut").find({user: user.id});
  return { ...user,ruts};
};

module.exports = {
  me
};
