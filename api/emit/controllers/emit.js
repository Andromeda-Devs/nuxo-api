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
    const url = await createAffectInvoice({
        ...rut,
        clave: rut.password,
        }, {
            ...ctx.request.body.document
        });
    return { url : url };
}
const emitExemptInvoice = async (ctx) =>{
    const rut = await strapi.query('rut').findOne({ 
        rut : ctx.request.body.rut
    });
    if(!rut) return null;
    const url = await createExemptInvoice({
        ...rut,
        clave: rut.password,
        }, {
            ...ctx.request.body.document
        })
   return { url : url };
}
const emitDispatchGuide = async (ctx) =>{
    const rut = await strapi.query('rut').findOne({ 
        rut : ctx.request.body.rut
    });
    if(!rut) return null;
    const url = await createDispatchGuide({
        ...rut,
        clave: rut.password,
        }, {
            ...ctx.request.body.document
        })
    return { url : url };
}

module.exports = {
    refresh, 
    refreshAll,
    emitAffectInvoice,
    emitDispatchGuide,
    emitExemptInvoice,
};