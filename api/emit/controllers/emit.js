'use strict';
const { refreshInformationEmits }  = require("../../../workers");
const { createAffectInvoice,createDispatchGuide,createExemptInvoice,getDocumentReceiver }  = require("../../scrapper/services/scrapper");
const {  affectInvoice, exemptInvoice, dispatchGuide } = require("../../../utils");

const refresh = async (ctx) => {
    const rut = await strapi.query('rut').findOne({ 
        rut : ctx.request.body.rut, favorite:true
    });
    if(!rut) return null;
    if(!rut.certificatePassword){
        return ctx.badRequest({ message: "certificatePassword is null"});
    }
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
        ...ctx.request.body
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
        ...ctx.request.body
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
        ...ctx.request.body
        }, {
            ...ctx.request.body.document
        })
    return { url : url };
}

const documentReceiver = async(ctx)=>{
    const {id } = ctx.state.user;
    const rut = await strapi.query("rut").findOne({user:id,rut:ctx.request.body.rut});
    if(!rut)
        return ctx.badRequest({message:"rut not exist"});
    return getDocumentReceiver({
        ...rut,
        clave: rut.password,
        url:affectInvoice,
        ...ctx.request.body
        },
        {
        ...ctx.request.body.document
        });
}
module.exports = {
    refresh, 
    refreshAll,
    emitAffectInvoice,
    emitDispatchGuide,
    emitExemptInvoice,
    documentReceiver
};