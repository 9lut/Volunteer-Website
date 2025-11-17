const express = require('express');
const { requireAuth } = require('../middlewares/auth');
const Registrations = require('../persistence/registrations');
const Users = require('../persistence/users');

const router = express.Router();

// GET /api/users/me - ข้อมูลผู้ใช้ปัจจุบัน
router.get('/', requireAuth, async (req, res) => {
  try {
    const user = await Users.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // ไม่ส่ง password กลับไป
    const { password, ...userData } = user;
    res.json(userData);
  } catch (error) {
    console.error('Error fetching user profile:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// PATCH /api/users/me - อัปเดตข้อมูลผู้ใช้ปัจจุบัน (เฉพาะข้อมูลที่แก้ไขได้)
router.patch('/', requireAuth, async (req, res) => {
  try {
    const { name, faculty, major, birth_date, year_level, phone } = req.body;
    
    // ตรวจสอบว่ามีข้อมูลที่จะอัปเดต
    if (!name && !faculty && !major && !birth_date && year_level === undefined && !phone) {
      return res.status(400).json({ message: 'No data to update' });
    }
    
    // ห้ามแก้ไข student_id
    if (req.body.student_id !== undefined) {
      return res.status(403).json({ message: 'Cannot modify student ID' });
    }
    
    const profileData = {};
    if (name !== undefined) profileData.name = name;
    if (faculty !== undefined) profileData.faculty = faculty;
    if (major !== undefined) profileData.major = major;
    if (birth_date !== undefined) profileData.birth_date = birth_date;
    if (year_level !== undefined) profileData.year_level = parseInt(year_level) || null;
    if (phone !== undefined) profileData.phone = phone;
    
    const updated = await Users.updateProfile(req.user.id, profileData);
    if (!updated) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // ไม่ส่ง password กลับไป
    const { password, ...userData } = updated;
    res.json(userData);
  } catch (error) {
    console.error('Error updating user profile:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// PATCH /api/users/me/password - เปลี่ยนรหัสผ่าน
router.patch('/password', requireAuth, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: 'Current password and new password are required' });
    }
    
    if (newPassword.length < 6) {
      return res.status(400).json({ message: 'New password must be at least 6 characters' });
    }
    
    // ตรวจสอบรหัสผ่านเดิม
    const user = await Users.find(req.user.email);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    const bcrypt = require('bcryptjs');
    const isValid = await bcrypt.compare(currentPassword, user.password);
    if (!isValid) {
      return res.status(401).json({ message: 'Current password is incorrect' });
    }
    
    // เปลี่ยนรหัสผ่าน
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    const updated = await Users.updatePassword(req.user.id, hashedPassword);
    
    if (!updated) {
      return res.status(404).json({ message: 'Failed to update password' });
    }
    
    res.json({ message: 'Password updated successfully' });
  } catch (error) {
    console.error('Error changing password:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

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
