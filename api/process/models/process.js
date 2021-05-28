'use strict';
const uuid = require("uuid");

const beforeCreate = async (data) => {
    data.hash = uuid.v4();
}

module.exports = {
    lifecycles: {
        beforeCreate
    }
};
