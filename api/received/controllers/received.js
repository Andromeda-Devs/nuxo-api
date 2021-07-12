'use strict';
// const { refreshInformationEmits } = require("../../../workers");
const { sanitizeEntity } = require('strapi-utils');

const refresh = async (ctx) => {
    const { user: { id: user } } = ctx.state;
    const rut = await strapi.services.rut.byEnterprise(ctx);
    if(!rut) return null;


    const activeProcess = await strapi.query('process').findOne({
        user,
        status_in: ['ON_HOLD', 'PROCESSING'],
        entity_relation: 'received',
        rut: rut.rut
    });

    if (activeProcess) {
        return sanitizeEntity(activeProcess, {
            model: strapi.models.process
        });
    }

    const { user: _user, ...newProcess } = await strapi.query('process').create({
        user,
        entity_relation: 'received',
        rut: rut.rut
    })

    return sanitizeEntity(newProcess, {
        model: strapi.models.process
    });
}


const find = async (ctx) => {
    const { 
        state: { user: { id: user } },
        query
    } = ctx;
    let entities;
    if (query._q) {
        entities = await strapi.services.received.search({ 
            ...query, 
            'enterprise.rut.user': user
        }, ['enterprise', 'enterprise.rut', 'enterprise.rut.user', 'file']);
    } else {
        entities = await strapi.services.received.find({ 
            ...query, 
            'enterprise.rut.user': user
        }, ['enterprise', 'enterprise.rut', 'enterprise.rut.user', 'file']);
    }

    return entities.map(entity => {
        const res = sanitizeEntity(entity, { model: strapi.models.emit });
        delete res.enterprise;
        return res;
    });
}

module.exports = {
    refresh, 
    find
};