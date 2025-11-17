// src/persistence/registrations.js
const db = require('./db'); // <-- แก้ path ให้ตรงไฟล์ที่ export pg.Pool

module.exports = {
  /** สร้างการลงทะเบียน - ตรวจสอบโหมดการอนุมัติของกิจกรรม */
  async create({ activity_id, user_id }) {
    // ตรวจสอบว่าลงทะเบียนแล้วหรือยัง
    const existingQ = `SELECT id FROM registrations WHERE activity_id = $1 AND user_id = $2`;
    const { rows: existing } = await db.query(existingQ, [activity_id, user_id]);
    
    if (existing.length > 0) {
      console.log('Registration already exists:', existing[0]);
      return null; // ลงทะเบียนแล้ว
    }
    
    // ดึงข้อมูลกิจกรรม (max_participants และ approval_mode)
    const activityQ = `SELECT max_participants, approval_mode FROM activities WHERE id = $1`;
    const { rows: activityRows } = await db.query(activityQ, [activity_id]);
    const activity = activityRows[0];
    
    if (!activity) {
      console.error('Activity not found:', activity_id);
      return null;
    }
    
    const approvalMode = activity.approval_mode || 'manual';
    let initialStatus = 'pending'; // default: รอแอดมิน/ประธานอนุมัติ
    let approvedBy = null;
    let approvedAt = null;
    
    // ถ้าเป็นโหมด auto (First Come First Served)
    if (approvalMode === 'auto') {
      // นับจำนวนผู้เข้าร่วมที่อนุมัติแล้ว
      const countQ = `SELECT COUNT(*) as count FROM registrations WHERE activity_id = $1 AND status = 'approved'`;
      const { rows: countRows } = await db.query(countQ, [activity_id]);
      const currentCount = parseInt(countRows[0].count || 0);
      
      // ถ้ายังไม่เต็ม → อนุมัติอัตโนมัติ
      if (!activity.max_participants || currentCount < activity.max_participants) {
        initialStatus = 'approved';
        approvedBy = user_id; // อนุมัติโดยตัวเอง (auto)
        approvedAt = 'NOW()';
      }
      // ถ้าเต็มแล้ว → pending (รอให้มีคนยกเลิก)
    }
    
    const q = `
      INSERT INTO registrations (activity_id, user_id, status, approved_at, approved_by)
      VALUES ($1, $2, $3, ${approvedAt || 'NULL'}, ${approvedBy ? '$4' : 'NULL'})
      RETURNING id, activity_id, user_id, status, created_at, approved_at, approved_by;
    `;
    const params = approvedBy ? [activity_id, user_id, initialStatus, approvedBy] : [activity_id, user_id, initialStatus];
    const { rows } = await db.query(q, params);
    console.log(`Registration created [mode=${approvalMode}] with status '${initialStatus}':`, rows[0]);
    return rows[0];
  },

  /** ยกเลิกการลงทะเบียนของ user ใน activity */
  async cancel({ activity_id, user_id }) {
    const q = `
      DELETE FROM registrations
      WHERE activity_id = $1 AND user_id = $2::uuid
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
      WHERE activity_id = $1 AND user_id = $2::uuid
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
      WHERE user_id = $1::uuid
      ORDER BY created_at DESC;
    `;
    const { rows } = await db.query(q, [user_id]);
    return rows;
  },

  /** รายการของ user + join ข้อมูล activity แบบย่อ พร้อมข้อมูลผู้อนุมัติ */
  async listByUserWithActivity(user_id) {
    // ขั้นที่ 1: ดึง registrations ของ user
    const regQ = `
      SELECT id, activity_id, user_id, created_at, updated_at, status, approved_by, approved_at, rejection_reason
      FROM registrations
      WHERE user_id = $1::uuid
      ORDER BY created_at DESC;
    `;
    const { rows: registrations } = await db.query(regQ, [user_id]);
    
    if (!registrations.length) return [];
    
    // ขั้นที่ 2: ดึง activity data สำหรับแต่ละ registration
    const results = [];
    for (const reg of registrations) {
      let activity = null;
      let approver = null;
      
      // ดึงข้อมูล activity
      if (reg.activity_id) {
        const actQ = `
          SELECT id, name, description, start_date, end_date, location, image_url, max_participants, club_id, created_by,
                 (SELECT COUNT(*) FROM registrations WHERE activity_id = $1 AND status = 'approved') as current_participants
          FROM activities WHERE id = $1
        `;
        const { rows: actRows } = await db.query(actQ, [reg.activity_id]);
        activity = actRows[0] || null;
      }
      
      // ดึงข้อมูล approver
      if (reg.approved_by) {
        const approverQ = `SELECT id, email, name, role FROM users WHERE id = $1::uuid`;
        const { rows: approverRows } = await db.query(approverQ, [reg.approved_by]);
        approver = approverRows[0] || null;
      }
      
      results.push({
        id: reg.id,
        activity_id: reg.activity_id,
        user_id: reg.user_id,
        created_at: reg.created_at,
        updated_at: reg.updated_at,
        status: reg.status || 'pending',
        approved_by: reg.approved_by,
        approved_at: reg.approved_at,
        rejection_reason: reg.rejection_reason,
        activity: activity,
        approver: approver,
      });
    }
    
    return results;
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

  /** รายการของ activity พร้อมข้อมูลผู้ใช้แบบละเอียด */
  async listByActivityWithUsers(activity_id) {
    const q = `
      SELECT 
        r.id, r.activity_id, r.user_id, r.created_at, r.status,
        r.approved_by, r.approved_at, r.rejection_reason, r.updated_at,
        u.email, u.name, u.role, u.student_id, u.faculty, u.major, 
        u.birth_date, u.year_level, u.phone,
        json_build_object(
          'id', u.id,
          'email', u.email,
          'name', u.name,
          'role', u.role,
          'student_id', u.student_id,
          'faculty', u.faculty,
          'major', u.major,
          'birth_date', u.birth_date,
          'year_level', u.year_level,
          'phone', u.phone
        ) as user
      FROM registrations r
      JOIN users u ON u.id = r.user_id
      WHERE r.activity_id = $1
      ORDER BY r.created_at DESC;
    `;
    const { rows } = await db.query(q, [activity_id]);
    return rows;
  },

  /** อนุมัติการลงทะเบียน */
  async approveRegistration(registrationId, approvedBy) {
    const q = `
      UPDATE registrations
      SET status = 'approved',
          approved_by = $2,
          approved_at = NOW(),
          updated_at = NOW()
      WHERE id = $1
      RETURNING id, activity_id, user_id, status, approved_by, approved_at, created_at, updated_at;
    `;
    const { rows } = await db.query(q, [registrationId, approvedBy]);
    return rows[0] || null;
  },

  /** ปฏิเสธการลงทะเบียน */
  async rejectRegistration(registrationId, rejectedBy, reason = null) {
    const q = `
      UPDATE registrations
      SET status = 'rejected',
          approved_by = $2,
          approved_at = NOW(),
          rejection_reason = $3,
          updated_at = NOW()
      WHERE id = $1
      RETURNING id, activity_id, user_id, status, approved_by, approved_at, rejection_reason, created_at, updated_at;
    `;
    const { rows } = await db.query(q, [registrationId, rejectedBy, reason]);
    return rows[0] || null;
  },

  /** อนุมัติการลงทะเบียนที่รออยู่ทั้งหมดในกิจกรรม */
  async approveAllPending(activityId, approvedBy) {
    const q = `
      UPDATE registrations
      SET status = 'approved',
          approved_by = $2,
          approved_at = NOW(),
          updated_at = NOW()
      WHERE activity_id = $1 AND status = 'pending'
      RETURNING id;
    `;
    const { rows } = await db.query(q, [activityId, approvedBy]);
    return { count: rows.length, ids: rows.map(r => r.id) };
  },

  /** ปฏิเสธการลงทะเบียนที่รออยู่ทั้งหมดในกิจกรรม */
  async rejectAllPending(activityId, rejectedBy, reason = null) {
    const q = `
      UPDATE registrations
      SET status = 'rejected',
          approved_by = $2,
          approved_at = NOW(),
          rejection_reason = $3,
          updated_at = NOW()
      WHERE activity_id = $1 AND status = 'pending'
      RETURNING id;
    `;
    const { rows } = await db.query(q, [activityId, rejectedBy, reason]);
    return { count: rows.length, ids: rows.map(r => r.id) };
  },

  /** รีเซ็ตสถานะการลงทะเบียนเป็น pending */
  async resetRegistration(registrationId) {
    const q = `
      UPDATE registrations
      SET status = 'pending',
          approved_by = NULL,
          approved_at = NULL,
          rejection_reason = NULL,
          updated_at = NOW()
      WHERE id = $1
      RETURNING id, activity_id, user_id, status, created_at, updated_at;
    `;
    const { rows } = await db.query(q, [registrationId]);
    return rows[0] || null;
  },
};
