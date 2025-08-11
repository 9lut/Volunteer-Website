require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

function createServer() {
  const app = express();

  // CORS (ให้ credentials + Authorization ทำงานได้)
  app.use(cors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:3001',
    credentials: true,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    allowedHeaders: ['Content-Type', 'Authorization'],
    exposedHeaders: ['Content-Type'],
  }));

  app.use(express.json());

  // ✅ Static /uploads (ชี้ไปที่โฟลเดอร์จริง)
  const UPLOAD_DIR =
    process.env.UPLOAD_DIR ||
    // ถ้าไฟล์นี้อยู่รากโปรเจกต์ จะได้ <root>/uploads
    path.resolve(process.cwd(), 'uploads');
  app.use('/uploads', express.static(UPLOAD_DIR, { maxAge: '7d', index: false }));

  // Auth
  const authRouter = require('./src/api/auth');
  app.use('/api/auth', authRouter);

  const { requireAuth } = require('./src/middlewares/auth');

  // Users (ต้อง auth)
  try {
    const usersRouter = require('./src/api/users');
    app.use('/api/users', requireAuth, usersRouter);
    console.log('usersRouter mounted at /api/users');
  } catch (err) {
    console.warn('usersRouter not loaded:', err.message);
  }

  // Activities
  try {
    const activitiesRouter = require('./src/api/activities');
    app.use('/api/activities', activitiesRouter);
    console.log('activitiesRouter mounted at /api/activities');
  } catch (err) {
    console.warn('activitiesRouter not loaded:', err.message);
  }

  try {
    const clubsRouter = require('./src/api/clubs');
    app.use('/api/clubs', clubsRouter);
    console.log('clubsRouter mounted at /api/clubs');
  } catch (err) {
    console.warn('clubsRouter not loaded:', err.message);
  }

  try {
    const usersMeRouter = require('./src/api/users_me');
    app.use('/api/users/me', requireAuth, usersMeRouter);
  } catch (err) {
    console.warn('usersMeRouter not loaded:', err.message);
  }

  try {
    const registrationsRouter = require('./src/api/registrations');
    app.use('/api', registrationsRouter);
  } catch (err) {
    console.warn('registrationsRouter not loaded:', err.message);
  }

  // Health & root
  app.get('/', (_, res) => res.send('OK'));
  app.get('/api', (_, res) => res.json({ message: 'API is running' }));
  app.get('/health', (_, res) => res.send('OK'));

  // ✅ 404 handler ต้องวางท้ายสุด หลัง mount ทุก router
  app.use((req, res) => {
    res.status(404).json({ message: 'Not Found' });
  });

  // ✅ error handler เพื่อ log stack
  app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    res.status(500).json({ message: 'Internal Server Error' });
  });

  return app;
}

function start(port) {
  const app = createServer();
  const PORT = Number(port || process.env.PORT || 3000);
  app.listen(PORT, () => console.log(`API listening on http://localhost:${PORT}`));
}

module.exports = { createServer, start };
