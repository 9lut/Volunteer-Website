require('dotenv').config(); // โหลดค่าจาก .env ก่อนทุกอย่าง

const path = require('path');
const migrate = require('migrate');
const stateStore = require('../src/persistence/postgres-state-storage');

const migrationsDirectory = path.resolve(__dirname, '../src/migrations');
const [command] = process.argv.slice(2);

if (!command) {
  console.error('Usage: node bin/migrate.js <up|down>');
  process.exit(1);
}

if (!process.env.DATABASE_URL || typeof process.env.DATABASE_URL !== 'string') {
  console.error('Missing or invalid DATABASE_URL (must be a non-empty string)');
  process.exit(1);
}

new Promise((resolve, reject) => {
  migrate.load(
    { stateStore, migrationsDirectory },
    (err, set) => {
      if (err) return reject(err);
      if (typeof set[command] !== 'function') {
        return reject(new Error(`Command "${command}" is not a function`));
      }
      set[command]((err2) => (err2 ? reject(err2) : resolve()));
    }
  );
})
  .then(() => {
    console.log(`migrations "${command}" successfully ran`);
    process.exit(0);
  })
  .catch((error) => {
    console.error(error.stack || error.message || error);
    process.exit(1);
  });
