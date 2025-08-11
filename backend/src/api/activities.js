// src/api/activities.js
const { Router } = require('express');
const router = new Router();

const Activity = require('../persistence/activity');
const Reg = require('../persistence/registrations');
const Images = require('../persistence/activity_images');

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

function isAdmin(user) {
  return user?.role === 'admin';
}
function isPresident(user) {
  return user?.role === 'president';
}

/** ตรวจสิทธิ์ว่าจัดการ activity นี้ได้ไหม (admin = ได้ทั้งหมด, president = ได้เฉพาะชมรมตัวเอง) */
function canManageActivity(activity, user) {
  if (!user) return false;
  if (isAdmin(user)) return true;
  if (isPresident(user)) {
    return activity?.club_id && user?.club_id && activity.club_id === user.club_id;
  }
  return false;
}

/** โหลดกิจกรรม + เช็คสิทธิ์ (ใช้กับ put/delete/cover/upload/delete image) */
async function loadAndAuthorizeManage(id, user) {
  const activity = await Activity.findById(id);
  if (!activity) return { error: { code: 404, message: 'Activity not found' } };
  if (!canManageActivity(activity, user)) {
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
        title,
        description,
        start_date,
        end_date,
        location,
        club_id: reqClubId, // admin อาจส่งมากำหนดชมรม
      } = req.body || {};
      if (!title) return res.status(400).json({ message: 'title is required' });

      // ผูก club_id:
      // - admin: ใช้ค่าที่ส่งมา (ถ้าไม่ส่งมาก็เป็น null ได้)
      // - president: บังคับใช้ club_id ของตัวเองเท่านั้น
      const club_id = isAdmin(req.user) ? (reqClubId ?? null) : (req.user.club_id ?? null);

      const activity = await Activity.create({
        title,
        description: description ?? null,
        start_date: start_date ?? null,
        end_date: end_date ?? null,
        location: location ?? null,
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

    // กรณี admin: เห็นทั้งหมด (ไม่กรองชมรม)
    // กรณี president: กรองเฉพาะ club_id ของตัวเองเสมอ
    const clubFilter = isPresident(req.user) ? (req.user.club_id ?? null) : null;

    const list = await Activity.findAll({
      status,
      limit,
      sort,
      club_id: clubFilter,
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
  } catch (e) {
    console.error('GET /api/activities/stats error:', e);
    return res.status(500).json({ message: 'Failed to get activity stats' });
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
    if (Number.isNaN(id)) return res.status(400).json({ message: 'Invalid id' });

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
    if (Number.isNaN(id)) return res.status(400).json({ message: 'Invalid id' });

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
    if (Number.isNaN(id)) return res.status(400).json({ message: 'Invalid id' });

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
    if (Number.isNaN(id)) return res.status(400).json({ message: 'Invalid id' });

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
    if (Number.isNaN(id)) return res.status(400).json({ message: 'Invalid id' });

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
    if (Number.isNaN(id)) return res.status(400).json({ message: 'Invalid id' });
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
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ message: 'Invalid id' });

    const activity = await Activity.findById(id);
    if (!activity) return res.status(404).json({ message: 'Activity not found' });

    if (activity.status !== 'approved' && req.user.role === 'student') {
      return res.status(403).json({ message: 'Activity is not open for registration' });
    }

    try {
      const reg = await Reg.create({ activity_id: id, user_id: req.user.id });
      return res.status(201).json(reg);
    } catch (err) {
      if (err.code === 'ALREADY_REGISTERED') {
        return res.status(409).json({ message: 'คุณสมัครกิจกรรมนี้แล้ว' });
      }
      throw err;
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


module.exports = router;
