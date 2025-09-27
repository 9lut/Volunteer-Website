// src/api/activities.js
const { Router } = require('express');
const router = new Router();

const Activity = require('../persistence/activity');
const Reg = require('../persistence/registrations');
const Images = require('../persistence/activity_images');
const ClubMembers = require('../persistence/club_members');

const { requireAuth } = require('../middlewares/auth');
const authorize = require('../middlewares/authorize');
const optionalAuth = require('../middlewares/optionalAuth');
const upload = require('../middlewares/uploadImage');

// ------------------------
// helpers
// ------------------------
const toInt = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : NaN;
};

function isValidUuid(str) {
  if (!str || typeof str !== 'string') return false;
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
}

function isAdmin(user) {
  return user?.role === 'admin';
}
function isPresident(user) {
  return user?.role === 'president';
}

/** ตรวจสิทธิ์ว่าจัดการ activity นี้ได้ไหม (admin = ได้ทั้งหมด, president = ได้เฉพาะชมรมตัวเอง) */
async function canManageActivity(activity, user) {
  if (!user) return false;
  if (isAdmin(user)) return true;
  if (isPresident(user)) {
    if (!activity?.club_id) return false;
    return await ClubMembers.isPresidentOfClub(user.id, activity.club_id);
  }
  return false;
}

/** โหลดกิจกรรม + เช็คสิทธิ์ (ใช้กับ put/delete/cover/upload/delete image) */
async function loadAndAuthorizeManage(id, user) {
  const activity = await Activity.findById(id);
  if (!activity) return { error: { code: 404, message: 'Activity not found' } };
  if (!(await canManageActivity(activity, user))) {
    return { error: { code: 403, message: 'Forbidden' } };
  }
  return { activity };
}

// =======================
// Create
// =======================
router.post(
  '/',
  requireAuth,
  authorize(['admin', 'president']),
  async (req, res) => {
    try {
      const {
        name,
        description,
        start_date,
        end_date,
        location,
        max_participants,
        club_id: reqClubId, // admin อาจส่งมากำหนดชมรม
      } = req.body || {};
      if (!name) return res.status(400).json({ message: 'name is required' });

      // ผูก club_id:
      // - admin: ใช้ค่าที่ส่งมา (ถ้าไม่ส่งมาก็เป็น null ได้)
      // - president: กำหนดจากชมรมที่ตัวเองเป็นประธาน (ต้องมีและ 1 ชมรม)
      let club_id = null;
      if (isAdmin(req.user)) {
        club_id = reqClubId ?? null;
      } else if (isPresident(req.user)) {
        const clubIds = await ClubMembers.findClubIdsOfPresident(req.user.id);
        if (!clubIds || clubIds.length === 0) {
          return res.status(400).json({ message: 'President has no club assigned' });
        }
        // สมมติว่าหนึ่งประธานต่อหนึ่งชมรมตาม requirement
        club_id = clubIds[0];
      }

      const activity = await Activity.create({
        name,
        description: description ?? null,
        start_date: start_date ?? null,
        end_date: end_date ?? null,
        location: location ?? null,
        max_participants: max_participants ?? 10,
        created_by: req.user.id,
        status: 'pending',
        club_id,
      });

      return res.status(201).json(activity);
    } catch (error) {
      console.error('POST /api/activities error:', error);
      return res.status(500).json({ message: 'Failed to create activity' });
    }
  }
);

