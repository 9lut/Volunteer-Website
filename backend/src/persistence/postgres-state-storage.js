const sql = require('sql-template-strings');
const { pool, query } = require('./db');

const ensureMigrationsTable = (dbq) =>
  dbq('CREATE TABLE IF NOT EXISTS migrations (id integer PRIMARY KEY, data jsonb NOT NULL)');

const postgresStateStorage = {
  async load(fn) {
    const client = await pool.connect();
    try {
      const dbq = (text, params) => client.query(text, params);
      await ensureMigrationsTable(dbq);
      const { rows } = await dbq('SELECT data FROM migrations');
      if (rows.length !== 1) {
        console.log('Cannot read migrations from database. If this is the first time you run migrations, then this is normal.');
        return fn(null, {});
      }
      fn(null, rows[0].data);
    } catch (e) {
      fn(e);
    } finally {
      client.release();
    }
  },

  async save(set, fn) {
    const client = await pool.connect();
    try {
      const dbq = (text, params) => client.query(text, params);
      await ensureMigrationsTable(dbq);
      const migrationMetaData = {
        lastRun: set.lastRun,
        migrations: set.migrations,
      };
      await client.query(sql`
        INSERT INTO migrations (id, data)
        VALUES (1, ${migrationMetaData})
        ON CONFLICT (id) DO UPDATE SET data = ${migrationMetaData}
      `);
      fn();
    } catch (e) {
      fn(e);
    } finally {
      client.release();
    }
  },
};

module.exports = Object.assign(() => {
  return postgresStateStorage;
}, postgresStateStorage);
