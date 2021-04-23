const { redisConnection } = require('../constants');
const { test }  = require("../api/scrapper/services/scrapper")
const Queue = require("bull");
const refreshInformation  = new Queue("STRAPI/REFRESH_INFORMATION", redisConnection);

refreshInformation.process(test);
module.exports = {
    refreshInformation
}