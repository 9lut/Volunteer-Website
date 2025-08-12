exports.up = async function up(db) {
  // registrations: status/waitlist/updated_at + indexes
  await db.runSql(`
    ALTER TABLE registrations
      ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'registered',
      ADD COLUMN IF NOT EXISTS waitlist_position INTEGER,
      ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP NOT NULL DEFAULT NOW();
  `);
  await db.runSql(`CREATE INDEX IF NOT EXISTS idx_registrations_activity ON registrations(activity_id);`);
  await db.runSql(`CREATE INDEX IF NOT EXISTS idx_registrations_activity_status ON registrations(activity_id, status);`);

  // users: year/faculty/department (for eligibility filters) + indexes
  await db.runSql(`
    ALTER TABLE users
      ADD COLUMN IF NOT EXISTS year INTEGER,
      ADD COLUMN IF NOT EXISTS faculty TEXT,
      ADD COLUMN IF NOT EXISTS department TEXT;
  `);
  await db.runSql(`CREATE INDEX IF NOT EXISTS idx_users_year ON users(year);`);
  await db.runSql(`CREATE INDEX IF NOT EXISTS idx_users_faculty ON users(faculty);`);

  // activities: registration_open_at + useful indexes
  await db.runSql(`
    ALTER TABLE activities
      ADD COLUMN IF NOT EXISTS registration_open_at TIMESTAMP NULL;
  `);
  await db.runSql(`CREATE INDEX IF NOT EXISTS idx_activities_status_club ON activities(status, club_id);`);
  await db.runSql(`CREATE INDEX IF NOT EXISTS idx_activities_reg_deadline ON activities(registration_deadline);`);

  // attendance/activity_eligibility: indexes
  await db.runSql(`CREATE INDEX IF NOT EXISTS idx_attendance_activity ON attendance(activity_id);`);
  await db.runSql(`CREATE INDEX IF NOT EXISTS idx_eligibility_activity ON activity_eligibility(activity_id);`);
};

exports.down = async function down(db) {
  // Drop indexes
  await db.runSql(`DROP INDEX IF EXISTS idx_registrations_activity_status;`);
  await db.runSql(`DROP INDEX IF EXISTS idx_registrations_activity;`);
  await db.runSql(`DROP INDEX IF EXISTS idx_users_year;`);
  await db.runSql(`DROP INDEX IF EXISTS idx_users_faculty;`);
  await db.runSql(`DROP INDEX IF EXISTS idx_activities_status_club;`);
  await db.runSql(`DROP INDEX IF EXISTS idx_activities_reg_deadline;`);
  await db.runSql(`DROP INDEX IF EXISTS idx_attendance_activity;`);
  await db.runSql(`DROP INDEX IF EXISTS idx_eligibility_activity;`);

  // Remove added columns (safe drops)
  await db.runSql(`ALTER TABLE registrations DROP COLUMN IF EXISTS updated_at;`);
  await db.runSql(`ALTER TABLE registrations DROP COLUMN IF EXISTS waitlist_position;`);
  await db.runSql(`ALTER TABLE registrations DROP COLUMN IF EXISTS status;`);

  await db.runSql(`ALTER TABLE users DROP COLUMN IF EXISTS department;`);
  await db.runSql(`ALTER TABLE users DROP COLUMN IF EXISTS faculty;`);
  await db.runSql(`ALTER TABLE users DROP COLUMN IF EXISTS year;`);

  await db.runSql(`ALTER TABLE activities DROP COLUMN IF EXISTS registration_open_at;`);
};