'use strict';

const { refreshInformationReceived }  = require("../../../workers");
const { sanitizeEntity } = require('strapi-utils');

const refresh = async (ctx) => {
    const rut = await strapi.query('rut').findOne({ 
        rut : ctx.request.body.rut
    });
    if(!rut) return null;
    refreshInformationReceived.add({
        ...rut,
        clave: rut.password,
        });
    return {message:"process in progress"};
}

const refreshAll = async (ctx) => {
    const ruts = await strapi.query('rut');
    if(!ruts) return null;
    ruts.map(async ( rut)=>{
        refreshInformationReceived.add({
            ...rut,
            clave: rut.password,
            });
    });
    return { message:"process in progress" };
}

const find = async (ctx) => {
    const { 
        state: { user: { id: user } },
        query
    } = ctx;
    let entities;
    if (query._q) {
        entities = await strapi.services.received.search({ ...query, user });
    } else {
        entities = await strapi.services.received.find({ ...query, user });
    }

    return entities.map(entity => sanitizeEntity(entity, { model: strapi.models.received }));
}

module.exports = {
    refresh, 
    refreshAll,
    find
};