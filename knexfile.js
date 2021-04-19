require("dotenv").config()
const { host, port, database, user, password } = parse(env("DATABASE_URL"));

const configuration =  {
  client: process.env.DATABASE_CLIENT || 'mysql',
  connection: {
    port: process.env.DATABASE_PORT || 3306,
    host: process.env.DATABASE_HOST || '127.0.0.1',
    database: process.env.DATABASE_NAME|| 'test',
    user: process.env.DATABASE_USER || 'root',
    password: process.env.DATABASE_PASSWORD || '',
  },
  seeds: {
    directory: './seeds',
  },
}
module.exports = {
    development: {
      ...configuration
    },
    production: {
      client: process.env.DATABASE_CLIENT || 'postgre',
      connection: {
        port: process.env.DATABASE_PORT || port,
        host: process.env.DATABASE_HOST || host,
        database: process.env.DATABASE_NAME|| database,
        user: process.env.DATABASE_USER || user,
        password: process.env.DATABASE_PASSWORD || password
      },
      seeds: {
        directory: './seeds',
      },
    }
  }