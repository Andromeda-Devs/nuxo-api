require("dotenv").config();

const redisConnection = {
    port: process.env.REDIS_PORT, // Redis port
    host: process.env.REDIS_HOST, // Redis host
    family: process.env.REDIS_FAMILY, // 4 (IPv4) or 6 (IPv6)
    db: process.env.REDIS_DB,
  };
module.exports = {
    redisConnection
}