const express = require('express');
const router = express.Router();
const User = require('../persistence/users');

// ลงทะเบียนผู้ใช้ใหม่
router.post('/', async (req, res) => {
  try {
    const { email, password, role } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'email and password must be provided' });
    }

    // กำหนด role เป็น 'student' หากไม่ระบุมา
    const userRole = role || 'student';

    const user = await User.create(email, password, userRole);
    if (!user) {
      return res.status(400).json({ message: 'User already exists' });
    }

    res.status(201).json(user);
  } catch (error) {
    console.error(`createUser({ email: ${req.body.email} }) >> Error: ${error.stack}`);
    res.status(500).json();
  }
});

module.exports = router;
