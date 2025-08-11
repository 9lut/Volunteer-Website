// src/api/users_me.js
const { Router } = require('express');
const router = new Router();

const { requireAuth } = require('../middlewares/auth');
const Reg = require('../persistence/registrations');

// NOTE: ไฟล์นี้ถูก mount ที่ /api/users/me ใน server.js (ดูหัวข้อ #3)
router.get('/', requireAuth, async (req, res) => {
  return res.json({
    id: req.user.id,
    email: req.user.email,
    role: req.user.role,
    club_id: req.user.club_id ?? null,
  });
});

// ประวัติการลงทะเบียนกิจกรรมของ “ฉัน”
router.get('/registrations', requireAuth, async (req, res) => {
  try {
    const rows = await Reg.listByUserWithActivity(req.user.id);
    return res.json(rows);
  } catch (e) {
    console.error('GET /api/users/me/registrations error:', e);
    return res.status(500).json({ message: 'Failed to get registrations' });
  }
});

module.exports = router;
