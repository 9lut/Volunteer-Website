const { Router } = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const Users = require('../persistence/users');

const router = new Router();

// POST /api/auth/register
router.post('/register', async (req, res) => {
  const { email, password, name, role } = req.body || {};

  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required' });
  }
  if (!/^\S+@\S+\.\S+$/.test(email)) {
    return res.status(400).json({ message: 'Invalid email format' });
  }
  if (password.length < 8) {
    return res.status(400).json({ message: 'Password must be at least 8 characters' });
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
    });

    const payload = { id: newUser.id, email: newUser.email, role: newUser.role, club_id: null };
    const token = jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN || '1h',
    });

    return res.status(201).json({
      token,
      user: { id: newUser.id, email: newUser.email, role: newUser.role, name: newUser.name },
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

    const payload = { id: user.id, email: user.email, role: user.role, club_id: user.club_id ?? null };
    const token = jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN || '1h',
    });

    return res.json({
      token,
      user: { id: user.id, email: user.email, role: user.role, name: user.name, club_id: user.club_id ?? null },
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ message: 'Login failed' });
  }
});

module.exports = router;
