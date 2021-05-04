const { redisConnection } = require('../constants');
const { refreshEmits, refreshReceived } = require("../api/scrapper/services/implementations")
const Queue = require("bull");

const refreshInformationEmits = new Queue("STRAPI/REFRESH_INFORMATION_EMITS", redisConnection, {
  limiter: {
    max: 1,
  },
});

refreshInformationEmits.process(refreshEmits);

const refreshInformationReceived = new Queue("STRAPI/REFRESH_INFORMATION_RECEIVED", redisConnection, {
  limiter: {
    max: 1,
  },
});

refreshInformationReceived.process(refreshReceived);

module.exports = {
  refreshInformationEmits,
  refreshInformationReceived,
}