// =======================
// Read (list / stats)
// =======================
// หมายเหตุ:
// - public (ไม่ล็อกอิน) เห็นเฉพาะ approved เท่านั้น
// - admin เห็นได้ทั้งหมด
// - president เห็นเฉพาะกิจกรรมของชมรมตัวเอง (ไม่ว่าจะขอสถานะไหน)
router.get('/', optionalAuth, async (req, res) => {
  try {
    const raw = String(req.query.status || 'approved').toLowerCase();
    const allowed = new Set(['approved', 'pending', 'rejected', 'all']);
    const status = allowed.has(raw) ? raw : 'approved';

    // ถ้าไม่ใช่ approved ต้องเป็นผู้มีสิทธิ์
    if (status !== 'approved') {
      if (!req.user) return res.status(401).json({ message: 'Unauthenticated' });
      if (!['admin', 'president'].includes(req.user.role)) {
        return res.status(403).json({ message: 'Forbidden' });
      }
    }

    const limit = Math.min(parseInt(String(req.query.limit || '0'), 10) || 0, 100);
    const sort = String(req.query.sort || '');
    
    // Additional filtering parameters
    const searchText = req.query.search ? String(req.query.search).trim() : '';
    const location = req.query.location ? String(req.query.location).trim() : '';
    const dateStart = req.query.dateStart ? String(req.query.dateStart) : '';
    const dateEnd = req.query.dateEnd ? String(req.query.dateEnd) : '';
    const clubId = req.query.clubId ? String(req.query.clubId) : '';

    // กรณี admin: เห็นทั้งหมด (ไม่กรองชมรม)
    // กรณี president: 
    //   - ถ้าขอ status = approved → เห็นกิจกรรมทั้งหมดที่ approved (เหมือน public)
    //   - ถ้าขอ status อื่น → กรองเฉพาะชมรมตัวเอง (สำหรับจัดการ)
    let clubFilter = null;
    if (isPresident(req.user) && status !== 'approved') {
      const clubIds = await ClubMembers.findClubIdsOfPresident(req.user.id);
      if (!clubIds || clubIds.length === 0) {
        return res.json([]); // ประธานที่ยังไม่ได้ผูกชมรม → ไม่เห็นกิจกรรมใด ๆ
      }
      clubFilter = clubIds;
    }

    // ถ้ามี clubId filter และไม่ขัดแย้งกับสิทธิ์
    if (clubId && isValidUuid(clubId)) {
      if (clubFilter) {
        // ตรวจสอบว่า clubId ที่ขออยู่ในรายการที่มีสิทธิ์หรือไม่
        if (clubFilter.includes(clubId)) {
          clubFilter = [clubId];
        } else {
          return res.json([]); // ไม่มีสิทธิ์ดูชมรมนี้
        }
      } else {
        clubFilter = [clubId];
      }
    }

    const list = await Activity.findAll({
      status,
      limit,
      sort,
      club_id: clubFilter,
      search: searchText,
      location: location,
      dateStart: dateStart,
      dateEnd: dateEnd,
    });

    return res.json(list);
  } catch (e) {
    console.error('GET /api/activities error:', e);
    return res.status(500).json({ message: 'Failed to get activities' });
  }
});

// ต้องวางไว้ก่อน /:id
router.get('/stats', requireAuth, authorize(['admin', 'president']), async (req, res) => {
  try {
    // admin: รวมทั้งหมด, president: จำกัดชมรมตัวเอง
    const club_id = isPresident(req.user) ? (req.user.club_id ?? null) : null;
    const stats = await Activity.getStats({ club_id });
    return res.json(stats);
  } catch (error) {
    console.error('GET /api/activities/stats error:', error);
    return res.status(500).json({ message: 'Failed to get stats' });
  }
});

// Get filter options (clubs and locations)
router.get('/filters', async (req, res) => {
  try {
    const [clubs, locations] = await Promise.all([
      Activity.getActiveClubs(),
      Activity.getActiveLocations()
    ]);
    
    return res.json({
      clubs: clubs || [],
      locations: locations || []
    });
  } catch (e) {
    console.error('GET /api/activities/filters error:', e);
    return res.status(500).json({ message: 'Failed to get filter options' });
  }
});

// =======================
// Images (upload/list/delete/cover)
// *** วาง block นี้ก่อนทุก route ที่เป็น "/:id"
// =======================

// อัปโหลดหลายรูป
router.post(
  '/:id/images',
  requireAuth,
  authorize(['admin', 'president']),
  upload.array('images', 8),
  async (req, res) => {
    try {
      const id = toInt(req.params.id);
      if (Number.isNaN(id)) return res.status(400).json({ message: 'Invalid id' });

      // โหลด + เช็คสิทธิ์
      const { activity, error } = await loadAndAuthorizeManage(id, req.user);
      if (error) return res.status(error.code).json({ message: error.message });

      const files = req.files || [];
      if (!files.length) return res.status(400).json({ message: 'No files uploaded' });

      const urls = files.map((f) => `/uploads/${f.filename}`);
      const inserted = await Images.addMany(activity.id, urls);
      return res.status(201).json(inserted);
    } catch (e) {
      console.error('POST /api/activities/:id/images error:', e);
      return res.status(500).json({ message: 'Failed to upload images' });
    }
  }
);

