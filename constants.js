require("dotenv").config();

const knexConfiguration = { 
  client: process.env.DATABASE_CLIENT || 'mysql',
  connection: {
    port: process.env.DATABASE_PORT || 3306,
    host: process.env.DATABASE_HOST || '127.0.0.1',
    database: process.env.DATABASE_NAME|| 'test',
    user: process.env.DATABASE_USERNAME || 'root',
    password: process.env.DATABASE_PASSWORD || '',
  },
  useNullAsDefault: true
}

const knex = require('knex')(knexConfiguration);

const redisConnection = {
    port: process.env.REDIS_PORT, // Redis port
    host: process.env.REDIS_HOST, // Redis host
    family: process.env.REDIS_FAMILY, // 4 (IPv4) or 6 (IPv6)
    db: process.env.REDIS_DB,
  };
  
module.exports = {
    redisConnection, 
    knexConfiguration,
    knex
}