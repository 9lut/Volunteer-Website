// src/persistence/activity.js
const { query } = require('./db');

/** แปลงค่าวันที่: null/undefined -> null, อื่น ๆ ส่งต่อ */
function toDate(x) {
  return x == null ? null : x;
}

/** คอลัมน์ฐาน + cover_url (เลือก is_cover ก่อน, ไม่งั้นรูปแรก) */
const BASE_COLS = `
  id, name, description, start_date, end_date, location, max_participants,
  created_by, status, created_at, updated_at, club_id,
  registration_start_date, registration_end_date, registration_deadline,
  start_time, end_time, registration_start_time, registration_end_time,
  COALESCE(
    (
      SELECT ai1.image_url
      FROM activity_images ai1
      WHERE ai1.activity_id = activities.id AND ai1.is_cover = true
      ORDER BY ai1.id DESC
      LIMIT 1
    ),
    (
      SELECT ai2.image_url
      FROM activity_images ai2
      WHERE ai2.activity_id = activities.id
      ORDER BY ai2.id ASC
      LIMIT 1
    )
  ) AS cover_url
`;

/**
 * สร้างกิจกรรม (สถานะเริ่มต้นเป็น pending)
 * @param {Object} data
 * @param {string} data.name
 * @param {string|null} [data.description]
 * @param {string|null} [data.start_date]
 * @param {string|null} [data.end_date]
 * @param {string|null} [data.location]
 * @param {string|number} data.created_by
 * @param {'pending'|'approved'|'rejected'} [data.status]
 * @param {number|null} [data.club_id]
 * @param {string|null} [data.registration_start_date]
 * @param {string|null} [data.registration_end_date]
 * @param {string|null} [data.start_time]
 * @param {string|null} [data.end_time]
 * @param {string|null} [data.registration_start_time]
 * @param {string|null} [data.registration_end_time]
 */
async function create(data) {
  const {
    name,
    description = null,
    start_date = null,
    end_date = null,
    location = null,
    max_participants = 10,
    created_by,
    status = 'pending',
    club_id = null,
    registration_start_date = null,
    registration_end_date = null,
    start_time = null,
    end_time = null,
    registration_start_time = null,
    registration_end_time = null,
  } = data;

  const { rows } = await query(
    `INSERT INTO activities (
       name, description, start_date, end_date, location, max_participants, 
       created_by, status, club_id, registration_start_date, registration_end_date,
       start_time, end_time, registration_start_time, registration_end_time
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
     RETURNING id`,
    [
      name, description, toDate(start_date), toDate(end_date), location, max_participants,
      created_by, status, club_id, toDate(registration_start_date), toDate(registration_end_date),
      start_time, end_time, registration_start_time, registration_end_time
    ]
  );

  const newId = rows[0]?.id;
  return await findById(newId);
}

/**
 * ดึงรายการกิจกรรม
 * @param {Object} filters
 * @param {'approved'|'pending'|'rejected'|'all'} [filters.status]
 * @param {number} [filters.limit]
 * @param {'created_at'|'updated_at'|'start_date'|'id'} [filters.sort]
 * @param {number|null} [filters.club_id]  // ถ้ากำหนด จะกรองเฉพาะชมรมนั้น
 */
async function findAll({ status = 'approved', limit = 0, sort = '', club_id = null } = {}) {
  const params = [];
  const where = [];
  let sql = `SELECT ${BASE_COLS} FROM activities`;

  if (status && status !== 'all') {
    params.push(status);
    where.push(`status = $${params.length}`);
  }

  if (Array.isArray(club_id) && club_id.length > 0) {
    const placeholders = club_id.map((_, i) => `$${params.length + i + 1}`).join(',');
    params.push(...club_id);
    where.push(`club_id IN (${placeholders})`);
  } else if (club_id) {
    params.push(club_id);
    where.push(`club_id = $${params.length}`);
  }

  if (where.length) sql += ` WHERE ${where.join(' AND ')}`;

  // allowlist คอลัมน์สำหรับ sort
  const allowSort = new Set(['created_at', 'updated_at', 'start_date', 'id']);
  const orderCol = allowSort.has(sort) ? sort : 'id';
  const orderExpr = orderCol === 'start_date' ? 'COALESCE(start_date, created_at)' : orderCol;

  sql += ` ORDER BY ${orderExpr} DESC, id DESC`;

  if (limit && Number.isFinite(limit) && limit > 0) {
    params.push(limit);
    sql += ` LIMIT $${params.length}`;
  }

  const { rows } = await query(sql, params);
  return rows;
}

