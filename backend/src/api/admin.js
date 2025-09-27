const express = require('express');
const router = express.Router();
const { query } = require('../persistence/db');

// Middleware เพื่อตรวจสอบว่าเป็น admin
const requireAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'ต้องมีสิทธิ์ผู้ดูแลระบบ' });
  }
  next();
};

// GET /api/admin/stats - สถิติสำหรับแอดมิน
router.get('/stats', requireAdmin, async (req, res) => {
  try {
    // ดึงสถิติต่างๆ แบบ parallel
    const [
      usersResult,
      activitiesResult,
      clubsResult,
      registrationsResult
    ] = await Promise.all([
      // ผู้ใช้
      query(`
        SELECT 
          COUNT(*) as total_users,
          COUNT(CASE WHEN role = 'admin' THEN 1 END) as admin_users,
          COUNT(CASE WHEN role = 'president' THEN 1 END) as president_users,
          COUNT(CASE WHEN role = 'student' THEN 1 END) as student_users,
          COUNT(CASE WHEN status = 'active' OR status IS NULL THEN 1 END) as active_users,
          COUNT(CASE WHEN status = 'disabled' THEN 1 END) as inactive_users
        FROM users
      `),
      
      // กิจกรรม
      query(`
        SELECT 
          COUNT(*) as total_activities,
          COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_activities,
          COUNT(CASE WHEN status = 'approved' THEN 1 END) as approved_activities,
          COUNT(CASE WHEN status = 'rejected' THEN 1 END) as rejected_activities
        FROM activities
      `),
      
      // ชมรม
      query(`SELECT COUNT(*) as total_clubs FROM clubs`),
      
      // การสมัคร
      query(`
        SELECT 
          COUNT(*) as total_registrations,
          COUNT(CASE WHEN DATE(r.created_at) >= CURRENT_DATE - INTERVAL '7 days' THEN 1 END) as recent_registrations
        FROM registrations r
      `)
    ]);

    const stats = {
      totalUsers: parseInt(usersResult.rows[0].total_users) || 0,
      adminUsers: parseInt(usersResult.rows[0].admin_users) || 0,
      presidentUsers: parseInt(usersResult.rows[0].president_users) || 0,
      studentUsers: parseInt(usersResult.rows[0].student_users) || 0,
      activeUsers: parseInt(usersResult.rows[0].active_users) || 0,
      inactiveUsers: parseInt(usersResult.rows[0].inactive_users) || 0,
      
      totalActivities: parseInt(activitiesResult.rows[0].total_activities) || 0,
      pendingActivities: parseInt(activitiesResult.rows[0].pending_activities) || 0,
      approvedActivities: parseInt(activitiesResult.rows[0].approved_activities) || 0,
      rejectedActivities: parseInt(activitiesResult.rows[0].rejected_activities) || 0,
      
      totalClubs: parseInt(clubsResult.rows[0].total_clubs) || 0,
      
      totalRegistrations: parseInt(registrationsResult.rows[0].total_registrations) || 0,
      recentRegistrations: parseInt(registrationsResult.rows[0].recent_registrations) || 0
    };

    res.json(stats);
  } catch (error) {
    console.error('Error getting admin stats:', error);
    res.status(500).json({ message: 'เกิดข้อผิดพลาดในการดึงสถิติ' });
  }
});

module.exports = router;
