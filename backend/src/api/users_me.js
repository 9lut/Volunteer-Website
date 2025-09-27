const express = require('express');
const { requireAuth } = require('../middlewares/auth');
const Registrations = require('../persistence/registrations');

const router = express.Router();

// GET /api/users/me/registrations - รายการการลงทะเบียนของ user ที่ล็อกอินอยู่
router.get('/registrations', requireAuth, async (req, res) => {
  try {
    console.log('GET /api/users/me/registrations called');
    console.log('User ID:', req.user.id);
    console.log('User role:', req.user.role);
    
    const registrations = await Registrations.listByUserWithActivity(req.user.id);
    console.log('Registrations found:', registrations ? registrations.length : 0);
    console.log('Registrations data:', JSON.stringify(registrations, null, 2));
    
    res.json(registrations || []);
  } catch (error) {
    console.error('Error fetching user registrations:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

module.exports = router;
