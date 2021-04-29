'use strict';
const axios = require('axios');
const fs = require('fs');
const { eboleta } = require("../services/tickets");
/**
 * Read the documentation (https://strapi.io/documentation/developer-docs/latest/development/backend-customization.html#core-controllers)
 * to customize this controller
 */

 const createTicket = async (ctx) => {
  const { id } = ctx.state.user;
  const rut = await strapi.query('rut').findOne({ user: id, favorite: true});
  await eboleta.login({
      ...rut,
      user: rut.rut,
  }); 
  const url = await eboleta.emitTicket({
      ...ctx.request.body
  });  
  let stringSplit = url.split("_");
  const folio = stringSplit[1].slice(5,stringSplit[1].length) + '.pdf';
  const path = `public/uploads/first_${folio}`;
  const fileStat = await axios({
      method: 'get',
      url,
      responseType: 'stream'
    }).then(function (response) {
      response.data.pipe(fs.createWriteStream(path))
      return fs.statSync(path);
    });
  const ticket = await strapi.query("tickets").create({
    amount: ctx.request.body.amount,
    user: id, 
    name: folio,
  });
  await strapi.plugins.upload.services.upload.upload({
    data: {
      refId: ticket.id,
      ref: 'tickets',
      field: 'document',
    },
    files: {
      path,
      name: folio,
      type: 'application/pdf', // mime type
      size: fileStat.size,
    },
  });
  fs.unlinkSync(path);
  return strapi.query("tickets").findOne({id:ticket.id});
}
module.exports = {
    createTicket
};
