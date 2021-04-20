require("dotenv").config()

const configuration =   {
  client: process.env.DATABASE_CLIENT || 'mysql',
  connection: {
    port: process.env.DATABASE_PORT || 3306,
    host: process.env.DATABASE_HOST || '127.0.0.1',
    database: process.env.DATABASE_NAME|| 'test',
    user: process.env.DATABASE_USERNAME || 'root',
    password: process.env.DATABASE_PASSWORD || '',
  },
  seeds: {
    directory: './seeds',
  },
}
module.exports =  {
    development: {
      ...configuration
    },
    production: {
      ...configuration
    }
  }