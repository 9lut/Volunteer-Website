// src/persistence/users.js
const { query, withTransaction } = require('./db');

/**
 * แปลงอีเมลให้เป็นมาตรฐาน (trim + lowercase)
 * @param {string} email
 * @returns {string}
 */
function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

/**
 * ค้นหาผู้ใช้ด้วยอีเมล
 * @param {string} email
 * @returns {Promise<object|null>}
 */
async function find(email) {
  const { rows } = await query(
    `SELECT id, email, password, role, name
     FROM users
     WHERE email = $1
     LIMIT 1`,
    [normalizeEmail(email)]
  );
  return rows[0] || null;
}

/**
 * ค้นหาผู้ใช้ด้วย ID
 * @param {number} id
 * @returns {Promise<object|null>}
 */
async function findById(id) {
  const { rows } = await query(
    `SELECT id, email, role, name
     FROM users
     WHERE id = $1
     LIMIT 1`,
    [id]
  );
  return rows[0] || null;
}

/**
 * ตรวจสอบว่ามีอีเมลนี้ในระบบหรือยัง
 * @param {string} email
 * @returns {Promise<boolean>}
 */
async function existsByEmail(email) {
  const { rows } = await query(
    `SELECT 1
     FROM users
     WHERE email = $1
     LIMIT 1`,
    [normalizeEmail(email)]
  );
  return !!rows[0];
}

/**
 * สร้างผู้ใช้ใหม่
 * @param {object} data
 * @param {string} data.email
 * @param {string} data.password (hashed)
 * @param {string} [data.role='student']
 * @param {string} [data.name]
 * @returns {Promise<object>} user
 */
async function create({ email, password, role = 'student', name = null }) {
  const { rows } = await query(
    `INSERT INTO users (email, password, role, name)
     VALUES ($1, $2, $3, $4)
     RETURNING id, email, role, name`,
    [normalizeEmail(email), password, role, name]
  );
  return rows[0];
}

/**
 * ดึงรายการผู้ใช้ทั้งหมด (มี pagination)
 * @param {object} [options]
 * @param {number} [options.limit=50]
 * @param {number} [options.offset=0]
 * @returns {Promise<object[]>}
 */
async function findAll({ limit = 50, offset = 0 } = {}) {
  const { rows } = await query(
    `SELECT id, email, role, name
     FROM users
     ORDER BY id DESC
     LIMIT $1 OFFSET $2`,
    [limit, offset]
  );
  return rows;
}

async function updateRole(id, role) {
  const allow = new Set(['student', 'president', 'admin']);
  if (!allow.has(role)) throw new Error('Invalid role');

  const { rows } = await query(
    `UPDATE users
     SET role = $2
     WHERE id = $1
     RETURNING id, email, role, name`,
    [id, role]
  );
  return rows[0] || null;
}

async function countAdmins(client = null) {
  const q = client ?? { query };
  const { rows } = await q.query(`SELECT COUNT(*)::int AS n FROM users WHERE role = 'admin'`);
  return rows[0]?.n ?? 0;
}

async function findRoleById(id, client = null) {
  const q = client ?? { query };
  const { rows } = await q.query(`SELECT id, role FROM users WHERE id = $1 LIMIT 1`, [id]);
  return rows[0] || null;
}

// ใช้โดยตรงแบบไม่เซฟ (ยังใช้ได้อยู่ แต่เดี๋ยว route จะเรียก updateRoleSafe แทน)
async function updateRole(id, role) {
  const allow = new Set(['student', 'president', 'admin']);
  if (!allow.has(role)) throw new Error('Invalid role');

  const { rows } = await query(
    `UPDATE users
     SET role = $2
     WHERE id = $1
     RETURNING id, email, role, name`,
    [id, role]
  );
  return rows[0] || null;
}

async function updateRoleSafe(id, role) {
  const allow = new Set(['student', 'president', 'admin']);
  if (!allow.has(role)) throw new Error('Invalid role');

  return withTransaction(async (client) => {
    // ล็อกแถว user เป้าหมาย
    const targetRes = await client.query(
      `SELECT id, role FROM users WHERE id = $1 FOR UPDATE`,
      [id]
    );
    const target = targetRes.rows[0];
    if (!target) return null;

    const adminsRes = await client.query(
      `SELECT id FROM users WHERE role = 'admin' FOR UPDATE`
    );
    const adminCount = adminsRes.rowCount;

    if (target.role === 'admin' && role !== 'admin') {
      if (adminCount <= 1) {
        const err = new Error('Cannot demote the last admin');
        err.code = 'LAST_ADMIN';
        throw err;
      }
    }

    const updated = await client.query(
      `UPDATE users
       SET role = $2
       WHERE id = $1
       RETURNING id, email, role, name`,
      [id, role]
    );
    return updated.rows[0] || null;
  });
}

async function getStats() {
  const total = await query(`SELECT COUNT(*)::int AS c FROM users`);
  const byRole = await query(`
    SELECT role, COUNT(*)::int AS count
    FROM users
    GROUP BY role
  `);
  return {
    total: total.rows[0].c,
    roles: byRole.rows.reduce((acc, r) => ({ ...acc, [r.role]: r.count }), {}),
    active: total.rows[0].c,
  };
}
async function setClub(user_id, club_id) {
  const { rows } = await query(
    `UPDATE users SET club_id = $2, updated_at = NOW()
     WHERE id = $1
     RETURNING id, email, role, club_id, created_at, updated_at`,
    [user_id, club_id]
  );
  return rows[0] || null;
}

async function setRole(user_id, role) {
  const { rows } = await query(
    `UPDATE users SET role = $2, updated_at = NOW()
     WHERE id = $1
     RETURNING id, email, role, club_id, created_at, updated_at`,
    [user_id, role]
  );
  return rows[0] || null;
}

module.exports = {
  normalizeEmail,
  find,
  findById,
  existsByEmail,
  create,
  findAll,
  updateRole,    
  updateRoleSafe, 
  countAdmins,
  findRoleById,
  getStats,
  setClub, 
  setRole,
};
