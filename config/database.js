require('./initEnv');
const { Sequelize } = require('sequelize');
const pg = require('pg');

let sequelize;

const dbUrl = process.env.DATABASE_URL;

if (dbUrl) {
  // Conexão via URL completa (padrão recomendado para Neon PostgreSQL)
  const isPostgres = dbUrl.startsWith('postgres://') || dbUrl.startsWith('postgresql://');
  sequelize = new Sequelize(dbUrl, {
    dialect: isPostgres ? 'postgres' : undefined,
    dialectModule: isPostgres ? pg : undefined,
    dialectOptions: isPostgres ? {
      ssl: {
        require: true,
        rejectUnauthorized: false
      }
    } : {},
    logging: process.env.DB_LOGGING === 'true' ? console.log : false,
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000
    }
  });
} else if (process.env.DB_DIALECT === 'postgres') {
  // Conexão PostgreSQL com variáveis individuais
  sequelize = new Sequelize(
    process.env.DB_NAME,
    process.env.DB_USER,
    process.env.DB_PASS,
    {
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 5432,
      dialect: 'postgres',
      dialectModule: pg,
      dialectOptions: (process.env.DB_SSL === 'false') ? {} : {
        ssl: {
          require: true,
          rejectUnauthorized: false
        }
      },
      logging: process.env.DB_LOGGING === 'true' ? console.log : false,
      pool: {
        max: 5,
        min: 0,
        acquire: 30000,
        idle: 10000
      }
    }
  );
} else {
  // Conexão padrão de desenvolvimento com SQLite
  sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: process.env.DB_STORAGE || './database.sqlite',
    logging: false
  });
}

module.exports = sequelize;