/** ดึงกิจกรรมตาม id */
async function findById(id) {
  const { rows } = await query(
    `SELECT ${BASE_COLS} FROM activities WHERE id = $1 LIMIT 1`,
    [id]
  );
  return rows[0] || null;
}

/** อัปเดตกิจกรรม (อนุญาตเฉพาะฟิลด์ที่กำหนด) */
async function update(id, data, _actor) {
  const allowed = [
    'name', 'description', 'start_date', 'end_date', 'location', 'max_participants',
    'registration_start_date', 'registration_end_date', 
    'start_time', 'end_time', 'registration_start_time', 'registration_end_time'
  ];
  const sets = [];
  const values = [];
  let i = 1;

  for (const k of allowed) {
    if (data[k] !== undefined) {
      let v = data[k];
      if (k.includes('date')) v = toDate(v);
      sets.push(`${k} = $${i++}`);
      values.push(v);
    }
  }

  if (sets.length === 0) {
    return await findById(id);
  }

  sets.push(`updated_at = NOW()`);
  values.push(id);

  const { rowCount } = await query(
    `UPDATE activities
     SET ${sets.join(', ')}
     WHERE id = $${i}`,
    values
  );

  if (!rowCount) return null;
  return await findById(id);
}

/**
 * ตั้งรูปปกของกิจกรรม
 * - ตรวจสอบว่า imageId อยู่ใน activityId
 * - เคลียร์ is_cover ทั้งหมดของกิจกรรม
 * - ตั้งรูปที่เลือกให้ is_cover = true
 * - คืน activity พร้อม cover_url ใหม่ (ผ่าน BASE_COLS)
 */
async function setCover(activityId, imageId) {
  // ตรวจว่ารูปเป็นของกิจกรรมนี้จริง
  const img = await query(
    `SELECT id FROM activity_images WHERE id = $1 AND activity_id = $2 LIMIT 1`,
    [imageId, activityId]
  );
  if (!img.rows[0]) {
    const err = new Error('Image not found');
    err.code = 'NOT_FOUND';
    throw err;
  }

  // เคลียร์รูปปกเดิม
  await query(`UPDATE activity_images SET is_cover = false WHERE activity_id = $1`, [activityId]);

  // ตั้งรูปใหม่เป็นปก
  const { rowCount } = await query(
    `UPDATE activity_images SET is_cover = true WHERE id = $1 AND activity_id = $2`,
    [imageId, activityId]
  );
  if (!rowCount) {
    const err = new Error('Failed to set cover');
    err.code = 'UPDATE_FAILED';
    throw err;
  }

  return await findById(activityId);
}

/** เปลี่ยนสถานะกิจกรรม */
async function setStatus(id, status) {
  const { rowCount } = await query(
    `UPDATE activities
     SET status = $2, updated_at = NOW()
     WHERE id = $1`,
    [id, status]
  );
  if (!rowCount) return null;
  return await findById(id);
}

/** ลบกิจกรรม */
async function _delete(id) {
  const { rowCount } = await query(`DELETE FROM activities WHERE id = $1`, [id]);
  return rowCount > 0;
}

/**
 * สถิติแบบง่าย
 * @param {{ club_id?: number|null }} [opts]
 */
async function getStats({ club_id = null } = {}) {
  const where = [];
  const params = [];
  if (club_id) {
    params.push(club_id);
    where.push(`club_id = $${params.length}`);
  }
  const WH = where.length ? `WHERE ${where.join(' AND ')}` : '';

  const total    = await query(`SELECT COUNT(*)::int AS c FROM activities ${WH}`, params);
  const approved = await query(`SELECT COUNT(*)::int AS c FROM activities ${WH} AND status='approved'`, params);
  const pending  = await query(`SELECT COUNT(*)::int AS c FROM activities ${WH} AND status='pending'`, params);
  const rejected = await query(`SELECT COUNT(*)::int AS c FROM activities ${WH} AND status='rejected'`, params);

  return {
    total   : total.rows[0].c,
    approved: approved.rows[0].c,
    pending : pending.rows[0].c,
    rejected: rejected.rows[0].c,
  };
}

module.exports = {
  create,
  findAll,
  findById,
  update,
  setStatus,
  delete: _delete,
  getStats,
  setCover,
};