// ตั้งรูปเป็นปก
const setCoverHandler = async (req, res) => {
  try {
    const activityId = toInt(req.params.id);
    const imageId = toInt(req.params.imageId);
    if (Number.isNaN(activityId) || Number.isNaN(imageId)) {
      return res.status(400).json({ message: 'Invalid id' });
    }

    // โหลด + เช็คสิทธิ์
    const { activity, error } = await loadAndAuthorizeManage(activityId, req.user);
    if (error) return res.status(error.code).json({ message: error.message });

    const updated = await Activity.setCover(activity.id, imageId);
    if (!updated) return res.status(404).json({ message: 'Activity not found' });

    const act = await Activity.findById(activity.id);
    return res.json(act);
  } catch (e) {
    console.error('SET COVER error:', e);
    return res.status(500).json({ message: 'Failed to set cover image' });
  }
};

router.post(
  '/:id/images/:imageId/cover',
  requireAuth,
  authorize(['admin', 'president']),
  setCoverHandler
);
router.patch(
  '/:id/images/:imageId/cover',
  requireAuth,
  authorize(['admin', 'president']),
  setCoverHandler
);

// รายการรูปของกิจกรรม (public)
router.get('/:id/images', async (req, res) => {
  try {
    const id = toInt(req.params.id);
    if (Number.isNaN(id)) return res.status(400).json({ message: 'Invalid id' });

    const list = await Images.listByActivity(id);
    return res.json(list);
  } catch (e) {
    console.error('GET /api/activities/:id/images error:', e);
    return res.status(500).json({ message: 'Failed to list images' });
  }
});

// ลบรูป
router.delete(
  '/:id/images/:imageId',
  requireAuth,
  authorize(['admin', 'president']),
  async (req, res) => {
    try {
      const activityId = toInt(req.params.id);
      const imageId = toInt(req.params.imageId);
      if (Number.isNaN(activityId) || Number.isNaN(imageId)) {
        return res.status(400).json({ message: 'Invalid id' });
      }

      // โหลด + เช็คสิทธิ์
      const { activity, error } = await loadAndAuthorizeManage(activityId, req.user);
      if (error) return res.status(error.code).json({ message: error.message });

      const ok = await Images.remove(imageId);
      if (!ok) return res.status(404).json({ message: 'Image not found' });

      return res.json({ message: 'Deleted' });
    } catch (e) {
      console.error('DELETE /api/activities/:id/images/:imageId error:', e);
      return res.status(500).json({ message: 'Failed to delete image' });
    }
  }
);

// =======================
// Read (detail)
// =======================
router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const id = toInt(req.params.id);
    if (!id) return res.status(400).json({ message: 'Invalid id' });

    const activity = await Activity.findById(id);
    if (!activity) return res.status(404).json({ message: 'Activity not found' });

    // ซ่อนกิจกรรมที่ยังไม่ approved จากผู้ใช้ทั่วไป
    if (activity.status !== 'approved') {
      if (!req.user || !['admin', 'president'].includes(req.user.role)) {
        return res.status(404).json({ message: 'Activity not found' });
      }
      // president เห็นเฉพาะชมรมตัวเอง
      if (isPresident(req.user) && activity.club_id !== req.user.club_id) {
        return res.status(404).json({ message: 'Activity not found' });
      }
    }

    return res.json(activity);
  } catch (error) {
    console.error('GET /api/activities/:id error:', error);
    return res.status(500).json({ message: 'Failed to get activity' });
  }
});

// =======================
// Update / Delete
// =======================
router.put('/:id', requireAuth, authorize(['admin', 'president']), async (req, res) => {
  try {
    const id = toInt(req.params.id);
    if (!id) return res.status(400).json({ message: 'Invalid id' });

    // โหลด + เช็คสิทธิ์
    const { error } = await loadAndAuthorizeManage(id, req.user);
    if (error) return res.status(error.code).json({ message: error.message });

    const updated = await Activity.update(id, req.body, req.user);
    if (!updated) return res.status(404).json({ message: 'Activity not found' });
    return res.json(updated);
  } catch (error) {
    console.error('PUT /api/activities/:id error:', error);
    return res.status(500).json({ message: 'Failed to update activity' });
  }
});

// ลบ: แอดมินลบได้ทั้งหมด / ประธานลบได้เฉพาะของชมรมตัวเอง
router.delete('/:id', requireAuth, authorize(['admin', 'president']), async (req, res) => {
  try {
    const id = toInt(req.params.id);
    if (!id) return res.status(400).json({ message: 'Invalid id' });

    // โหลด + เช็คสิทธิ์
    const { error } = await loadAndAuthorizeManage(id, req.user);
    if (error) return res.status(error.code).json({ message: error.message });

    const ok = await Activity.delete(id);
    if (!ok) return res.status(404).json({ message: 'Activity not found' });
    return res.json({ message: 'Activity deleted' });
  } catch (error) {
    console.error('DELETE /api/activities/:id error:', error);
    return res.status(500).json({ message: 'Failed to delete activity' });
  }
});

