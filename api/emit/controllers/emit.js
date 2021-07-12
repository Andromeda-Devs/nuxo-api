'use strict';
const { affectInvoice, exemptInvoice, dispatchGuide } = require("../../../utils");
const { sanitizeEntity } = require('strapi-utils');

const find = async (ctx) => {
    const {    
        state: { user: { id: user } },
        query
    } = ctx;
    let entities;
    if (query._q) {
        entities = await strapi.services.emit.search({ 
            ...query, 
            'enterprise.rut.user': user
        }, ['enterprise', 'enterprise.rut', 'enterprise.rut.user', 'file']);
    } else {
        entities = await strapi.services.emit.find({ 
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

const refresh = async (ctx) => {
    const { user: { id: user } } = ctx.state;
    const rut = await strapi.services.rut.byEnterprise(ctx);

    if (!rut) return null;

    if (!rut.certificatePassword) {
        return ctx.badRequest({ message: "certificatePassword is null" });
    }

    const activeProcess = await strapi.query('process').findOne({
        user,
        status_in: ['ON_HOLD', 'PROCESSING'],
        entity_relation: 'emit',
        rut: rut.rut
    });

    if (activeProcess) {
        return sanitizeEntity(activeProcess, {
            model: strapi.models.process
        });
    }


    const {user: _user, ...newProcess} = await strapi.query('process').create({
        user,
        entity_relation: 'emit',
        rut: rut.rut
    })

    return sanitizeEntity(newProcess, {
        model: strapi.models.process
    });
}

const emitAffectInvoice = async (ctx) => {
    const rut = await strapi.services.rut.byEnterprise(ctx);
    if (!rut) return null;

    const result = await strapi.services.scrapper.createAffectInvoice({
        ...rut,
        clave: rut.password
    }, ctx.request.body.document);

    const res = await strapi.query('emit').findOne({ id: result.id });

    return res;
}

const emitCancelInvoice = async (ctx) => {
    const rut = await strapi.services.rut.byEnterprise(ctx);
    if (!rut) return null;

    const result = await strapi.services.scrapper.cancelInvoice({
        ...rut,
        clave: rut.password
    });

    const res = await strapi.query('emit').findOne({ id: result.id });

    return res;
}

const acceptInvoice = async (ctx) => {
    const rut = await strapi.services.rut.byEnterprise(ctx);
    if (!rut) return null;
    const result = await strapi.services.scrapper.acceptInvoice({
        ...rut,
        clave: rut.password
    });

    // const res = await strapi.query('emit').findOne({
    //     id: result.id
    // });

    return result;
}

const emitExemptInvoice = async (ctx) => {
    const rut = await strapi.services.rut.byEnterprise(ctx);
    if (!rut) return null;

    const result = await strapi.services.scrapper.createExemptInvoice({
        ...rut,
        clave: rut.password
    }, ctx.request.body.document )

    const res = await strapi.query('emit').findOne({
        id: result.id
    });

    return res;
}

const emitDispatchGuide = async (ctx) => {
    const rut = await strapi.services.rut.byEnterprise(ctx);
    if (!rut) return null;

    const result = await strapi.services.scrapper.createDispatchGuide({
        ...rut,
        clave: rut.password
    }, ctx.request.body.document );

    const res = await strapi.query('emit').findOne({
        id: result.id
    });

    return res;
}

const documentReceiver = async (ctx) => {
    const { id } = ctx.state.user;
    const rut = await strapi.services.rut.byEnterprise(ctx);
    if (!rut) return ctx.badRequest({ message: "rut not exist" });

    const res = await strapi.services['rut-info'].findOrCreate({
        ...rut, clave: rut.password,
        getDocumentReceiver: strapi.services.scrapper.getDocumentReceiver
    });

    return res;
}

const documentReceiverDefault = async (ctx) => {
    const rut = process.env.DEFAULT_RUT;
    const clave = process.env.DEFAULT_PASSWORD;
    return strapi.services.scrapper.getDocumentReceiver({
        rut,
        clave,
        url: affectInvoice,
        ...ctx.request.body
    }, ctx.request.body.document);   
}

module.exports = {
    refresh,
    emitAffectInvoice,
    emitDispatchGuide,
    emitExemptInvoice,
    emitCancelInvoice,
    acceptInvoice,
    documentReceiver, 
    documentReceiverDefault,
    find
};