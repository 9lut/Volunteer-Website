exports.up = async function up(db) {
  // Add capacity and registration_deadline to activities
  await db.runSql(`
    ALTER TABLE activities
    ADD COLUMN IF NOT EXISTS capacity INTEGER,
    ADD COLUMN IF NOT EXISTS registration_deadline TIMESTAMP NULL;
  `);

  // Create attendance table for check-in and hours
  await db.runSql(`
    CREATE TABLE IF NOT EXISTS attendance (
      id SERIAL PRIMARY KEY,
      activity_id INTEGER NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      checked_in_at TIMESTAMP NULL,
      hours NUMERIC(5,2) DEFAULT 0,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
      UNIQUE(activity_id, user_id)
    );
  `);

  // Optionally: eligibility table (by club or grade)
  await db.runSql(`
    CREATE TABLE IF NOT EXISTS activity_eligibility (
      id SERIAL PRIMARY KEY,
      activity_id INTEGER NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
      type TEXT NOT NULL, -- 'club' | 'grade'
      value TEXT NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
  `);
};

exports.down = async function down(db) {
  await db.runSql(`ALTER TABLE activities DROP COLUMN IF EXISTS registration_deadline;`);
  await db.runSql(`ALTER TABLE activities DROP COLUMN IF EXISTS capacity;`);
  await db.runSql(`DROP TABLE IF EXISTS activity_eligibility;`);
  await db.runSql(`DROP TABLE IF EXISTS attendance;`);
};