// =======================
// Approve / Reject / Status
// =======================
// อนุมัติ/ไม่อนุมัติ: admin เท่านั้น
router.patch('/:id/approve', requireAuth, authorize(['admin']), async (req, res) => {
  try {
    const id = toInt(req.params.id);
    if (!id) return res.status(400).json({ message: 'Invalid id' });

    const updated = await Activity.setStatus(id, 'approved');
    if (!updated) return res.status(404).json({ message: 'Activity not found' });
    return res.json(updated);
  } catch (error) {
    console.error('PATCH /api/activities/:id/approve error:', error);
    return res.status(500).json({ message: 'Failed to approve activity' });
  }
});

router.patch('/:id/reject', requireAuth, authorize(['admin']), async (req, res) => {
  try {
    const id = toInt(req.params.id);
    if (!id) return res.status(400).json({ message: 'Invalid id' });

    const updated = await Activity.setStatus(id, 'rejected');
    if (!updated) return res.status(404).json({ message: 'Activity not found' });
    return res.json(updated);
  } catch (error) {
    console.error('PATCH /api/activities/:id/reject error:', error);
    return res.status(500).json({ message: 'Failed to reject activity' });
  }
});

// เปลี่ยนสถานะตามค่า (admin เท่านั้น)
router.patch('/:id/status', requireAuth, authorize(['admin']), async (req, res) => {
  try {
    const id = toInt(req.params.id);
    const { status } = req.body || {};
    if (!id) return res.status(400).json({ message: 'Invalid id' });
    if (!status) return res.status(400).json({ message: 'status is required' });

    const allowed = new Set(['pending', 'approved', 'rejected']);
    if (!allowed.has(String(status))) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    const updated = await Activity.setStatus(id, status);
    if (!updated) return res.status(404).json({ message: 'Activity not found' });

    return res.json(updated);
  } catch (e) {
    console.error('PATCH /api/activities/:id/status error:', e);
    return res.status(500).json({ message: 'Failed to change status' });
  }
});

// =======================
// Registration
// =======================
router.post('/:id/register', requireAuth, authorize(['student', 'president', 'admin']), async (req, res) => {
  try {
    const id = toInt(req.params.id);
    if (!id) return res.status(400).json({ message: 'Invalid id' });

    console.log('Registration attempt:', { activity_id: id, user_id: req.user.id, user_role: req.user.role });

    const activity = await Activity.findById(id);
    if (!activity) return res.status(404).json({ message: 'Activity not found' });

    if (activity.status !== 'approved' && req.user.role === 'student') {
      return res.status(403).json({ message: 'Activity is not open for registration' });
    }

    try {
      const reg = await Reg.create({ activity_id: id, user_id: req.user.id });
      if (!reg) {
        console.log('Registration failed - already exists:', { activity_id: id, user_id: req.user.id });
        return res.status(409).json({ message: 'คุณสมัครกิจกรรมนี้แล้ว' });
      }
      console.log('Registration successful:', reg);
      return res.status(201).json(reg);
    } catch (err) {
      console.error('Registration database error:', err);
      return res.status(500).json({ message: 'Failed to register' });
    }
  } catch (e) {
    console.error('POST /api/activities/:id/register error:', e);
    return res.status(500).json({ message: 'Failed to register' });
  }
});

router.delete('/:id/register', requireAuth, authorize(['student', 'president', 'admin']), async (req, res) => {
  try {
    const id = toInt(req.params.id);
    if (Number.isNaN(id)) return res.status(400).json({ message: 'Invalid id' });

    const activity = await Activity.findById(id);
    if (!activity) return res.status(404).json({ message: 'Activity not found' });

    const cancelled = await Reg.cancel({ activity_id: id, user_id: req.user.id });
    if (!cancelled) return res.status(404).json({ message: 'Registration not found' });

    return res.json(cancelled);
  } catch (e) {
    console.error('DELETE /api/activities/:id/register error:', e);
    return res.status(500).json({ message: 'Failed to cancel registration' });
  }
});

