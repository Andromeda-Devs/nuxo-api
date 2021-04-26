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
    await createAffectInvoice({
        ...rut,
        clave: rut.password,
        }, {
            ...ctx.request.body.document
        })
    return true
}
const emitExemptInvoice = async (ctx) =>{
    const rut = await strapi.query('rut').findOne({ 
        rut : ctx.request.body.rut
    });
    if(!rut) return null;
    await createExemptInvoice({
        ...rut,
        clave: rut.password,
        }, {
            ...ctx.request.body.document
        })
    return true

}
const emitDispatchGuide = async (ctx) =>{
    const rut = await strapi.query('rut').findOne({ 
        rut : ctx.request.body.rut
    });
    if(!rut) return null;
    await createDispatchGuide({
        ...rut,
        clave: rut.password,
        }, {
            ...ctx.request.body.document
        })
    return true;
}
const emitEboleta = async (ctx) => {
  await eboleta.login({
    ...ctx.request.body,
    user: ctx.request.body.rut,
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