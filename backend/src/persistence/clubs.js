const { query } = require('./db');

async function create({ name, description = null }) {
  const { rows } = await query(
    `INSERT INTO clubs (name, description)
     VALUES ($1, $2)
     RETURNING id, name, description, created_at, updated_at`,
    [name, description]
  );
  return rows[0];
}

async function findAll({ includeMembers = false } = {}) {
  const { rows } = await query(
    `SELECT id, name, description, created_at, updated_at
     FROM clubs
     ORDER BY id DESC`
  );

  if (!includeMembers) return rows;

  const ids = rows.map(r => r.id);
  if (ids.length === 0) return rows;

  const membersMap = await _membersByClubIds(ids);
  return rows.map(r => ({ ...r, members: membersMap.get(r.id) || [] }));
}

async function findByIds(ids, { includeMembers = false } = {}) {
  if (!ids || ids.length === 0) return [];
  const { rows } = await query(
    `SELECT id, name, description, created_at, updated_at
     FROM clubs
     WHERE id = ANY($1::int[])
     ORDER BY id DESC`,
    [ids]
  );
  if (!includeMembers) return rows;

  const membersMap = await _membersByClubIds(rows.map(r => r.id));
  return rows.map(r => ({ ...r, members: membersMap.get(r.id) || [] }));
}

async function _membersByClubIds(ids) {
  const { rows } = await query(
    `SELECT cm.club_id,
            u.id AS user_id,
            u.name,
            u.email,
            u.role AS user_role,
            cm.role_in_club
     FROM club_members cm
     JOIN users u ON u.id = cm.user_id
     WHERE cm.club_id = ANY($1::int[])
     ORDER BY cm.id ASC`,
    [ids]
  );

  const map = new Map();
  for (const r of rows) {
    const arr = map.get(r.club_id) || [];
    arr.push({
      id: String(r.user_id),
      name: r.name,
      email: r.email,
      role: r.user_role,
      role_in_club: r.role_in_club,
    });
    map.set(r.club_id, arr);
  }
  return map;
}

async function findById(id) {
  const { rows } = await query(
    `SELECT id, name, description, created_at, updated_at
     FROM clubs WHERE id = $1 LIMIT 1`,
    [id]
  );
  return rows[0] || null;
}

async function findByIdWithMembers(id) {
  const club = await findById(id);
  if (!club) return null;
  const members = await listMembers(id);
  return { ...club, members };
}

async function update(id, data) {
  const sets = [];
  const values = [];
  let i = 1;
  for (const k of ['name', 'description']) {
    if (data[k] !== undefined) {
      sets.push(`${k} = $${i++}`);
      values.push(data[k]);
    }
  }
  if (sets.length === 0) return await findById(id);
  values.push(id);

  const { rowCount } = await query(
    `UPDATE clubs
     SET ${sets.join(', ')}, updated_at = NOW()
     WHERE id = $${i}`,
    values
  );
  if (!rowCount) return null;
  return await findById(id);
}

async function _delete(id) {
  const { rowCount } = await query(`DELETE FROM clubs WHERE id = $1`, [id]);
  return rowCount > 0;
}

async function listMembers(clubId) {
  const { rows } = await query(
    `SELECT u.id, u.name, u.email, u.role AS user_role, cm.role_in_club
     FROM club_members cm
     JOIN users u ON u.id = cm.user_id
     WHERE cm.club_id = $1
     ORDER BY cm.id ASC`,
    [clubId]
  );
  return rows.map(r => ({
    id: String(r.id),
    name: r.name,
    email: r.email,
    role: r.user_role,
    role_in_club: r.role_in_club,
  }));
}

module.exports = {
  create,
  findAll,
  findByIds,
  findById,
  findByIdWithMembers,
  update,
  delete: _delete,
  listMembers,
};