// รายชื่อผู้สมัครของกิจกรรม (admin: ทั้งหมด, president: เฉพาะกิจกรรมในชมรมตัวเอง)
router.get('/:id/registrations', requireAuth, authorize(['admin','president']), async (req, res) => {
  try {
    const id = toInt(req.params.id);
    if (Number.isNaN(id)) return res.status(400).json({ message: 'Invalid id' });

    const activity = await Activity.findById(id);
    if (!activity) return res.status(404).json({ message: 'Activity not found' });

    // president ต้องเป็นประธานของชมรมที่จัดกิจกรรมนี้เท่านั้น
    if (req.user.role === 'president') {
      console.log('President check:', {
        userId: req.user.id,
        activityClubId: activity.club_id,
        userRole: req.user.role
      });
      
      if (!activity.club_id) {
        console.log('Activity has no club_id');
        return res.status(403).json({ message: 'Activity not associated with any club' });
      }
      
      if (!req.user.id) {
        console.log('User has no id');
        return res.status(403).json({ message: 'User ID missing' });
      }
      
      const isPresident = await ClubMembers.isPresidentOfClub(req.user.id, activity.club_id);
      console.log('Is president check result:', isPresident);
      
      if (!isPresident) {
        return res.status(403).json({ message: 'Not president of this club' });
      }
    }

    const rows = await Reg.listByActivityWithUsers(id);
    return res.json(rows);
  } catch (e) {
    console.error('GET /api/activities/:id/registrations error:', e);
    return res.status(500).json({ message: 'Failed to list registrations' });
  }
});

