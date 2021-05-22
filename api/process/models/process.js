'use strict';
const { uuid } = require('uuidv4');

const beforeCreate = async (data) => {
    data.hash = uuid();
}

module.exports = {
    lifecycles: {
        beforeCreate
    }
};
