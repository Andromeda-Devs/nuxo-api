'use strict';

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
      entity: entity_relation,
      ...rut,
      clave: rut.password,
      processDocument: nextProcess
    };

    if(entity_relation === 'emit'){
      await strapi.services.scrapper.getEmited(params);
    }else{
      await strapi.services.scrapper.getReceived(params);
    } 
    await strapi.query('process').update({id: nextProcess.id}, {
      status: 'DONE'
    });
    return true;
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
    } else {
      return 'processing';
    }
    
    return 'process done';
}

module.exports = {
    check
};
