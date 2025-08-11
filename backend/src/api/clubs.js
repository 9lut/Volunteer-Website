const { Router } = require('express');
const router = new Router();

const Clubs = require('../persistence/clubs');
const ClubMembers = require('../persistence/club_members');

const { requireAuth } = require('../middlewares/auth');
const authorize = require('../middlewares/authorize');
const optionalAuth = require('../middlewares/optionalAuth');

const toInt = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : NaN;
};

/**
 * Helper: ตรวจสิทธิ์ว่าประธานชมรมคนนี้เห็น/แตะต้อง club นี้ได้ไหม
 * - admin: true เสมอ
 * - president: ได้เฉพาะ club ที่ตัวเองเป็น president ของชมรมนั้น (ผ่าน club_members.role_in_club = 'president')
 */
async function canAccessClub(reqUser, clubId) {
  if (!reqUser) return false;
  if (reqUser.role === 'admin') return true;
  if (reqUser.role === 'president') {
    return await ClubMembers.isPresidentOfClub(reqUser.id, clubId);
  }
  return false;
}

/* =======================
   List clubs
   - admin: เห็นทั้งหมด
   - president: เห็นเฉพาะของตัวเอง
   - include=members เพื่อดึงสมาชิกมาด้วย
   ======================= */
router.get('/', optionalAuth, async (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ message: 'Unauthenticated' });
    if (!['admin', 'president'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    const includeMembers = String(req.query.include || '').includes('members');

    if (req.user.role === 'admin') {
      const list = await Clubs.findAll({ includeMembers });
      return res.json(list);
    }

    // president -> หาคลับที่ตัวเองเป็น president
    const clubIds = await ClubMembers.findClubIdsOfPresident(req.user.id);
    if (clubIds.length === 0) return res.json([]);
    const list = await Clubs.findByIds(clubIds, { includeMembers });
    return res.json(list);
  } catch (e) {
    console.error('GET /api/clubs error:', e);
    return res.status(500).json({ message: 'Failed to get clubs' });
  }
});

/* =======================
   Create club (admin only)
   ======================= */
router.post('/', requireAuth, authorize(['admin']), async (req, res) => {
  try {
    const { name, description } = req.body || {};
    if (!name) return res.status(400).json({ message: 'name is required' });

    const club = await Clubs.create({ name, description: description ?? null });
    return res.status(201).json(club);
  } catch (e) {
    console.error('POST /api/clubs error:', e);
    return res.status(500).json({ message: 'Failed to create club' });
  }
});

/* =======================
   Get club detail
   - admin: ได้ทุกอัน
   - president: ได้เฉพาะของตัวเอง
   ======================= */
router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const id = toInt(req.params.id);
    if (Number.isNaN(id)) return res.status(400).json({ message: 'Invalid id' });
    if (!req.user) return res.status(401).json({ message: 'Unauthenticated' });
    if (!['admin', 'president'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    if (!(await canAccessClub(req.user, id))) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    const includeMembers = String(req.query.include || '').includes('members');
    const club = includeMembers ? await Clubs.findByIdWithMembers(id) : await Clubs.findById(id);
    if (!club) return res.status(404).json({ message: 'Club not found' });

    return res.json(club);
  } catch (e) {
    console.error('GET /api/clubs/:id error:', e);
    return res.status(500).json({ message: 'Failed to get club' });
  }
});

/* =======================
   Update club (admin only)
   ======================= */
router.put('/:id', requireAuth, authorize(['admin']), async (req, res) => {
  try {
    const id = toInt(req.params.id);
    if (Number.isNaN(id)) return res.status(400).json({ message: 'Invalid id' });

    const updated = await Clubs.update(id, {
      name: req.body?.name,
      description: req.body?.description ?? null,
    });
    if (!updated) return res.status(404).json({ message: 'Club not found' });
    return res.json(updated);
  } catch (e) {
    console.error('PUT /api/clubs/:id error:', e);
    return res.status(500).json({ message: 'Failed to update club' });
  }
});

/* =======================
   Delete club (admin only)
   ======================= */
router.delete('/:id', requireAuth, authorize(['admin']), async (req, res) => {
  try {
    const id = toInt(req.params.id);
    if (Number.isNaN(id)) return res.status(400).json({ message: 'Invalid id' });

    const ok = await Clubs.delete(id);
    if (!ok) return res.status(404).json({ message: 'Club not found' });
    return res.json({ message: 'Club deleted' });
  } catch (e) {
    console.error('DELETE /api/clubs/:id error:', e);
    return res.status(500).json({ message: 'Failed to delete club' });
  }
});

/* =======================
   Members (admin only)
   ======================= */
router.get('/:id/members', requireAuth, authorize(['admin', 'president']), async (req, res) => {
  try {
    const id = toInt(req.params.id);
    if (Number.isNaN(id)) return res.status(400).json({ message: 'Invalid id' });

    if (!(await canAccessClub(req.user, id))) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    const members = await ClubMembers.listMembers(id);
    return res.json(members);
  } catch (e) {
    console.error('GET /api/clubs/:id/members error:', e);
    return res.status(500).json({ message: 'Failed to list members' });
  }
});

router.post('/:id/members', requireAuth, authorize(['admin']), async (req, res) => {
  try {
    const id = toInt(req.params.id);
    const { user_id, role_in_club } = req.body || {};
    if (Number.isNaN(id)) return res.status(400).json({ message: 'Invalid id' });
    if (!user_id) return res.status(400).json({ message: 'user_id is required' });

    const added = await ClubMembers.addMember(id, String(user_id), role_in_club || 'member');
    return res.status(201).json(added);
  } catch (e) {
    console.error('POST /api/clubs/:id/members error:', e);
    return res.status(500).json({ message: 'Failed to add member' });
  }
});

router.delete('/:id/members/:userId', requireAuth, authorize(['admin']), async (req, res) => {
  try {
    const id = toInt(req.params.id);
    const userId = String(req.params.userId);
    if (Number.isNaN(id)) return res.status(400).json({ message: 'Invalid id' });

    const ok = await ClubMembers.removeMember(id, userId);
    if (!ok) return res.status(404).json({ message: 'Member not found' });
    return res.json({ message: 'Removed' });
  } catch (e) {
    console.error('DELETE /api/clubs/:id/members/:userId error:', e);
    return res.status(500).json({ message: 'Failed to remove member' });
  }
});

module.exports = router;
