const { Router } = require('express');
const router = new Router();
const bcrypt = require('bcrypt');
const Users = require('../persistence/users');
const authorize = require('../middlewares/authorize');
const Reg = require('../persistence/registrations');
const { requireAuth } = require('../middlewares/auth');

// สร้างผู้ใช้ใหม่ (admin เท่านั้น)
router.post('/', authorize(['admin']), async (req, res) => {
  try {
    let { email, password, role, name } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ message: 'email and password must be provided' });
    }

    email = String(email).trim().toLowerCase();
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      return res.status(400).json({ message: 'Invalid email format' });
    }
    if (String(password).length < 8) {
      return res.status(400).json({ message: 'Password must be at least 8 characters' });
    }

    // จำกัด role ที่อนุญาตสร้าง (กันพลาดยิง role แปลก ๆ เข้ามา)
    const allowRoles = new Set(['student', 'president', 'admin']);
    const userRole = allowRoles.has(role) ? role : 'student';

    const dup = await Users.existsByEmail(email);
    if (dup) return res.status(409).json({ message: 'Email already registered' });

    const hash = await bcrypt.hash(password, 10);
    const newUser = await Users.create({
      email,
      password: hash,
      role: userRole,
      name: name ? String(name).trim() : null,
    });

    return res.status(201).json({
      id: newUser.id,
      email: newUser.email,
      role: newUser.role,
      name: newUser.name,
    });
  } catch (error) {
    console.error(`POST /api/users error:`, error);
    return res.status(500).json({ message: 'Failed to create user' });
  }
});

// รายชื่อผู้ใช้ (ตัวอย่าง) — admin เท่านั้น, รองรับ pagination เบา ๆ
router.get('/', authorize(['admin']), async (req, res) => {
  try {
    if (typeof Users.findAll !== 'function') {
      return res.status(501).json({ message: 'findAll() not implemented' });
    }
    const limit = Math.min(Number(req.query.limit) || 50, 200);
    const offset = Number(req.query.offset) || 0;

    const users = await Users.findAll({ limit, offset });
    return res.json(users.map(u => ({
      id: u.id, email: u.email, role: u.role, name: u.name
    })));
  } catch (error) {
    console.error('GET /api/users error:', error);
    return res.status(500).json({ message: 'Failed to get users' });
  }
});

// ดูโปรไฟล์ตัวเอง (ทุกบทบาท)
router.get('/me', async (req, res) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ message: 'Unauthenticated' });
    }
    const me = await Users.findById(req.user.id);
    if (!me) return res.status(404).json({ message: 'User not found' });
    return res.json({ id: me.id, email: me.email, role: me.role, name: me.name });
  } catch (error) {
    console.error('GET /api/users/me error:', error);
    return res.status(500).json({ message: 'Failed to get profile' });
  }
});

router.get('/me/registrations', requireAuth, authorize(['student','president','admin']), async (req, res) => {
  try {
    const list = await Reg.listByUser(req.user.id);
    return res.json(list);
  } catch (e) {
    console.error('GET /api/users/me/registrations error:', e);
    return res.status(500).json({ message: 'Failed to load registrations' });
  }
});

router.patch('/:id/role', requireAuth, authorize(['admin']), async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body || {};
    if (!role) return res.status(400).json({ message: 'role is required' });

    // กันเปลี่ยนบทบาทตัวเอง (กันล็อกตัวเอง)
    if (req.user?.id && req.user.id === id) {
      return res.status(400).json({ message: 'Cannot change your own role' });
    }

    const updated = await Users.updateRoleSafe(id, role);
    if (!updated) return res.status(404).json({ message: 'User not found' });
    return res.json(updated);
  } catch (e) {
    console.error('PATCH /api/users/:id/role error:', e);
    if (e.code === 'LAST_ADMIN') {
      return res.status(400).json({ message: 'Cannot demote the last admin' });
    }
    if (String(e.message).includes('Invalid role')) {
      return res.status(400).json({ message: 'Invalid role' });
    }
    return res.status(500).json({ message: 'Failed to change role' });
  }
});

router.get('/stats', requireAuth, authorize(['admin']), async (_req, res) => {
  try {
    const stats = await Users.getStats();
    return res.json(stats);
  } catch (e) {
    console.error('GET /api/users/stats error:', e);
    return res.status(500).json({ message: 'Failed to get user stats' });
  }
});

module.exports = router;
