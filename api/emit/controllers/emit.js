'use strict';
const { createAffectInvoice, createDispatchGuide, createExemptInvoice, getDocumentReceiver } = require("../../scrapper/services/scrapper");
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
    const { user } = ctx.state;
    const rut = await strapi.query('rut').findOne({
        rut: ctx.request.body.rut
    });

    if (!rut) return null;

    if (!rut.certificatePassword) {
        return ctx.badRequest({ message: "certificatePassword is null" });
    }

    const activeProcess = await strapi.query('process').findOne({
        user: user.id,
        status_in: ['ON_HOLD', 'PROCESSING'],
        entity_relation: 'emit',
        rut: ctx.request.body.rut
    });

    if (activeProcess) {
        return sanitizeEntity(activeProcess, {
            model: strapi.models.process
        });
    }


    const {user: _user, ...newProcess} = await strapi.query('process').create({
        user,
        entity_relation: 'emit',
        rut: ctx.request.body.rut
    })

    return sanitizeEntity(newProcess, {
        model: strapi.models.process
    });
}

const emitAffectInvoice = async (ctx) => {
    const rut = await strapi.query('rut').findOne({
        rut: ctx.request.body.rut
    });
    if (!rut) return null;

    const result = await createAffectInvoice({
        ...rut,
        clave: rut.password,
        ...ctx.request.body
    }, {
        ...ctx.request.body.document
    });

    const res = await strapi.query('emit').findOne({
        id: result.id
    });

    return res;
}

const emitExemptInvoice = async (ctx) => {

    const rut = await strapi.query('rut').findOne({
        rut: ctx.request.body.rut
    });

    if (!rut) return null;

    const result = await createExemptInvoice({
        ...rut,
        clave: rut.password,
        ...ctx.request.body
    }, {
        ...ctx.request.body.document
    })
    const res = await strapi.query('emit').findOne({
        id: result.id
    });

    return res;
}

const emitDispatchGuide = async (ctx) => {

    const rut = await strapi.query('rut').findOne({
        rut: ctx.request.body.rut
    });

    if (!rut) return null;

    const result = await createDispatchGuide({
        ...rut,
        clave: rut.password,
        ...ctx.request.body
    }, {
        ...ctx.request.body.document
    })

    const res = await strapi.query('emit').findOne({
        id: result.id
    });

    return res;
}

const documentReceiver = async (ctx) => {
    const { id } = ctx.state.user;
    const rut = await strapi.query("rut").findOne({ user: id, rut: ctx.request.body.rut });

    if (!rut) return ctx.badRequest({ message: "rut not exist" });

    return getDocumentReceiver({
        ...rut,
        clave: rut.password,
        url: affectInvoice,
        ...ctx.request.body
    }, ctx.request.body.document);
}

const documentReceiverDefault = async (ctx) => {
    const rut = process.env.DEFAULT_RUT;
    const clave = process.env.DEFAULT_PASSWORD;
    return getDocumentReceiver({
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
    documentReceiver, 
    documentReceiverDefault,
    find
};