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
        username: ctx.request.body.rut,
        rut: ctx.request.body.rut.split('.').join(''),
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
       payload = { ...payload, favorite:true }
    }
    const enterprises = await strapi.services.scrapper.checkAccount(payload);
    if(enterprises.length === 0) { 
        return ctx.badRequest({ message : "login failed" });
    }
    const createdRut = await strapi.query("rut").create({
        ...payload
    });
    for( const enterprise of enterprises ) {
        await strapi.services.enterprise.create({
            rut: createdRut.id,
            enterpriseRut: enterprise
        });
    }

    const updated = await strapi.query('rut').findOne({ id: createdRut.id });

    return sanitizeEntity(updated, { model: strapi.models.rut });
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
