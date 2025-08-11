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
     WHERE club_id = $1 AND user_id = $2 AND role_in_club = 'president'
     LIMIT 1`,
    [clubId, userId]
  );
  return !!rows[0];
}

async function findClubIdsOfPresident(userId) {
  const { rows } = await query(
    `SELECT club_id
     FROM club_members
     WHERE user_id = $1 AND role_in_club = 'president'`,
    [userId]
  );
  return rows.map(r => r.club_id);
}

async function addMember(clubId, userId, roleInClub = 'member') {
  try {
    const { rows } = await query(
      `INSERT INTO club_members (club_id, user_id, role_in_club)
       VALUES ($1, $2, $3)
       ON CONFLICT (club_id, user_id)
       DO UPDATE SET role_in_club = EXCLUDED.role_in_club
       RETURNING id, club_id, user_id, role_in_club`,
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
    `DELETE FROM club_members WHERE club_id = $1 AND user_id = $2`,
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
        cm.role_in_club AS role
     FROM club_members cm
     LEFT JOIN users u ON u.id = cm.user_id
     WHERE cm.club_id = $1
     ORDER BY cm.id ASC`,
    [clubId]
  );
  return rows;
}

module.exports = {
  isPresidentOfClub,
  findClubIdsOfPresident,
  addMember,
  removeMember,
  listMembers,
};
