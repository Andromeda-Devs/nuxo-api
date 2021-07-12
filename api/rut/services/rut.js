'use strict';

const byEnterprise = async (ctx) => {
    const { user: { id: user } } = ctx.state;
    const { body } = ctx.request;

    const rut = await strapi.query('rut').findOne({
        user,
        enterprises: body.enterprise_id
    });
    const empOption = rut.enterprises.find(item => item.id === body.enterprise_id).enterpriseRut;
    // console.log(empOption)
    return Object.assign(
        rut,
        body,
        {
            empOption,
            clave: rut.password
        }
    )
}

const format = async (text) => {
    const splited = text.split('-');
    return {
        rut: splited[0].split('.').join(''),
        dv: splited[1]
    };
}

module.exports = {
    byEnterprise,
    format
};
