// Migration: Add time fields to activities table
// Created: 2025-09-27

const { query } = require('../persistence/db');

async function up() {
  try {
    console.log('Adding time fields to activities table...');
    
    // Add new columns for registration period and time details (one by one for PostgreSQL compatibility)
    await query(`ALTER TABLE activities ADD COLUMN IF NOT EXISTS registration_start_date TIMESTAMP WITH TIME ZONE`);
    await query(`ALTER TABLE activities ADD COLUMN IF NOT EXISTS registration_end_date TIMESTAMP WITH TIME ZONE`);
    await query(`ALTER TABLE activities ADD COLUMN IF NOT EXISTS start_time TIME`);
    await query(`ALTER TABLE activities ADD COLUMN IF NOT EXISTS end_time TIME`);
    await query(`ALTER TABLE activities ADD COLUMN IF NOT EXISTS registration_start_time TIME`);
    await query(`ALTER TABLE activities ADD COLUMN IF NOT EXISTS registration_end_time TIME`);

    // Add check constraints for registration period
    await query(`
      ALTER TABLE activities 
      ADD CONSTRAINT IF NOT EXISTS activities_registration_period_check 
      CHECK (
        registration_end_date IS NULL OR 
        registration_start_date IS NULL OR 
        registration_end_date >= registration_start_date
      )
    `);

    // Add check constraint that registration period should be before activity start
    await query(`
      ALTER TABLE activities 
      ADD CONSTRAINT IF NOT EXISTS activities_registration_before_start_check 
      CHECK (
        registration_end_date IS NULL OR 
        start_date IS NULL OR 
        registration_end_date <= start_date
      )
    `);

    // Add indexes for performance
    await query(`
      CREATE INDEX IF NOT EXISTS idx_activities_registration_start 
      ON activities (registration_start_date)
    `);
    
    await query(`
      CREATE INDEX IF NOT EXISTS idx_activities_registration_end 
      ON activities (registration_end_date)
    `);

    console.log('✓ Successfully added time fields to activities table');
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  }
}

async function down() {
  try {
    console.log('Removing time fields from activities table...');
    
    // Drop indexes
    await query('DROP INDEX IF EXISTS idx_activities_registration_start');
    await query('DROP INDEX IF EXISTS idx_activities_registration_end');
    
    // Drop constraints
    await query('ALTER TABLE activities DROP CONSTRAINT IF EXISTS activities_registration_period_check');
    await query('ALTER TABLE activities DROP CONSTRAINT IF EXISTS activities_registration_before_start_check');
    
    // Drop columns (one by one)
    await query(`ALTER TABLE activities DROP COLUMN IF EXISTS registration_start_date`);
    await query(`ALTER TABLE activities DROP COLUMN IF EXISTS registration_end_date`);
    await query(`ALTER TABLE activities DROP COLUMN IF EXISTS start_time`);
    await query(`ALTER TABLE activities DROP COLUMN IF EXISTS end_time`);
    await query(`ALTER TABLE activities DROP COLUMN IF EXISTS registration_start_time`);
    await query(`ALTER TABLE activities DROP COLUMN IF EXISTS registration_end_time`);
    
    console.log('✓ Successfully removed time fields from activities table');
  } catch (error) {
    console.error('Migration rollback failed:', error);
    throw error;
  }
}

module.exports = { up, down };
