const { Router } = require('express');
const router = new Router();
const bcrypt = require('bcrypt');
const Users = require('../persistence/users');
const authorize = require('../middlewares/authorize');
const Reg = require('../persistence/registrations');
const { requireAuth } = require('../middlewares/auth');
const ClubMembers = require('../persistence/club_members');

// สร้างผู้ใช้ใหม่ (admin เท่านั้น)
router.post('/', authorize(['admin']), async (req, res) => {
  try {
    let { email, password, role, name, club_id } = req.body || {};
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

    // ถ้าสร้างเป็นประธานชมรม และระบุ club_ids ให้กำหนดเป็นประธานใน club_members
    const clubIds = req.body.club_ids || [];
    if (userRole === 'president' && Array.isArray(clubIds) && clubIds.length > 0) {
      try {
        for (const clubId of clubIds) {
          const clubIdNum = Number(clubId);
          if (Number.isFinite(clubIdNum)) {
            await ClubMembers.addMember(clubIdNum, newUser.id, 'president');
          }
        }
      } catch (e) {
        console.warn('assign president failed:', e.message);
      }
    }

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
    
    // เพิ่มข้อมูลชมรมสำหรับประธาน
    const usersWithClubs = await Promise.all(
      users.map(async (u) => {
        let clubs = [];
        if (u.role === 'president') {
          try {
            clubs = await ClubMembers.findClubsByUserId(u.id);
          } catch (error) {
            console.warn('Error loading clubs for user:', u.id, error.message);
          }
        }
        
        return {
          id: u.id,
          email: u.email,
          role: u.role,
          name: u.name,
          status: u.status || 'active',
          created_at: u.created_at,
          club: clubs.length > 0 ? clubs.map(c => c.name).join(', ') : null,
          clubs: clubs
        };
      })
    );

    return res.json(usersWithClubs);
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

// อัปเดตโปรไฟล์ตัวเอง (ทุกบทบาท)
router.patch('/me', requireAuth, async (req, res) => {
  try {
    const { name } = req.body || {};
    if (!name || typeof name !== 'string') {
      return res.status(400).json({ message: 'Name is required and must be a string' });
    }

    const trimmedName = name.trim();
    if (trimmedName.length < 1 || trimmedName.length > 100) {
      return res.status(400).json({ message: 'Name must be between 1-100 characters' });
    }

    const updated = await Users.updateProfile(req.user.id, { name: trimmedName });
    if (!updated) {
      return res.status(404).json({ message: 'User not found' });
    }

    return res.json({ 
      id: updated.id, 
      email: updated.email, 
      role: updated.role, 
      name: updated.name 
    });
  } catch (error) {
    console.error('PATCH /api/users/me error:', error);
    return res.status(500).json({ message: 'Failed to update profile' });
  }
});

router.get('/me/registrations', requireAuth, authorize(['student','president','admin']), async (req, res) => {
  try {
    const list = await Reg.listByUserWithActivity(req.user.id);
    return res.json(list);
  } catch (e) {
    console.error('GET /api/users/me/registrations error:', e);
    return res.status(500).json({ message: 'Failed to load registrations' });
  }
});

router.patch('/:id/role', requireAuth, authorize(['admin']), async (req, res) => {
  try {
    const { id } = req.params;
    const { role, club_id } = req.body || {};
    if (!role) return res.status(400).json({ message: 'role is required' });

    // กันเปลี่ยนบทบาทตัวเอง (กันล็อกตัวเอง)
    if (req.user?.id && req.user.id === id) {
      return res.status(400).json({ message: 'Cannot change your own role' });
    }

    const updated = await Users.updateRoleSafe(id, role);
    if (!updated) return res.status(404).json({ message: 'User not found' });

    // จัดการชมรมตามบทบาท
    if (role === 'president') {
      // ลบจากชมรมเดิมทั้งหมดก่อน
      await ClubMembers.removeUserFromAllClubs(id);
      
      const clubIdNum = club_id == null || club_id === '' ? null : Number(club_id);
      if (Number.isFinite(clubIdNum)) {
        // เพิ่มเป็นประธานชมรมที่ระบุ
        try {
          await ClubMembers.addMember(clubIdNum, id, 'president');
        } catch (e) {
          console.warn('assign president (update role) failed:', e.message);
        }
      } else {
        // ถ้าไม่ระบุชมรม ให้เพิ่มเป็นประธานชมรมแรกที่พบ
        try {
          const Clubs = require('../persistence/clubs');
          const allClubs = await Clubs.findAll({ limit: 1 });
          if (allClubs.length > 0) {
            await ClubMembers.addMember(allClubs[0].id, id, 'president');
          }
        } catch (e) {
          console.warn('auto-assign president failed:', e.message);
        }
      }
    } else {
      // ถ้าเปลี่ยนเป็นบทบาทอื่น ลบออกจากชมรมทั้งหมด
      try {
        await ClubMembers.removeUserFromAllClubs(id);
      } catch (e) {
        console.warn('remove from clubs failed:', e.message);
      }
    }
    
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

// แก้ไขข้อมูลผู้ใช้ (admin เท่านั้น)
router.patch('/:id', requireAuth, authorize(['admin']), async (req, res) => {
  try {
    const id = req.params.id;
    const { name, email, role, status } = req.body || {};
    
    if (!id) return res.status(400).json({ message: 'User ID required' });

    // ตรวจสอบ email format ถ้ามีการส่งมา
    if (email && !/^\S+@\S+\.\S+$/.test(email)) {
      return res.status(400).json({ message: 'Invalid email format' });
    }

    const updates = {};
    if (name !== undefined) updates.name = name ? String(name).trim() : null;
    if (email !== undefined) updates.email = String(email).trim().toLowerCase();
    if (role !== undefined) updates.role = role;
    if (status !== undefined) updates.status = status;

    const updated = await Users.updateUser(id, updates);
    if (!updated) return res.status(404).json({ message: 'User not found' });

    return res.json(updated);
  } catch (e) {
    console.error('PATCH /api/users/:id error:', e);
    return res.status(500).json({ message: 'Failed to update user' });
  }
});

// ดูชมรมของผู้ใช้ (admin เท่านั้น)
router.get('/:id/clubs', requireAuth, authorize(['admin']), async (req, res) => {
  try {
    const id = req.params.id;
    const clubs = await ClubMembers.findClubsByUserId(id);
    return res.json(clubs);
  } catch (e) {
    console.error('GET /api/users/:id/clubs error:', e);
    return res.status(500).json({ message: 'Failed to get user clubs' });
  }
});

// จัดการชมรมของผู้ใช้ (admin เท่านั้น)
router.patch('/:id/clubs', requireAuth, authorize(['admin']), async (req, res) => {
  try {
    const id = req.params.id;
    const { club_ids = [] } = req.body || {};
    
    // ลบชมรมเดิมทั้งหมด
    await ClubMembers.removeUserFromAllClubs(id);
    
    // เพิ่มชมรมใหม่
    if (Array.isArray(club_ids) && club_ids.length > 0) {
      for (const clubId of club_ids) {
        if (clubId && typeof clubId === 'string') {
          await ClubMembers.addMember(clubId, id, 'president');
        }
      }
    }

    const clubs = await ClubMembers.findClubsByUserId(id);
    return res.json(clubs);
  } catch (e) {
    console.error('PATCH /api/users/:id/clubs error:', e);
    return res.status(500).json({ message: 'Failed to update user clubs' });
  }
});

// ลบผู้ใช้ (admin เท่านั้น)
router.delete('/:id', requireAuth, authorize(['admin']), async (req, res) => {
  try {
    const id = req.params.id;
    
    // ป้องกันลบตัวเอง
    if (id === req.user.id) {
      return res.status(400).json({ message: 'Cannot delete yourself' });
    }

    const deleted = await Users.deleteUser(id);
    if (!deleted) return res.status(404).json({ message: 'User not found' });

    return res.json({ message: 'User deleted successfully' });
  } catch (e) {
    console.error('DELETE /api/users/:id error:', e);
    return res.status(500).json({ message: 'Failed to delete user' });
  }
});

// รีเซ็ตรหัสผ่าน (admin เท่านั้น)
router.post('/:id/reset-password', requireAuth, authorize(['admin']), async (req, res) => {
  try {
    const id = req.params.id;
    
    // สุ่มรหัสผ่านใหม่
    const tempPassword = Math.random().toString(36).slice(-12) + Math.random().toString(36).slice(-12);
    const hash = await bcrypt.hash(tempPassword, 10);
    
    const updated = await Users.updatePassword(id, hash);
    if (!updated) return res.status(404).json({ message: 'User not found' });

    return res.json({ tempPassword });
  } catch (e) {
    console.error('POST /api/users/:id/reset-password error:', e);
    return res.status(500).json({ message: 'Failed to reset password' });
  }
});

// อัปเดตสถานะผู้ใช้ (admin เท่านั้น)
router.patch('/:id/status', requireAuth, authorize(['admin']), async (req, res) => {
  try {
    const id = req.params.id;
    const { status } = req.body || {};
    
    if (!['active', 'disabled'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    const updated = await Users.updateStatus(id, status);
    if (!updated) return res.status(404).json({ message: 'User not found' });

    return res.json(updated);
  } catch (e) {
    console.error('PATCH /api/users/:id/status error:', e);
    return res.status(500).json({ message: 'Failed to update status' });
  }
});

// ตรวจสอบ club membership ของผู้ใช้ (admin เท่านั้น)
router.get('/:id/club-membership', requireAuth, authorize(['admin']), async (req, res) => {
  try {
    const id = req.params.id;
    
    const user = await Users.findById(id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    
    const clubs = await ClubMembers.findClubsByUserId(id);
    
    return res.json({
      user_id: id,
      user_role: user.role,
      club_memberships: clubs,
      is_president: clubs.some(c => c.role === 'president'),
      total_clubs: clubs.length
    });
  } catch (e) {
    console.error('GET /api/users/:id/club-membership error:', e);
    return res.status(500).json({ message: 'Failed to get club membership' });
  }
});

module.exports = router;
