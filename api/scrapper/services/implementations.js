const { knex } = require("../../../constants");
const { getEmited, getReceived} = require("./scrapper");
const refreshEmits = async ({data}) => {
    try {
      const resultScraping = await getEmited({...data}); 
      resultScraping.map(async ( enterpriseHistory )=>{
        let enterprise= await knex('enterprises').where({enterpriseRut: enterpriseHistory.rut, rut: data.id}).first();
        if(!enterprise){
          enterprise = await knex('enterprises').insert([{
            rut: data.id,
            enterpriseRut: enterpriseHistory.rut,
          }]);
          enterprise = { 
            id: enterprise[0]
          }
        }
        const info = enterpriseHistory.data.map((item)=>{
          return { 
          //  url: item[0], 
            rut: item[1],
            businessName:item[2],
            document:item[3], 
            invoice: item[4],
            date: item[5],
            amount: item[6],
            state: item[7],
            enterprise: enterprise.id
          }
        }); 
        await knex('emits').insert(info);
      });
    } catch (error) {
      console.log(error);
    }
}

const refreshReceived = async ({data}) => {
    try {
      const resultScraping = await   getReceived({...data});
      resultScraping.map(async ( enterpriseHistory )=>{
        let enterprise= await knex('enterprises').where({enterpriseRut: enterpriseHistory.rut, rut: data.id}).first();
        if(!enterprise){
          enterprise = await knex('enterprises').insert([{
            rut: data.id,
            enterpriseRut: enterpriseHistory.rut,
          }]);
          enterprise = { 
            id: enterprise[0]
          }
        }
        const info = enterpriseHistory.data.map((item)=>{
          return { 
          //  url: item[0], 
            rut: item[1],
            businessName:item[2],
            document:item[3], 
            invoice: item[4],
            date: item[5],
            amount: item[6],
            state: item[7],
            enterprise: enterprise.id
          }
       }); 
        await knex('receiveds').insert(info);
      });
    } catch (error) {
      console.log(error);
    }
}


module.exports = {
  refreshEmits,
  refreshReceived
};