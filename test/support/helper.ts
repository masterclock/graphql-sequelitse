import { resetCache } from 'dataloader-sequelize';
import * as Sequelize from 'sequelize';

// export const Promise = Sequelize.Promise;

if (typeof afterEach !== 'undefined') {
  afterEach(resetCache);
}

export const createSequelize = (options: any = {}): Sequelize.Sequelize => {
  const env = process.env;
  const dialect = env.DIALECT || 'sqlite';
  const config = Object.assign(
    {
      user: 'graphql_sequelize_test',
      password: 'graphql_sequelize_test',
      database: 'graphql_sequelize_test',
    },
    dialect === 'postgres' && {
      host: env.POSTGRES_PORT_5432_TCP_ADDR,
      user: env.POSTGRES_ENV_POSTGRES_USER,
      password: env.POSTGRES_ENV_POSTGRES_PASSWORD,
      database: env.POSTGRES_ENV_POSTGRES_DATABASE,
    },
    dialect === 'mysql' && {
      host: env.MYSQL_PORT_3306_TCP_ADDR,
      user: env.MYSQL_ENV_MYSQL_USER,
      password: env.MYSQL_ENV_MYSQL_PASSWORD,
      database: env.MYSQL_ENV_MYSQL_DATABASE,
    },
    dialect === 'postgres' && env.CI && {
      user: 'postgres',
      password: '',
      database: 'test',
    },
    dialect === 'mysql' && env.CI && {
      user: 'travis',
      password: '',
      database: 'test',
    },
  );
  config.database = 'graphql_sequelize_test';
  config.user = 'postgres';
  config.password = 'postgres';
  const inst = new Sequelize(config.database, config.user, config.password, {
    host: config.host,
    dialect: 'postgres',
    logging: console.log,
    ...options,
  });
  return inst;
};

export const sequelize: Sequelize.Sequelize = createSequelize({
  dialect: 'postgres',
  user: 'postgres',
  password: 'postgres',
  host: 'vpn.sdz.cloud',
  database: 'graphql_sequelize_test',
});

export function beforeRemoveAllTables() {
  before(() => {
    if (sequelize.getDialect() === 'mysql') {
      this.timeout(10000);
      return removeAllTables(sequelize);
    }
  });
}

// Not nice too, MySQL does not supports same name for foreign keys
// Solution ? Force remove all tables!
export const removeAllTables = (_sequelize: Sequelize.Sequelize): any => {
  function getTables() {
    return sequelize.query('show tables').then((tables: any[]) => tables[0].map((table: any) => table.Tables_in_test));
  }

  return getTables()
    .then((tables: any) => {
      return Promise.all(tables.map((table: any) => {
        return sequelize.query('drop table ' + table).catch(() => ({}));
      }));
    })
    .then(() => {
      return getTables();
    })
    .then((tables: any) => {
      if (tables.length) {
        return removeAllTables(sequelize);
      }
    });
};
