'use strict';
const { refreshInformationEmits }  = require("../../../workers");
const { createAffectInvoice,createDispatchGuide,createExemptInvoice }  = require("../../scrapper/services/scrapper");


const refresh = async (ctx) => {
    const rut = await strapi.query('rut').findOne({ 
        rut : ctx.request.body.rut
    });
    if(!rut) return null;
    refreshInformationEmits.add({
        ...rut,
        clave: rut.password,
        });
    return {message:"process in progress"};
}

const refreshAll = async (ctx) => {
    const ruts = await strapi.query('rut');
    if(!ruts) return null;
    ruts.map(async ( rut)=>{
        refreshInformationEmits.add({
            ...rut,
            clave: rut.password,
            });
    });
    return { message:"process in progress" };
}

const emitAffectInvoice = async (ctx) =>{
    const rut = await strapi.query('rut').findOne({ 
        rut : ctx.request.body.rut
    });
    if(!rut) return null;
    return createAffectInvoice({
        ...rut,
        clave: rut.password,
        ...ctx.request.body})

}
const emitExemptInvoice = async (ctx) =>{
    const rut = await strapi.query('rut').findOne({ 
        rut : ctx.request.body.rut
    });
    if(!rut) return null;
    return createExemptInvoice({
        ...rut,
        clave: rut.password,
        ...ctx.request.body})

}
const emitDispatchGuide = async (ctx) =>{
    const rut = await strapi.query('rut').findOne({ 
        rut : ctx.request.body.rut
    });
    if(!rut) return null;
    return createDispatchGuide({
        ...rut,
        clave: rut.password,
        }, {
            ...ctx.request.body.document
        })
}
module.exports = {
    refresh, 
    refreshAll,
    emitAffectInvoice,
    emitDispatchGuide,
    emitExemptInvoice,
};