const fs = require('fs');
const uuid = require("uuid");
const { knex } = require("../../../constants");
const { getEmited, getReceived } = require("./scrapper");

const refreshData = async (resultScraping, data, table) => {
  var dateObj = new Date();
  var month = dateObj.getUTCMonth() + 1; //months from 1-12
  var day = dateObj.getUTCDate();
  var year = dateObj.getUTCFullYear();
  const newdate = year + "/" + month + "/" + day;
  resultScraping.map(async (enterpriseHistory) => {
    let enterprise = await knex('enterprises').where({ 
      enterpriseRut: enterpriseHistory.rut, 
      rut: data.id 
    }).first();
    if (!enterprise) {
      enterprise = await knex('enterprises').insert([{
        rut: data.id,
        enterpriseRut: enterpriseHistory.rut,
      }]);

      enterprise = {
        id: enterprise[0]
      }
    }
    let info = enterpriseHistory.data.map( (item) => {
      let fileExist = false;
      try {
        fs.readdirSync(`public/uploads/${item.code}`).forEach(file => {
          if(file)
            fileExist = true;
        });
        if(!fileExist) return null;
        return {
          published_at: newdate,
          rut: item[1],
          businessName: item[2],
          document: item[3],
          invoice: item[4],
          date: item[5],
          amount: item[6],
          state: item[7],
          enterprise: enterprise.id,
          code: item.code
        }

      } catch (error) {
        return null;
      }
  });
  info =  info.filter((item)=>{
    return item !== null;
  });
  await knex(table).insert(info);
  const documents = info.map((item)=>{
    let documentName;
    fs.readdirSync(`public/uploads/${item.code}`).forEach(file => {
      documentName = file
    }); 
    return {
      code:item.code, 
      name:documentName
    }
  });
  await documents.map(async (item) =>{
    let {name, code} = item;
    const path = `/uploads/${code}/${name}`
    const publicPath = `public${path}`;
    const fileStat =  fs.statSync(publicPath);
    const document = await knex("upload_file").insert([{
      name, 
      hash:name, 
      ext: '.pdf', 
      size: fileStat.size,
      url:path,
      provider:'local', 
      mime:'application/pdf'
    }]);
    const data = await knex(table).where({code}).first();
    await knex('upload_file_morph').insert([{
      upload_file_id:document[0], 
      related_id: data.id,
      related_type:table,
      field:'document',
      order:1
    }]);
  })
  });
}

const refreshEmits = async ({ data }) => {
  try {
    const emits = await strapi.services.emit.find();
    const resultScraping = await getEmited({ 
      ignore: emits.map(_ => _.code),
      ...data 
    });
    await refreshData(resultScraping, data, "emits");
  } catch (error) {
    console.log(error);
  }
}

const refreshReceived = async ({ data }) => {
  try {
    const received = await strapi.services.received.find();
    const resultScraping = await getReceived({ 
      ignore: received.map(_ => _.code),
      ...data 
    });
    await refreshData(resultScraping, data, "receiveds");
  } catch (error) {
    console.log(error);
  }
}


module.exports = {
  refreshEmits,
  refreshReceived
};