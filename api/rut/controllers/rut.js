'use strict';
/**
 * Read the documentation (https://strapi.io/documentation/developer-docs/latest/development/backend-customization.html#core-controllers)
 * to customize this controller
 */

const { sanitizeEntity } = require('strapi-utils');

const createRut = async (ctx) =>{ 
    const { id } = ctx.state.user;
    let payload = {
        ...ctx.request.body, 
        favorite:false,
        user:id,
    }
    if(!ctx.request.body.rut || !ctx.request.body.password) { 
        return ctx.badRequest({ message : "rut and password is required" })
    }
    if(await strapi.query("rut").findOne({rut :payload.rut})){
        return ctx.notAcceptable({message:"rut exist"});
    }
    if(!await strapi.query("rut").findOne({ user: id})){
       payload = {
            ...payload,
            favorite:true
        }
    }
    const createdRut = await strapi.query("rut").create({
        ...payload
    });

    return createdRut;
}

const find = async (ctx) => {
    const { user: {id: user} } = ctx.state;
    const { query } = ctx;
    let ruts;
    if (query._q){
        ruts = await strapi.query('rut').search({
            user,
            ...query
        });
    } else {
        ruts = await strapi.query('rut').find({
            user,
            ...query
        });
    }

    return ruts.map(entity => sanitizeEntity(entity, {model: strapi.models.rut}))
}

module.exports = {
    createRut,
    find
};
