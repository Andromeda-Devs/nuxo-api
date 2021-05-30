'use strict';

const { refreshData } = require('../../scrapper/services/implementations');


const startNewProcess = async () => {
  const nextProcess = await strapi.query('process').findOne({
    status: 'ON_HOLD'
  });

  if (!nextProcess) return nextProcess;

  const { entity_relation, rut: rut_relation } = nextProcess;

  const rut = await strapi.query('rut').findOne({
    rut: rut_relation
  });

  try{
    const params = {
      refreshData,
      entity: `${entity_relation}s`,
      ...rut,
      clave: rut.password,
      processDocument: nextProcess
    };

    if(entity_relation === 'emit')
      await strapi.services.scrapper.getEmited(params);
    else 
      await strapi.services.scrapper.getReceived(params);
  }catch (err) {
    await strapi.query('process').update({id: nextProcess.id}, {
      status: 'ON_HOLD'
    });
    // console.log(err);
  }

}

const check = async (ctx) => {
    const activeProcess = await strapi.query('process').findOne({
      status: 'PROCESSING'
    });

    if (!activeProcess) {
      await startNewProcess();
    }
    
    return activeProcess;
}

module.exports = {
    check
};
