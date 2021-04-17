const { parse } = require("pg-connection-string");

module.exports = ({ env }) => {
  if(env("DATABASE_URL") && env("NODE_ENV") == 'production'){
    const { host, port, database, user, password } = parse(env("DATABASE_URL"));

    return {
      defaultConnection: "default",
      connections: {
        default: {
          connector: "bookshelf",
          settings: {
            client: "postgres",
            host,
            port,
            database,
            username: user,
            password,
            ssl: { rejectUnauthorized: false }
          },
          options: {
            ssl: false
          },
        },
      },
    };
  }
  return {
    defaultConnection: 'default',
    connections: {
      default: {
        connector: 'bookshelf',
        settings: {
          client: env('DATABASE_CLIENT', 'mysql'),
          host: env('DATABASE_HOST', '127.0.0.1'),
          port: env.int('DATABASE_PORT', 3306),
          database: env('DATABASE_NAME', 'test'),
          username: env('DATABASE_USERNAME', 'root'),
          password: env('DATABASE_PASSWORD', ''),
          ssl: env.bool('DATABASE_SSL', false)
        },
        options: {
          useNullAsDefault: true,
        },
      },
    },
  }
};
