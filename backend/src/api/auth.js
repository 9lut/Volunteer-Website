const { Router } = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const Users = require('../persistence/users');

const router = new Router();

// POST /api/auth/register
router.post('/register', async (req, res) => {
  const { 
    email, 
    password, 
    name, 
    role,
    student_id,
    faculty,
    major,
    birth_date,
    year_level,
    phone
  } = req.body || {};

  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required' });
  }
  if (!/^\S+@\S+\.\S+$/.test(email)) {
    return res.status(400).json({ message: 'Invalid email format' });
  }
  if (password.length < 8) {
    return res.status(400).json({ message: 'Password must be at least 8 characters' });
  }

  // ตรวจสอบรหัสนักศึกษา
  if (student_id) {
    if (!/^\d{10}$/.test(student_id)) {
      return res.status(400).json({ message: 'Student ID must be exactly 10 digits' });
    }
    const dupStudentId = await Users.existsByStudentId(student_id);
    if (dupStudentId) {
      return res.status(409).json({ message: 'Student ID already exists' });
    }
  }

  try {
    const dup = await Users.existsByEmail(email);
    if (dup) return res.status(409).json({ message: 'Email already registered' });

    const hash = await bcrypt.hash(password, 10);
    const newUser = await Users.create({
      email,
      password: hash,
      name: name || null,
      role: role || 'student',
      student_id: student_id || null,
      faculty: faculty || null,
      major: major || null,
      birth_date: birth_date || null,
      year_level: year_level ? parseInt(year_level) : null,
      phone: phone || null,
    });

    const payload = { id: newUser.id, email: newUser.email, role: newUser.role, club_id: null };
    const token = jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN || '1h',
    });

    return res.status(201).json({
      token,
      user: { 
        id: newUser.id, 
        email: newUser.email, 
        role: newUser.role, 
        name: newUser.name,
        club_id: null,
        student_id: newUser.student_id,
        faculty: newUser.faculty,
        major: newUser.major,
        birth_date: newUser.birth_date,
        year_level: newUser.year_level,
        phone: newUser.phone,
        status: 'active',
        created_at: newUser.created_at,
      },
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ message: 'Register failed' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required' });
  }

  try {
    const user = await Users.find(email); // ต้องคืน { id, email, password, role, name, club_id }
    if (!user) return res.status(401).json({ message: 'Invalid email or password' });

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return res.status(401).json({ message: 'Invalid email or password' });

    // ตรวจสอบว่า account ถูกปิดการใช้งานหรือไม่
    if (user.status === 'disabled') {
      return res.status(403).json({ 
        message: 'บัญชีผู้ใช้ของคุณถูกปิดการใช้งาน กรุณาติดต่อแอดมิน' 
      });
    }

    const payload = { id: user.id, email: user.email, role: user.role, club_id: user.club_id ?? null };
    const token = jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN || '1h',
    });

    return res.json({
      token,
      user: { 
        id: user.id, 
        email: user.email, 
        role: user.role, 
        name: user.name, 
        club_id: user.club_id ?? null,
        student_id: user.student_id,
        faculty: user.faculty,
        major: user.major,
        birth_date: user.birth_date,
        year_level: user.year_level,
        phone: user.phone,
        status: user.status || 'active',
        created_at: user.created_at,
      },
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ message: 'Login failed' });
  }
});

module.exports = router;
