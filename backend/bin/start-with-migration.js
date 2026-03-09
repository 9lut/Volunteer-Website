/**
 * Start script with automatic database migration
 * รัน Migration อัตโนมัติก่อนเริ่มต้น Server
 * 
 * จะทำการ:
 * 1. ตรวจสอบ DATABASE_URL
 * 2. รัน Migration (สร้างตารางและข้อมูลเริ่มต้น)
 * 3. เริ่มต้น Server
 */

require('dotenv').config();

const path = require('path');
const migrate = require('migrate');
const stateStore = require('../src/persistence/postgres-state-storage');
const Server = require('../server');

const migrationsDirectory = path.resolve(__dirname, '../src/migrations');

// ตรวจสอบ DATABASE_URL
if (!process.env.DATABASE_URL || typeof process.env.DATABASE_URL !== 'string') {
  console.error('❌ Error: Missing or invalid DATABASE_URL environment variable');
  console.error('Please set DATABASE_URL in your .env file');
  console.error('Example: DATABASE_URL=postgres://user:pass@localhost:5432/dbname');
  process.exit(1);
}

console.log('🔄 Starting application with automatic migration...');
console.log('📦 Database:', process.env.DATABASE_URL.replace(/:[^:@]+@/, ':****@')); // Hide password

// ฟังก์ชันรัน Migration
async function runMigrations() {
  return new Promise((resolve, reject) => {
    migrate.load(
      { stateStore, migrationsDirectory },
      (err, set) => {
        if (err) {
          return reject(err);
        }
        
        // รัน migration 'up' (apply all pending migrations)
        set.up((err2) => {
          if (err2) {
            return reject(err2);
          }
          resolve();
        });
      }
    );
  });
}

// Main execution
async function start() {
  try {
    console.log('🔧 Running database migrations...');
    await runMigrations();
    console.log('✅ Database migrations completed successfully!\n');
    
    const port = process.env.PORT || 3000;
    console.log(`🚀 Starting server on port ${port}...`);
    Server.start(port);
    
  } catch (error) {
    console.error('❌ Failed to start application:');
    console.error(error.stack || error.message || error);
    console.error('\nPlease check:');
    console.error('1. Database connection is working');
    console.error('2. DATABASE_URL is correct');
    console.error('3. Database user has necessary permissions');
    process.exit(1);
  }
}

// เริ่มต้นโปรแกรม
start();
