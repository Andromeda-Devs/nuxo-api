'use strict';
const { refreshInformationEmits }  = require("../../../workers");
const { createAffectInvoice,createDispatchGuide,createExemptInvoice }  = require("../../scrapper/services/scrapper");
const { eboleta } = require("../services/emit");


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
const emitEboleta = async (ctx) => {
    const { id }  = await strapi.plugins[
        'users-permissions'
      ].services.jwt.getToken(ctx);
    const rut = await strapi.query('rut').findOne({ user: id});
    await eboleta.login({
        ...rut,
        user: rut.rut,
    }); 
    const url = await eboleta.emitTicket({
        ...ctx.request.body
    });  
    let stringSplit = url.split("_");
    return { url: url, folio : stringSplit[1].slice(5,stringSplit[1].length) };
}
module.exports = {
    refresh, 
    refreshAll,
    emitAffectInvoice,
    emitDispatchGuide,
    emitExemptInvoice,
    emitEboleta
};