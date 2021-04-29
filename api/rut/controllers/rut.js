'use strict';
/**
 * Read the documentation (https://strapi.io/documentation/developer-docs/latest/development/backend-customization.html#core-controllers)
 * to customize this controller
 */

const createRut = async (ctx) =>{ 
    const {id } = ctx.state.user;
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

module.exports = {
    createRut
};
