// src/persistence/club_members.js
const { query } = require('./db');

/**
 * userId: UUID ของผู้ใช้
 * clubId: int
 */
async function isPresidentOfClub(userId, clubId) {
  const { rows } = await query(
    `SELECT 1
     FROM club_members
  WHERE club_id = $1 AND user_id = $2::uuid AND role = 'president'
     LIMIT 1`,
    [clubId, userId]
  );
  return !!rows[0];
}

async function findClubIdsOfPresident(userId) {
  const { rows } = await query(
    `SELECT club_id
     FROM club_members
  WHERE user_id = $1::uuid AND role = 'president'`,
    [userId]
  );
  return rows.map(r => r.club_id);
}

async function addMember(clubId, userId, roleInClub = 'member') {
  try {
    const { rows } = await query(
      `INSERT INTO club_members (club_id, user_id, role)
       VALUES ($1, $2, $3)
       ON CONFLICT (club_id, user_id)
       DO UPDATE SET role = EXCLUDED.role
       RETURNING id, club_id, user_id, role`,
      [clubId, userId, roleInClub]
    );
    return rows[0];
  } catch (e) {
    if (String(e.message || '').includes('duplicate key')) {
      const err = new Error('Duplicate');
      err.code = 'DUP';
      throw err;
    }
    throw e;
  }
}

async function removeMember(clubId, userId) {
  const { rowCount } = await query(
  `DELETE FROM club_members WHERE club_id = $1 AND user_id = $2::uuid`,
  [clubId, userId]
  );
  return rowCount > 0;
}

async function listMembers(clubId) {
  // join กับ users เพื่อดึงชื่อ/อีเมล (ถ้ามี)
  const { rows } = await query(
    `SELECT
        cm.user_id AS id,
        u.name,
        u.email,
        cm.role AS role
     FROM club_members cm
     LEFT JOIN users u ON u.id = cm.user_id::uuid
     WHERE cm.club_id = $1
     ORDER BY cm.id ASC`,
    [clubId]
  );
  return rows;
}

async function findClubsByUserId(userId) {
  const { rows } = await query(
    `SELECT
        c.id,
        c.name,
        cm.role AS role
     FROM club_members cm
     JOIN clubs c ON c.id = cm.club_id
     WHERE cm.user_id = $1::uuid
     ORDER BY c.name ASC`,
    [userId]
  );
  return rows;
}

async function removeUserFromAllClubs(userId) {
  const { rowCount } = await query(
    `DELETE FROM club_members WHERE user_id = $1::uuid`,
    [userId]
  );
  return rowCount;
}

module.exports = {
  isPresidentOfClub,
  findClubIdsOfPresident,
  addMember,
  removeMember,
  listMembers,
  findClubsByUserId,
  removeUserFromAllClubs,
};
