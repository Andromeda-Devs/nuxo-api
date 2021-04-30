'use strict';
const axios = require('axios');
const fs = require('fs');
const { eboleta } = require("../services/tickets");
const { sanitizeEntity } = require('strapi-utils');
/**
 * Read the documentation (https://strapi.io/documentation/developer-docs/latest/development/backend-customization.html#core-controllers)
 * to customize this controller
 */

const sleep = (ms) => {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

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

  let stringSplit = url.split("_");
  const folio = stringSplit[1].slice(5, stringSplit[1].length) + '.pdf';

  const path = `public/uploads/first_${folio}`;

  const response = await axios({
    method: 'get',
    url,
    responseType: 'stream'
  })

  await response.data.pipe(fs.createWriteStream(path))
  await sleep(3000);
  const fileStat = fs.statSync(path);

  const ticket = await strapi.query("tickets").create({
    amount: ctx.request.body.amount,
    user,
    name: folio
  });

  await strapi.plugins.upload.services.upload.upload({
    data: {
      refId: ticket.id,
      ref: 'tickets',
      field: 'document'
    },
    files: {
      path,
      name: folio,
      type: 'application/pdf', // mime type
      size: fileStat.size
    }
  });

  fs.unlinkSync(path);
  const ticketRes = await strapi.query("tickets").findOne({ id: ticket.id });

  return ticketRes;
}

module.exports = {
  createTicket,
  find
};
