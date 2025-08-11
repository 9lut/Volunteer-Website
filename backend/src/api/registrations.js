// src/api/registrations.js
const { Router } = require('express');
const router = new Router();

const { requireAuth } = require('../middlewares/auth');
const Reg = require('../persistence/registrations');

// รายการที่ user คนปัจจุบันลงทะเบียนไว้
router.get('/users/me/registrations', requireAuth, async (req, res) => {
  try {
    const list = await Reg.listByUser(req.user.id);
    return res.json(list);
  } catch (e) {
    console.error('GET /api/users/me/registrations error:', e);
    return res.status(500).json({ message: 'Failed to load registrations' });
  }
});

module.exports = router;
