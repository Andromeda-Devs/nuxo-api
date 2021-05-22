const fs = require('fs');
const uuid = require("uuid");
const { knex } = require("../../../constants");
const { getEmited, getReceived } = require("./scrapper");
const { sleep } = require("../../../utils");

const refreshData = async (resultScraping, data, table) => {
  for (const enterpriseHistory of resultScraping) {
    let enterprise = await knex('enterprises').where({
      enterpriseRut: enterpriseHistory.rut.trim(),
      rut: data.id
    }).first();
    if (!enterprise) {
      enterprise = await strapi.query('enterprise').create({
        rut: data.id,
        enterpriseRut: enterpriseHistory.rut
      });
    }
    let info = enterpriseHistory.data.map((item) => {
      let fileExist = false;
      try {
        fs.readdirSync(`public/uploads/${item.code}`).forEach(file => {
          if (file)
            fileExist = true;
        });
        if (!fileExist) return null;
        return {
          rut: item[1].trim(),
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
    info = info.filter((item) => {
      return item !== null;
    });

    for (item of info) {
      const entity = table === 'emits' ? 'emit' : 'received';
      const code = item.code;
      const finded = await strapi.query(entity).findOne({code});
      if (!finded) {
        try{
          const result = await strapi.query(entity).create(item);
    
          const name = fs.readdirSync(
            `public/uploads/${code}`
          ).reduce((acc, cur) => cur, '');
    
          const path = `/uploads/${code}/${name}`
          const publicPath = `public${path}`;
    
          const fileStat = fs.statSync(publicPath);
    
          await strapi.plugins.upload.services.upload.upload({
            data: {
              refId: result.id,
              ref: entity,
              field: 'file',
            },
            files: {
              path: publicPath,
              name: name,
              type: 'application/pdf', // mime type
              size: fileStat.size,
            },
          });
    
          await strapi.config.functions.document.updateData(result.id, publicPath, entity);
          await sleep(200);
        }catch(err) {

        }
      }

      try {
        fs.rmdirSync(`public/uploads/${code}`, {
          recursive: true
        });
      } catch (error) {
        // console.log(error)
      }
    }

  }
}

const refreshEmits = async ({ data }) => {
  try {
    // const resultScraping = 
    await getEmited({
      refreshData,
      entity: 'emits',
      ...data
    });
    // await refreshData(resultScraping, data, "emits");
  } catch (error) {
    console.log(error);
  }
}

const refreshReceived = async ({ data }) => {
  try {
    await getReceived({
      refreshData,
      entity: 'receiveds',
      ...data
    });
  } catch (error) {
    console.log(error);
  }
}


module.exports = {
  refreshEmits,
  refreshReceived
};