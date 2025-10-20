/**
 * Migration: สร้างตารางทั้งหมดสำหรับระบบ Volunteer Management
 * วันที่: 2025-10-21
 * 
 * ตารางที่สร้าง:
 * 1. users - ผู้ใช้งาน (UUID)
 * 2. clubs - ชมรม (UUID)
 * 3. club_members - สมาชิกชมรม (SERIAL id, UUID foreign keys)
 * 4. activities - กิจกรรม (SERIAL id)
 * 5. activity_images - รูปภาพกิจกรรม (SERIAL id)
 * 6. registrations - การลงทะเบียนเข้าร่วมกิจกรรม (SERIAL id)
 */

module.exports = {
  async up(query) {
    console.log('Creating all tables...');
    
    // Enable UUID extension
    await query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);
    await query(`CREATE EXTENSION IF NOT EXISTS "pgcrypto"`);
    console.log('✓ UUID extensions enabled');

    // 1. สร้างตาราง clubs ก่อน (เพราะ users มี FK ไป clubs)
    await query(`
      CREATE TABLE IF NOT EXISTS clubs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        description TEXT,
        logo_url VARCHAR(500),
        status VARCHAR(50) DEFAULT 'active',
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log('✓ Table clubs created');

    await query(`CREATE INDEX IF NOT EXISTS idx_clubs_status ON clubs(status)`);
    await query(`CREATE INDEX IF NOT EXISTS idx_clubs_name ON clubs(name)`);

    // 2. สร้างตาราง users
    await query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        name VARCHAR(255),
        role VARCHAR(50) DEFAULT 'student',
        status VARCHAR(50) DEFAULT 'active',
        club_id UUID REFERENCES clubs(id) ON DELETE SET NULL,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log('✓ Table users created');

    await query(`CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)`);
    await query(`CREATE INDEX IF NOT EXISTS idx_users_role ON users(role)`);
    await query(`CREATE INDEX IF NOT EXISTS idx_users_club_id ON users(club_id)`);

    // 3. สร้างตาราง club_members
    await query(`
      CREATE TABLE IF NOT EXISTS club_members (
        id SERIAL PRIMARY KEY,
        club_id UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        role VARCHAR(50) DEFAULT 'member',
        joined_at TIMESTAMP DEFAULT NOW(),
        status VARCHAR(50) DEFAULT 'active',
        UNIQUE(club_id, user_id)
      )
    `);
    console.log('✓ Table club_members created');

    await query(`CREATE INDEX IF NOT EXISTS idx_club_members_club_id ON club_members(club_id)`);
    await query(`CREATE INDEX IF NOT EXISTS idx_club_members_user_id ON club_members(user_id)`);
    await query(`CREATE INDEX IF NOT EXISTS idx_club_members_role ON club_members(role)`);

    // 4. สร้างตาราง activities
    await query(`
      CREATE TABLE IF NOT EXISTS activities (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        location VARCHAR(255),
        max_participants INTEGER DEFAULT 10,
        status VARCHAR(50) DEFAULT 'pending',
        rejection_reason TEXT,
        
        -- Registration period (with deadline for backward compatibility)
        registration_start_date TIMESTAMP,
        registration_end_date TIMESTAMP,
        registration_deadline TIMESTAMP,
        registration_start_time TIME,
        registration_end_time TIME,
        
        -- Activity time
        start_date TIMESTAMP,
        end_date TIMESTAMP,
        start_time TIME,
        end_time TIME,
        
        -- Organization info
        club_id UUID REFERENCES clubs(id) ON DELETE SET NULL,
        created_by UUID REFERENCES users(id) ON DELETE SET NULL,
        
        -- Metadata
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log('✓ Table activities created');

    await query(`CREATE INDEX IF NOT EXISTS idx_activities_status ON activities(status)`);
    await query(`CREATE INDEX IF NOT EXISTS idx_activities_club_id ON activities(club_id)`);
    await query(`CREATE INDEX IF NOT EXISTS idx_activities_created_by ON activities(created_by)`);
    await query(`CREATE INDEX IF NOT EXISTS idx_activities_start_date ON activities(start_date)`);
    await query(`CREATE INDEX IF NOT EXISTS idx_activities_location ON activities(location)`);
    await query(`CREATE INDEX IF NOT EXISTS idx_activities_name ON activities(name)`);

    // 5. สร้างตาราง activity_images
    await query(`
      CREATE TABLE IF NOT EXISTS activity_images (
        id SERIAL PRIMARY KEY,
        activity_id INTEGER NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
        image_url VARCHAR(500) NOT NULL,
        is_cover BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log('✓ Table activity_images created');

    await query(`CREATE INDEX IF NOT EXISTS idx_activity_images_activity_id ON activity_images(activity_id)`);
    await query(`CREATE INDEX IF NOT EXISTS idx_activity_images_is_cover ON activity_images(is_cover)`);

    // 6. สร้างตาราง registrations
    await query(`
      CREATE TABLE IF NOT EXISTS registrations (
        id SERIAL PRIMARY KEY,
        activity_id INTEGER NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        status VARCHAR(50) DEFAULT 'pending',
        rejection_reason TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        approved_at TIMESTAMP,
        approved_by UUID REFERENCES users(id) ON DELETE SET NULL,
        UNIQUE(activity_id, user_id)
      )
    `);
    console.log('✓ Table registrations created');

    await query(`CREATE INDEX IF NOT EXISTS idx_registrations_activity_id ON registrations(activity_id)`);
    await query(`CREATE INDEX IF NOT EXISTS idx_registrations_user_id ON registrations(user_id)`);
    await query(`CREATE INDEX IF NOT EXISTS idx_registrations_status ON registrations(status)`);
    await query(`CREATE INDEX IF NOT EXISTS idx_registrations_approved_by ON registrations(approved_by)`);

    console.log('✅ All tables and indexes created successfully!');
  },

  async down(query) {
    console.log('Dropping all tables...');
    
    await query(`DROP TABLE IF EXISTS registrations CASCADE`);
    await query(`DROP TABLE IF EXISTS activity_images CASCADE`);
    await query(`DROP TABLE IF EXISTS activities CASCADE`);
    await query(`DROP TABLE IF EXISTS club_members CASCADE`);
    await query(`DROP TABLE IF EXISTS clubs CASCADE`);
    await query(`DROP TABLE IF EXISTS users CASCADE`);
    
    console.log('✅ All tables dropped!');
  }
};
