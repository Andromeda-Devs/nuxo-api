const fs = require('fs');
const uuid = require("uuid");
const { knex } = require("../../../constants");
const { getEmited, getReceived } = require("./scrapper");
const { sleep } = require("../../../utils");
const rimraf = require('rimraf');

const refreshData = async (resultScraping, data, entity) => {
  for (const enterpriseHistory of resultScraping) {
    let enterprise = await strapi.query('enterprise').findOne({
      enterpriseRut: enterpriseHistory.rut.trim(),
      rut: data.id
    });
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

    let result;

    for (item of info) {
      const code = item.code;
    
      try{
        result = await strapi.query(entity).create(item);
  
        const name = fs.readdirSync(
          `public/uploads/${code}`
        ).reduce((acc, cur) => cur, '');
  
        const path = `/uploads/${code}/${name}`
        const publicPath = `public${path}`;
  
        const fileStat = fs.statSync(publicPath);
  
        await strapi.config.functions.document.updateData(result.id, publicPath, entity);

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
  
        await sleep(200);

        result = await strapi.query(entity).findOne({
          id: result.id
        });
        
      }catch(err) {
        console.log(err);
      } finally {
        rimraf.sync(`public/uploads/${code}`);
        // fs.rmdirSync(`public/uploads/${code}`, {
        //   recursive: true
        // });
      }

    }

    return result;

  }
}

const refreshEmits = async ({ data }) => {
  try {
    await getEmited({
      refreshData,
      entity: 'emits',
      ...data
    });
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
  refreshReceived,
  refreshData
};