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
    `SELECT id, email, password, role, name, club_id, status,
            student_id, faculty, major, birth_date, year_level, phone
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
    `SELECT id, email, role, name, status,
            student_id, faculty, major, birth_date, year_level, phone,
            created_at, updated_at
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
 * ตรวจสอบว่ามีรหัสนักศึกษานี้ในระบบหรือยัง
 * @param {string} studentId
 * @returns {Promise<boolean>}
 */
async function existsByStudentId(studentId) {
  if (!studentId) return false;
  const { rows } = await query(
    `SELECT 1
     FROM users
     WHERE student_id = $1
     LIMIT 1`,
    [studentId]
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
 * @param {string} [data.student_id]
 * @param {string} [data.faculty]
 * @param {string} [data.major]
 * @param {string} [data.birth_date]
 * @param {number} [data.year_level]
 * @param {string} [data.phone]
 * @returns {Promise<object>} user
 */
async function create({ 
  email, 
  password, 
  role = 'student', 
  name = null,
  student_id = null,
  faculty = null,
  major = null,
  birth_date = null,
  year_level = null,
  phone = null
}) {
  const { rows } = await query(
    `INSERT INTO users (email, password, role, name, student_id, faculty, major, birth_date, year_level, phone)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
     RETURNING id, email, role, name, student_id, faculty, major, birth_date, year_level, phone`,
    [normalizeEmail(email), password, role, name, student_id, faculty, major, birth_date, year_level, phone]
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
    `SELECT id, email, role, name, status,
            student_id, faculty, major, birth_date, year_level, phone,
            created_at, updated_at
     FROM users
     ORDER BY created_at DESC
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

/**
 * อัปเดตโปรไฟล์ผู้ใช้ (เฉพาะข้อมูลที่แก้ไขได้)
 * @param {string} user_id - UUID ของผู้ใช้
 * @param {object} profileData - ข้อมูลที่ต้องการอัปเดต
 * @returns {Promise<object|null>}
 */
async function updateProfile(user_id, profileData) {
  const fields = [];
  const values = [user_id];
  let paramIndex = 2;

  // ฟิลด์ที่แก้ไขได้
  if (profileData.name !== undefined) {
    fields.push(`name = $${paramIndex++}`);
    values.push(profileData.name);
  }
  if (profileData.faculty !== undefined) {
    fields.push(`faculty = $${paramIndex++}`);
    values.push(profileData.faculty);
  }
  if (profileData.major !== undefined) {
    fields.push(`major = $${paramIndex++}`);
    values.push(profileData.major);
  }
  if (profileData.birth_date !== undefined) {
    fields.push(`birth_date = $${paramIndex++}`);
    values.push(profileData.birth_date);
  }
  if (profileData.year_level !== undefined) {
    fields.push(`year_level = $${paramIndex++}`);
    values.push(profileData.year_level);
  }
  if (profileData.phone !== undefined) {
    fields.push(`phone = $${paramIndex++}`);
    values.push(profileData.phone);
  }

  if (fields.length === 0) {
    return await findById(user_id);
  }

  fields.push('updated_at = NOW()');
  
  const { rows } = await query(
    `UPDATE users SET ${fields.join(', ')}
     WHERE id = $1::uuid
     RETURNING id, email, role, name, status, student_id, faculty, major, birth_date, year_level, phone, created_at, updated_at`,
    values
  );
  return rows[0] || null;
}

/**
 * อัปเดตข้อมูลผู้ใช้ (admin)
 * @param {string} user_id - UUID ของผู้ใช้
 * @param {object} updates - ข้อมูลที่ต้องการอัปเดต
 * @returns {Promise<object|null>}
 */
async function updateUser(user_id, updates) {
  const fields = [];
  const values = [user_id];
  let paramIndex = 2;

  if (updates.name !== undefined) {
    fields.push(`name = $${paramIndex++}`);
    values.push(updates.name);
  }
  if (updates.email !== undefined) {
    fields.push(`email = $${paramIndex++}`);
    values.push(normalizeEmail(updates.email));
  }
  if (updates.role !== undefined) {
    fields.push(`role = $${paramIndex++}`);
    values.push(updates.role);
  }
  if (updates.status !== undefined) {
    fields.push(`status = $${paramIndex++}`);
    values.push(updates.status);
  }
  if (updates.student_id !== undefined) {
    fields.push(`student_id = $${paramIndex++}`);
    values.push(updates.student_id);
  }
  if (updates.faculty !== undefined) {
    fields.push(`faculty = $${paramIndex++}`);
    values.push(updates.faculty);
  }
  if (updates.major !== undefined) {
    fields.push(`major = $${paramIndex++}`);
    values.push(updates.major);
  }
  if (updates.birth_date !== undefined) {
    fields.push(`birth_date = $${paramIndex++}`);
    values.push(updates.birth_date);
  }
  if (updates.year_level !== undefined) {
    fields.push(`year_level = $${paramIndex++}`);
    values.push(updates.year_level);
  }
  if (updates.phone !== undefined) {
    fields.push(`phone = $${paramIndex++}`);
    values.push(updates.phone);
  }

  if (fields.length === 0) {
    return await findById(user_id);
  }

  fields.push('updated_at = NOW()');

  const { rows } = await query(
    `UPDATE users SET ${fields.join(', ')}
     WHERE id = $1::uuid
     RETURNING id, email, role, name, status, student_id, faculty, major, birth_date, year_level, phone, created_at, updated_at`,
    values
  );
  return rows[0] || null;
}

/**
 * ลบผู้ใช้
 * @param {string} user_id - UUID ของผู้ใช้
 * @returns {Promise<boolean>}
 */
async function deleteUser(user_id) {
  const { rowCount } = await query(
    `DELETE FROM users WHERE id = $1::uuid`,
    [user_id]
  );
  return rowCount > 0;
}

/**
 * อัปเดตรหัสผ่าน
 * @param {string} user_id - UUID ของผู้ใช้
 * @param {string} hashedPassword - รหัสผ่านที่ hash แล้ว
 * @returns {Promise<object|null>}
 */
async function updatePassword(user_id, hashedPassword) {
  const { rows } = await query(
    `UPDATE users SET password = $2, updated_at = NOW()
     WHERE id = $1::uuid
     RETURNING id, email, role, name`,
    [user_id, hashedPassword]
  );
  return rows[0] || null;
}

/**
 * อัปเดตสถานะผู้ใช้
 * @param {string} user_id - UUID ของผู้ใช้
 * @param {string} status - active หรือ disabled
 * @returns {Promise<object|null>}
 */
async function updateStatus(user_id, status) {
  const { rows } = await query(
    `UPDATE users SET status = $2, updated_at = NOW()
     WHERE id = $1::uuid
     RETURNING id, email, role, name, status, created_at, updated_at`,
    [user_id, status]
  );
  return rows[0] || null;
}

module.exports = {
  normalizeEmail,
  find,
  findById,
  existsByEmail,
  existsByStudentId,
  create,
  findAll,
  updateRole,    
  updateRoleSafe, 
  countAdmins,
  findRoleById,
  getStats,
  setClub, 
  setRole,
  updateProfile,
  updateUser,
  deleteUser,
  updatePassword,
  updateStatus,
};
