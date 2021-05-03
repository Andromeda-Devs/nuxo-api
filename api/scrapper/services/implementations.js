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

    const info = enterpriseHistory.data.map((item) => {
      return {
        //  url: item[0], 
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
    });

    await knex(table).insert(info);
  });
}

const refreshEmits = async ({ data }) => {
  try {
    const emits = await strapi.services.emit.find();
    const resultScraping = await getEmited({ 
      ignore: emits.map(_ => _.code),
      ...data 
    });
    console.log(resultScraping)
    await refreshData(resultScraping, data, "emits");
  } catch (error) {
    console.log(error);
  }
}

const refreshReceived = async ({ data }) => {
  try {
    const resultScraping = await getReceived({ ...data });
    await refreshData(resultScraping, data, "receiveds");
  } catch (error) {
    console.log(error);
  }
}


module.exports = {
  refreshEmits,
  refreshReceived
};