// รายชื่อผู้สมัครของกิจกรรม (CSV)
router.get('/:id/registrations.csv', requireAuth, authorize(['admin','president']), async (req, res) => {
  try {
    const id = toInt(req.params.id);
    if (Number.isNaN(id)) return res.status(400).send('Invalid id');

    const activity = await Activity.findById(id);
    if (!activity) return res.status(404).send('Activity not found');

    if (req.user.role === 'president') {
      if (!activity.club_id || !req.user.id || !(await ClubMembers.isPresidentOfClub(req.user.id, activity.club_id))) {
        return res.status(403).send('Forbidden');
      }
    }

    const rows = await Reg.listByActivityWithUsers(id);
    const header = ['id', 'user_id', 'email', 'name', 'role', 'registered_at'];
    const lines = [header.join(',')];
    for (const r of rows) {
      const vals = [r.id, r.user_id, r.email || '', r.name || '', r.role || '', r.created_at].map((v) => {
        const s = String(v ?? '');
        return s.includes(',') || s.includes('"') ? '"' + s.replace(/"/g, '""') + '"' : s;
      });
      lines.push(vals.join(','));
    }
    const csv = lines.join('\n');

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="registrations_${id}.csv"`);
    return res.status(200).send(csv);
  } catch (e) {
    console.error('GET /api/activities/:id/registrations.csv error:', e);
    return res.status(500).send('Failed to export');
  }
});

// =======================
// Registration Approval
// =======================

// อนุมัติการสมัครเข้าร่วมกิจกรรม (admin/president เท่านั้น)
router.patch('/:id/registrations/:regId/approve', requireAuth, authorize(['admin','president']), async (req, res) => {
  try {
    const activityId = toInt(req.params.id);
    const regId = toInt(req.params.regId);
    if (Number.isNaN(activityId) || Number.isNaN(regId)) {
      return res.status(400).json({ message: 'Invalid id' });
    }

    const activity = await Activity.findById(activityId);
    if (!activity) return res.status(404).json({ message: 'Activity not found' });

    // ตรวจสอบสิทธิ์ประธานชมรม
    if (req.user.role === 'president') {
      if (!activity.club_id || !req.user.id || !(await ClubMembers.isPresidentOfClub(req.user.id, activity.club_id))) {
        return res.status(403).json({ message: 'Forbidden' });
      }
    }

    const updated = await Reg.approveRegistration(regId, req.user.id);
    if (!updated) return res.status(404).json({ message: 'Registration not found' });

    return res.json(updated);
  } catch (error) {
    console.error('PATCH /api/activities/:id/registrations/:regId/approve error:', error);
    return res.status(500).json({ message: 'Failed to approve registration' });
  }
});

// ปฏิเสธการสมัครเข้าร่วมกิจกรรม (admin/president เท่านั้น)
router.patch('/:id/registrations/:regId/reject', requireAuth, authorize(['admin','president']), async (req, res) => {
  try {
    const activityId = toInt(req.params.id);
    const regId = toInt(req.params.regId);
    const { reason } = req.body || {};
    
    if (Number.isNaN(activityId) || Number.isNaN(regId)) {
      return res.status(400).json({ message: 'Invalid id' });
    }

    const activity = await Activity.findById(activityId);
    if (!activity) return res.status(404).json({ message: 'Activity not found' });

    // ตรวจสอบสิทธิ์ประธานชมรม
    if (req.user.role === 'president') {
      if (!activity.club_id || !req.user.id || !(await ClubMembers.isPresidentOfClub(req.user.id, activity.club_id))) {
        return res.status(403).json({ message: 'Forbidden' });
      }
    }

    const updated = await Reg.rejectRegistration(regId, req.user.id, reason);
    if (!updated) return res.status(404).json({ message: 'Registration not found' });

    return res.json(updated);
  } catch (error) {
    console.error('PATCH /api/activities/:id/registrations/:regId/reject error:', error);
    return res.status(500).json({ message: 'Failed to reject registration' });
  }
});

// อนุมัติทั้งหมด
router.patch('/:id/registrations/approve-all', requireAuth, authorize(['admin','president']), async (req, res) => {
  try {
    const activityId = toInt(req.params.id);
    if (Number.isNaN(activityId)) return res.status(400).json({ message: 'Invalid activity id' });

    // ตรวจสอบสิทธิ์สำหรับประธานชมรม
    if (req.user.role === 'president') {
      const activity = await Activity.findById(activityId);
      if (!activity) return res.status(404).json({ message: 'Activity not found' });
      
      const clubIds = await ClubMembers.findClubIdsOfPresident(req.user.id);
      if (!clubIds.includes(activity.club_id)) {
        return res.status(403).json({ message: 'Access denied: Not your club activity' });
      }
    }

    const result = await Reg.approveAllPending(activityId, req.user.id);
    return res.json({ 
      message: 'Approved all pending registrations', 
      count: result.count 
    });
  } catch (error) {
    console.error('PATCH /api/activities/:id/registrations/approve-all error:', error);
    return res.status(500).json({ message: 'Failed to approve all registrations' });
  }
});

// ปฏิเสธทั้งหมด
router.patch('/:id/registrations/reject-all', requireAuth, authorize(['admin','president']), async (req, res) => {
  try {
    const activityId = toInt(req.params.id);
    const { reason } = req.body || {};
    if (Number.isNaN(activityId)) return res.status(400).json({ message: 'Invalid activity id' });

    // ตรวจสอบสิทธิ์สำหรับประธานชมรม
    if (req.user.role === 'president') {
      const activity = await Activity.findById(activityId);
      if (!activity) return res.status(404).json({ message: 'Activity not found' });
      
      const clubIds = await ClubMembers.findClubIdsOfPresident(req.user.id);
      if (!clubIds.includes(activity.club_id)) {
        return res.status(403).json({ message: 'Access denied: Not your club activity' });
      }
    }

    const result = await Reg.rejectAllPending(activityId, req.user.id, reason || 'ปฏิเสธทั้งหมด');
    return res.json({ 
      message: 'Rejected all pending registrations', 
      count: result.count 
    });
  } catch (error) {
    console.error('PATCH /api/activities/:id/registrations/reject-all error:', error);
    return res.status(500).json({ message: 'Failed to reject all registrations' });
  }
});

// รีเซ็ตสถานะเป็น pending
router.patch('/:id/registrations/:regId/reset', requireAuth, authorize(['admin','president']), async (req, res) => {
  try {
    const activityId = toInt(req.params.id);
    const regId = toInt(req.params.regId);
    if (Number.isNaN(activityId) || Number.isNaN(regId)) {
      return res.status(400).json({ message: 'Invalid id' });
    }

    // ตรวจสอบสิทธิ์สำหรับประธานชมรม
    if (req.user.role === 'president') {
      const activity = await Activity.findById(activityId);
      if (!activity) return res.status(404).json({ message: 'Activity not found' });
      
      const clubIds = await ClubMembers.findClubIdsOfPresident(req.user.id);
      if (!clubIds.includes(activity.club_id)) {
        return res.status(403).json({ message: 'Access denied: Not your club activity' });
      }
    }

    const updated = await Reg.resetRegistration(regId);
    if (!updated) return res.status(404).json({ message: 'Registration not found' });

    return res.json(updated);
  } catch (error) {
    console.error('PATCH /api/activities/:id/registrations/:regId/reset error:', error);
    return res.status(500).json({ message: 'Failed to reset registration' });
  }
});

module.exports = router;
