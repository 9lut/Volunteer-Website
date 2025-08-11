// src/persistence/registrations.js
const db = require('./db'); // <-- แก้ path ให้ตรงไฟล์ที่ export pg.Pool

module.exports = {
  /** สร้างการลงทะเบียน (กันซ้ำระดับ DB ด้วย UNIQUE(activity_id, user_id)) */
  async create({ activity_id, user_id }) {
    const q = `
      INSERT INTO registrations (activity_id, user_id)
      VALUES ($1, $2)
      ON CONFLICT (activity_id, user_id) DO NOTHING
      RETURNING id, activity_id, user_id, created_at;
    `;
    const { rows } = await db.query(q, [activity_id, user_id]);
    // ถ้าซ้ำ rows อาจเป็น [] => โยนเป็น 409 ก็ได้ หรือคืน null ก็ได้
    return rows[0] || null;
  },

  /** ยกเลิกการลงทะเบียนของ user ใน activity */
  async cancel({ activity_id, user_id }) {
    const q = `
      DELETE FROM registrations
      WHERE activity_id = $1 AND user_id = $2
      RETURNING id, activity_id, user_id, created_at;
    `;
    const { rows } = await db.query(q, [activity_id, user_id]);
    return rows[0] || null;
  },

  /** เช็คว่าลงทะเบียนไปแล้วหรือยัง */
  async findByActivityAndUser(activity_id, user_id) {
    const q = `
      SELECT id, activity_id, user_id, created_at
      FROM registrations
      WHERE activity_id = $1 AND user_id = $2
      LIMIT 1;
    `;
    const { rows } = await db.query(q, [activity_id, user_id]);
    return rows[0] || null;
  },

  /** รายการของ user */
  async listByUser(user_id) {
    const q = `
      SELECT id, activity_id, user_id, created_at
      FROM registrations
      WHERE user_id = $1
      ORDER BY created_at DESC;
    `;
    const { rows } = await db.query(q, [user_id]);
    return rows;
  },

  /** รายการของ user + join ข้อมูล activity แบบย่อ */
  async listByUserWithActivity(user_id) {
    const q = `
      SELECT
        r.id,
        r.activity_id,
        r.user_id,
        r.created_at,
        a.title,
        a.start_date,
        a.end_date,
        a.location,
        a.status,
        a.cover_url
      FROM registrations r
      JOIN activities a ON a.id = r.activity_id
      WHERE r.user_id = $1
      ORDER BY r.created_at DESC;
    `;
    const { rows } = await db.query(q, [user_id]);
    // แปลงให้อยู่รูปทรงที่ frontend เข้าใจง่าย
    return rows.map(r => ({
      id: r.id,
      activity_id: r.activity_id,
      user_id: r.user_id,
      created_at: r.created_at,
      activity: {
        title: r.title,
        start_date: r.start_date,
        end_date: r.end_date,
        location: r.location,
        status: r.status,
        cover_url: r.cover_url,
      },
    }));
  },

  /** รายการของ activity (ถ้าจำเป็น) */
  async listByActivity(activity_id) {
    const q = `
      SELECT id, activity_id, user_id, created_at
      FROM registrations
      WHERE activity_id = $1
      ORDER BY created_at DESC;
    `;
    const { rows } = await db.query(q, [activity_id]);
    return rows;
  },
};
