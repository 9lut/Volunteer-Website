// src/persistence/activity_images.js
const { pool, query } = require('./db');

/**
 * เพิ่มรูปหลายไฟล์
 * @param {number} activityId
 * @param {string[]} urls
 * @returns {Promise<Array>}
 */
async function addMany(activityId, urls = []) {
  if (!urls.length) return [];
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const inserted = [];
    for (const u of urls) {
      const { rows } = await client.query(
        `INSERT INTO activity_images (activity_id, image_url)
         VALUES ($1, $2)
         RETURNING id, activity_id, image_url, is_cover, created_at`,
        [activityId, u]
      );
      inserted.push(rows[0]);
    }
    await client.query('COMMIT');
    return inserted;
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

/**
 * เซตรูปปก (is_cover = true) รูปเดียวของ activity นั้น
 * - เคลียร์ is_cover ของรูปอื่นก่อน
 */
async function setCover(activityId, imageId) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // ตรวจสอบว่า imageId เป็นของ activity นี้จริง
    const { rows: chk } = await client.query(
      `SELECT id, activity_id FROM activity_images WHERE id = $1 LIMIT 1`,
      [imageId]
    );
    const img = chk[0];
    if (!img || Number(img.activity_id) !== Number(activityId)) {
      throw Object.assign(new Error('Image not found'), { status: 404 });
    }

    // เคลียร์ของเดิม
    await client.query(
      `UPDATE activity_images SET is_cover = false WHERE activity_id = $1 AND is_cover = true`,
      [activityId]
    );

    // ตั้งรูปใหม่
    const { rows } = await client.query(
      `UPDATE activity_images
       SET is_cover = true
       WHERE id = $1
       RETURNING id, activity_id, image_url, is_cover, created_at`,
      [imageId]
    );

    await client.query('COMMIT');
    return rows[0];
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

/**
 * ดึงรูปตาม activity
 */
async function listByActivity(activityId) {
  const { rows } = await query(
    `SELECT id, activity_id, image_url, is_cover, created_at
     FROM activity_images
     WHERE activity_id = $1
     ORDER BY is_cover DESC, id ASC`,
    [activityId]
  );
  return rows;
}

/**
 * หา image ตาม id
 */
async function findById(id) {
  const { rows } = await query(
    `SELECT id, activity_id, image_url, is_cover, created_at
     FROM activity_images
     WHERE id = $1
     LIMIT 1`,
    [id]
  );
  return rows[0] || null;
}

/**
 * ลบรูป
 */
async function remove(id) {
  const { rowCount } = await query(
    `DELETE FROM activity_images WHERE id = $1`,
    [id]
  );
  return rowCount > 0;
}

module.exports = {
  addMany,
  setCover,
  listByActivity,
  findById,
  remove,
};
