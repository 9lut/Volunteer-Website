/**
 * Migration: เพิ่มฟิลด์ข้อมูลประวัติผู้ใช้
 * วันที่: 2025-11-16
 * 
 * เพิ่มฟิลด์:
 * - student_id (รหัสนักศึกษา 10 หลัก, UNIQUE)
 * - faculty (คณะ)
 * - major (สาขา)
 * - birth_date (วันเกิด)
 * - year_level (ชั้นปี)
 * - phone (เบอร์โทร)
 */

module.exports = {
  async up(query) {
    console.log('Adding user profile fields...');
    
    // เพิ่มคอลัมน์ใหม่
    await query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS student_id VARCHAR(10) UNIQUE,
      ADD COLUMN IF NOT EXISTS faculty VARCHAR(255),
      ADD COLUMN IF NOT EXISTS major VARCHAR(255),
      ADD COLUMN IF NOT EXISTS birth_date DATE,
      ADD COLUMN IF NOT EXISTS year_level INTEGER,
      ADD COLUMN IF NOT EXISTS phone VARCHAR(20)
    `);
    console.log('✓ User profile fields added');

    // เพิ่ม index
    await query(`CREATE INDEX IF NOT EXISTS idx_users_student_id ON users(student_id)`);
    await query(`CREATE INDEX IF NOT EXISTS idx_users_faculty ON users(faculty)`);
    await query(`CREATE INDEX IF NOT EXISTS idx_users_year_level ON users(year_level)`);
    
    console.log('✓ Indexes created');
  },

  async down(query) {
    console.log('Removing user profile fields...');
    
    await query(`
      ALTER TABLE users 
      DROP COLUMN IF EXISTS student_id,
      DROP COLUMN IF EXISTS faculty,
      DROP COLUMN IF EXISTS major,
      DROP COLUMN IF EXISTS birth_date,
      DROP COLUMN IF EXISTS year_level,
      DROP COLUMN IF EXISTS phone
    `);
    
    console.log('✓ User profile fields removed');
  }
};
