'use strict';
const axios = require('axios');
const uuid = require("uuid");
const fs = require('fs');
const { eboleta } = require("../services/tickets");
const { knex } = require("../../../constants")
const { sanitizeEntity } = require('strapi-utils');
const { sleep } = require("../../../utils");
/**
 * Read the documentation (https://strapi.io/documentation/developer-docs/latest/development/backend-customization.html#core-controllers)
 * to customize this controller
 */



const find = async (ctx) => {
  const { id: user } = ctx.state.user;

  const tickets = await strapi.services.tickets.find({
    user
  });

  return {
    tickets: tickets.map(entity => sanitizeEntity(entity, { model: strapi.models.tickets }))
  };
}

const createTicket = async (ctx) => {
  const { body } = ctx.request;
  const { id: user } = ctx.state.user;
  const rut = await strapi.query('rut').findOne({ user, favorite: true });

  await eboleta.login({ ...rut, user: rut.rut });

  const url = await eboleta.emitTicket(body);

  await eboleta.close();

  let stringSplit = url.split("_");
  const folio = stringSplit[1].slice(5,stringSplit[1].length) 
  const hash = folio + uuid.v4();
  const folioExt = hash + '.pdf';
  const path = `/uploads/${folioExt}`
  const publicPath = `public${path}`;
  await axios({
      method: 'get',
      url,
      responseType: 'stream'
    }).then(function (response) {
      response.data.pipe(fs.createWriteStream(publicPath))
    });
  await sleep(3000);
  const fileStat =  fs.statSync(publicPath);
  const ticket = await strapi.query("tickets").create({
    amount: ctx.request.body.amount,
    user, 
    name: folio,
    invoice: folio,
  });
  const document = await knex("upload_file").insert([{
    name:folio, 
    hash, 
    ext: '.pdf', 
    size: fileStat.size,
    url:`/uploads/${folioExt}`,
    provider:'local', 
    mime:'application/pdf'
  }]);
  await knex('upload_file_morph').insert([{
    upload_file_id:document[0], 
    related_id: ticket.id,
    related_type:'tickets',
    field:'document',
    order:1
  }]);
  const { document: [res] } = await strapi.query("tickets").findOne({id:ticket.id});
  return res;
}

const cancelTicket = async (ctx) => {
  const { user: { id: user } } = ctx.state;
  const rut = await strapi.services.rut.byEnterprise(ctx);
  if (!rut) return rut;
  const formatedReceiver = await strapi.services.rut.format(rut.empOption);
  const result = await strapi.services.scrapper.cancelTicket(
    rut, ctx.request.body.document
  );
  const res = await strapi.query('emit').findOne({
      id: result.id
  });

  return res;
}

module.exports = {
  createTicket,
  cancelTicket,
  find
};
