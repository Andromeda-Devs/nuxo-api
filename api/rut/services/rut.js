'use strict';

const byEnterprise = async (ctx) => {
    const { user: { id: user } } = ctx.state;
    const { body } = ctx.request;

    const rut = await strapi.query('rut').findOne({
        user,
        enterprises: body.enterprise_id
    });

    const empOption = rut.enterprises.find(item => item.id === body.enterprise_id).enterpriseRut;
    return Object.assign(
        rut,
        body,
        {
            empOption,
            clave: rut.password
        }
    )
}

module.exports = {
    byEnterprise
};
