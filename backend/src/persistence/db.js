// persistence/db.js
require('dotenv').config();
const { Pool } = require('pg');

const connectionString = process.env.DATABASE_URL;
if (!connectionString || typeof connectionString !== 'string' || !connectionString.trim()) {
  throw new Error('DATABASE_URL must be a non-empty string');
}

// ตรวจ SSL: ถ้า NODE_ENV=production หรือมี sslmode=require ใน URL ให้เปิด SSL
const needsSSL =
  process.env.PGSSL === 'true' ||
  process.env.NODE_ENV === 'production' ||
  /[?&]sslmode=require\b/i.test(connectionString);

const pool = new Pool({
  connectionString,
  ssl: needsSSL ? { rejectUnauthorized: false } : undefined,
  // ปรับตามสภาพแวดล้อม
  max: Number(process.env.PG_POOL_MAX || 10),
  idleTimeoutMillis: Number(process.env.PG_IDLE_TIMEOUT || 30000),
  connectionTimeoutMillis: Number(process.env.PG_CONN_TIMEOUT || 10000),
});

// ตั้งค่าเซสชันหลังเชื่อมต่อ
pool.on('connect', async (client) => {
  try {
    // ใช้ UTC ให้สม่ำเสมอ
    await client.query(`SET TIME ZONE 'UTC';`);
    // กัน query แฮงนานเกินไป (เลือกค่าได้)
    const timeoutMs = Number(process.env.PG_STATEMENT_TIMEOUT_MS || 60000);
    if (timeoutMs > 0) {
      await client.query(`SET statement_timeout = ${timeoutMs};`);
    }
  } catch (e) {
    // แค่ log; ไม่ throw เพื่อไม่ให้ปิดการเชื่อมต่อทั้งหมด
    console.warn('[db] post-connect setup failed:', e.message);
  }
});

// query() รองรับทั้ง pool และ client (สำหรับทรานแซกชัน)
async function query(text, params, clientOrPool = pool) {
  return clientOrPool.query(text, params);
}

// withTransaction: รับฟังก์ชันที่ได้ client มาใช้งาน
async function withTransaction(fn) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    try { await client.query('ROLLBACK'); } catch {}
    throw err;
  } finally {
    client.release();
  }
}

// ปิด pool เมื่อต้องการ (เช่นตอน process exit หรือในสคริปต์ CLI)
async function closePool() {
  try {
    await pool.end();
  } catch (e) {
    console.warn('[db] pool.end() error:', e.message);
  }
}

module.exports = { pool, query, withTransaction, closePool };
