const { Router } = require('express');
const router = new Router();

const Clubs = require('../persistence/clubs');
const ClubMembers = require('../persistence/club_members');

const { requireAuth } = require('../middlewares/auth');
const authorize = require('../middlewares/authorize');
const optionalAuth = require('../middlewares/optionalAuth');

const isValidUuid = (str) => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
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
   Get my clubs (สำหรับ president)
   ======================= */
router.get('/my-clubs', requireAuth, authorize(['president', 'admin']), async (req, res) => {
  try {
    if (req.user.role === 'admin') {
      // admin ดูได้ทั้งหมด
      const list = await Clubs.findAll({ includeMembers: false });
      return res.json(list);
    }

    // president -> หาคลับที่ตัวเองเป็น president
    const clubIds = await ClubMembers.findClubIdsOfPresident(req.user.id);
    if (clubIds.length === 0) return res.json([]);
    
    const list = await Clubs.findByIds(clubIds, { includeMembers: false });
    return res.json(list);
  } catch (e) {
    console.error('GET /api/clubs/my-clubs error:', e);
    return res.status(500).json({ message: 'Failed to get my clubs' });
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
    const id = req.params.id;
    if (!isValidUuid(id)) return res.status(400).json({ message: 'Invalid id' });
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
    const id = req.params.id;
    if (!isValidUuid(id)) return res.status(400).json({ message: 'Invalid id' });

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
    const id = req.params.id;
    if (!isValidUuid(id)) return res.status(400).json({ message: 'Invalid id' });

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
    const id = req.params.id;
    if (!isValidUuid(id)) return res.status(400).json({ message: 'Invalid id' });

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
    const id = req.params.id;
    const { user_id, role_in_club } = req.body || {};
    if (!isValidUuid(id)) return res.status(400).json({ message: 'Invalid id' });
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
    const id = req.params.id;
    const userId = String(req.params.userId);
    if (!isValidUuid(id)) return res.status(400).json({ message: 'Invalid id' });

    const ok = await ClubMembers.removeMember(id, userId);
    if (!ok) return res.status(404).json({ message: 'Member not found' });
    return res.json({ message: 'Removed' });
  } catch (e) {
    console.error('DELETE /api/clubs/:id/members/:userId error:', e);
    return res.status(500).json({ message: 'Failed to remove member' });
  }
});

router.get('/me/president', requireAuth, authorize(['admin','president']), async (req, res) => {
  try {
    if (req.user.role === 'admin') {
      const list = await Clubs.findAll({ includeMembers: false });
      return res.json(list);
    }
    const clubIds = await ClubMembers.findClubIdsOfPresident(req.user.id);
    if (clubIds.length === 0) return res.json([]);
    const list = await Clubs.findByIds(clubIds, { includeMembers: false });
    return res.json(list);
  } catch (e) {
    console.error('GET /api/clubs/me/president error:', e);
    return res.status(500).json({ message: 'Failed to get my clubs' });
  }
});

// President stats with detailed information
router.get('/me/president/stats', requireAuth, authorize(['president']), async (req, res) => {
  try {
    const clubIds = await ClubMembers.findClubIdsOfPresident(req.user.id);
    if (clubIds.length === 0) return res.json([]);
    
    const clubs = await Clubs.findByIds(clubIds, { includeMembers: true });
    const stats = await Promise.all(clubs.map(async (club) => {
      // Get activities for this club
      const { query } = require('../persistence/db');
      const activitiesResult = await query(
        `SELECT id, title, status, start_date, 
                (SELECT COUNT(*) FROM registrations WHERE activity_id = activities.id) as current_participants,
                max_participants, created_at
         FROM activities 
         WHERE club_id = $1 
         ORDER BY created_at DESC`,
        [club.id]
      );
      
      const activities = activitiesResult.rows;
      const totalRegistrations = activities.reduce((sum, a) => sum + parseInt(a.current_participants || 0), 0);
      const recentRegistrations = activities
        .filter(a => new Date(a.created_at) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000))
        .reduce((sum, a) => sum + parseInt(a.current_participants || 0), 0);

      return {
        id: club.id,
        name: club.name,
        description: club.description,
        totalMembers: club.members?.length || 0,
        totalActivities: activities.length,
        pendingActivities: activities.filter(a => a.status === 'pending').length,
        approvedActivities: activities.filter(a => a.status === 'approved').length,
        rejectedActivities: activities.filter(a => a.status === 'rejected').length,
        totalRegistrations,
        recentRegistrations,
        activities: activities.slice(0, 5), // Recent 5 activities
      };
    }));
    
    return res.json(stats);
  } catch (e) {
    console.error('GET /api/clubs/me/president/stats error:', e);
    return res.status(500).json({ message: 'Failed to get president stats' });
  }
});

// Update member role in club
router.patch('/:id/members/:userId/role', requireAuth, authorize(['admin', 'president']), async (req, res) => {
  try {
    const clubId = req.params.id;
    const userId = req.params.userId;
    const { role_in_club } = req.body || {};
    
    if (!isValidUuid(clubId)) return res.status(400).json({ message: 'Invalid club id' });
    if (!userId) return res.status(400).json({ message: 'Invalid user id' });
    if (!['member', 'president'].includes(role_in_club)) {
      return res.status(400).json({ message: 'Invalid role' });
    }

    // Check permissions
    if (req.user.role === 'president') {
      if (!(await canAccessClub(req.user, clubId))) {
        return res.status(403).json({ message: 'Forbidden' });
      }
    }

    await ClubMembers.addMember(clubId, userId, role_in_club);
    return res.json({ message: 'Member role updated successfully' });
  } catch (e) {
    console.error('PATCH /api/clubs/:id/members/:userId/role error:', e);
    return res.status(500).json({ message: 'Failed to update member role' });
  }
});

module.exports = router;
