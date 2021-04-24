'use strict';

const { refreshInformationReceived }  = require("../../../workers");

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

module.exports = {
    refresh, 
    refreshAll
};