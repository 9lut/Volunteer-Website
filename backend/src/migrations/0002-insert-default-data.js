/**
 * Migration: เพิ่มข้อมูลเริ่มต้น (Default Data)
 * วันที่: 2025-10-21
 * 
 * ข้อมูลที่เพิ่ม:
 * 1. Admin user เริ่มต้น
 * 2. ชมรมตัวอย่าง
 * 3. กิจกรรมตัวอย่าง (ถ้าต้องการ)
 */

const bcrypt = require('bcryptjs');

module.exports = {
  async up(query) {
    console.log('Inserting default data...');

    // 1. สร้าง Admin user เริ่มต้น
    const adminPassword = await bcrypt.hash('admin123', 10);
    
    await query(`
      INSERT INTO users (email, password, name, role, status)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (email) DO NOTHING
    `, ['admin@volunteer.com', adminPassword, 'System Admin', 'admin', 'active']);
    console.log('✓ Default admin user created (email: admin@volunteer.com, password: admin123)');

    // 2. สร้างชมรมตัวอย่าง
    const clubs = [
      {
        name: 'ชมรมอาสาสมัคร',
        description: 'ชมรมจิตอาสาเพื่อสังคม มุ่งเน้นการทำกิจกรรมเพื่อสังคมและชุมชน',
        status: 'active'
      },
      {
        name: 'ชมรมดนตรี',
        description: 'ชมรมดนตรีของมหาวิทยาลัย สำหรับผู้ที่รักในดนตรีและศิลปะการแสดง',
        status: 'active'
      },
      {
        name: 'ชมรมกีฬา',
        description: 'ชมรมกีฬาและนันทนาการ ส่งเสริมสุขภาพและความแข็งแรงของร่างกาย',
        status: 'active'
      },
      {
        name: 'ชมรมภาษาอังกฤษ',
        description: 'ชมรมส่งเสริมการเรียนรู้และการใช้ภาษาอังกฤษ',
        status: 'active'
      },
      {
        name: 'ชมรมสิ่งแวดล้อม',
        description: 'ชมรมอนุรักษ์สิ่งแวดล้อมและธรรมชาติ',
        status: 'active'
      }
    ];

    for (const club of clubs) {
      await query(`
        INSERT INTO clubs (name, description, status)
        VALUES ($1, $2, $3)
        ON CONFLICT DO NOTHING
      `, [club.name, club.description, club.status]);
    }
    console.log(`✓ ${clubs.length} default clubs created`);

    // 3. สร้าง Student user ตัวอย่าง
    const studentPassword = await bcrypt.hash('student123', 10);
    
    await query(`
      INSERT INTO users (email, password, name, role, status)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (email) DO NOTHING
    `, ['student@volunteer.com', studentPassword, 'Student User', 'student', 'active']);
    console.log('✓ Default student user created (email: student@volunteer.com, password: student123)');

    // 4. สร้าง President user ตัวอย่าง
    const presidentPassword = await bcrypt.hash('president123', 10);
    
    // ดึง club_id ของชมรมแรก
    const clubResult = await query(`SELECT id FROM clubs WHERE name = $1 LIMIT 1`, ['ชมรมอาสาสมัคร']);
    const firstClubId = clubResult.rows[0]?.id;

    if (firstClubId) {
      const presidentResult = await query(`
        INSERT INTO users (email, password, name, role, status, club_id)
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (email) DO UPDATE 
        SET club_id = EXCLUDED.club_id
        RETURNING id
      `, ['president@volunteer.com', presidentPassword, 'Club President', 'president', 'active', firstClubId]);

      const presidentId = presidentResult.rows[0]?.id;

      // เพิ่มเข้า club_members
      if (presidentId) {
        await query(`
          INSERT INTO club_members (club_id, user_id, role, status)
          VALUES ($1, $2, $3, $4)
          ON CONFLICT (club_id, user_id) DO UPDATE
          SET role = EXCLUDED.role
        `, [firstClubId, presidentId, 'president', 'active']);
        
        console.log('✓ Default president user created (email: president@volunteer.com, password: president123)');
      }
    }

    console.log('✅ Default data inserted successfully!');
    console.log('');
    console.log('=== Default Accounts ===');
    console.log('Admin:     admin@volunteer.com / admin123');
    console.log('President: president@volunteer.com / president123');
    console.log('Student:   student@volunteer.com / student123');
    console.log('========================');
  },

  async down(query) {
    console.log('Removing default data...');
    
    // ลบข้อมูลทดสอบ (ถ้าต้องการ)
    await query(`DELETE FROM registrations WHERE 1=1`);
    await query(`DELETE FROM activity_images WHERE 1=1`);
    await query(`DELETE FROM activities WHERE 1=1`);
    await query(`DELETE FROM club_members WHERE 1=1`);
    await query(`DELETE FROM users WHERE email IN ('admin@volunteer.com', 'student@volunteer.com', 'president@volunteer.com')`);
    await query(`DELETE FROM clubs WHERE name IN ('ชมรมอาสาสมัคร', 'ชมรมดนตรี', 'ชมรมกีฬา', 'ชมรมภาษาอังกฤษ', 'ชมรมสิ่งแวดล้อม')`);
    
    console.log('✅ Default data removed!');
  }
};
