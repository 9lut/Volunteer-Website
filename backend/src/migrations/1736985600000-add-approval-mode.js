// Migration: Add approval_mode to activities table
// Created: 2025-01-16

module.exports = {
  async up(db) {
    console.log('Adding approval_mode column to activities table...');
    
    await db.query(`
      ALTER TABLE activities
      ADD COLUMN IF NOT EXISTS approval_mode VARCHAR(20) DEFAULT 'manual'
      CHECK (approval_mode IN ('auto', 'manual'));
    `);
    
    // Set default for existing activities to 'manual' (current behavior)
    await db.query(`
      UPDATE activities 
      SET approval_mode = 'manual' 
      WHERE approval_mode IS NULL;
    `);
    
    console.log('✅ Added approval_mode column with default "manual"');
  },

  async down(db) {
    console.log('Removing approval_mode column from activities table...');
    await db.query(`
      ALTER TABLE activities DROP COLUMN IF EXISTS approval_mode;
    `);
    console.log('✅ Removed approval_mode column');
  }
};
