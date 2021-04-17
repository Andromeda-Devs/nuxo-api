'use strict';

const getEmited = async (ctx) => {
    const result = await strapi.services.scrapper.getEmited({
        rut: '16.593.992-1',
        clave: 'Felipe23'
    });
    return result;
}

module.exports = {
    getEmited
};
