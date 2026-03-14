/**
 * PostgreSQL Migration Script
 * สคริปต์นี้สร้าง table โครงสร้างฐานข้อมูลสำหรับ Carbon Footprint Assessment
 * 
 * วิธีใช้:
 * node migrate.js
 */

require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME || 'carbon_footprint_db'
});

const migrationQueries = `
  -- สร้างตาราง assessments
  CREATE TABLE IF NOT EXISTS assessments (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    category VARCHAR(50),
    answers JSONB,
    avg_score DECIMAL(3, 2),
    comment TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );

  -- สร้าง indexes สำหรับความเร็วในการค้นหา
  CREATE INDEX IF NOT EXISTS idx_assessments_category ON assessments(category);
  CREATE INDEX IF NOT EXISTS idx_assessments_created_at ON assessments(created_at);
  CREATE INDEX IF NOT EXISTS idx_assessments_email ON assessments(email);

  -- สร้างตาราง audit log (ไม่บังคับ)
  CREATE TABLE IF NOT EXISTS audit_logs (
    id SERIAL PRIMARY KEY,
    assessment_id INTEGER REFERENCES assessments(id) ON DELETE CASCADE,
    action VARCHAR(100),
    details JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );

  -- สร้าง function สำหรับอัปเดต updated_at
  CREATE OR REPLACE FUNCTION update_assessments_updated_at()
  RETURNS TRIGGER AS $$
  BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
  END;
  $$ LANGUAGE plpgsql;

  -- สร้าง trigger
  DROP TRIGGER IF EXISTS update_assessments_timestamp ON assessments;
  CREATE TRIGGER update_assessments_timestamp
  BEFORE UPDATE ON assessments
  FOR EACH ROW
  EXECUTE FUNCTION update_assessments_updated_at();
`;

async function runMigrations() {
  const client = await pool.connect();
  
  try {
    console.log('🔄 Running migrations...\n');
    
    // รันแต่ละ query แยกกัน
    const queries = migrationQueries
      .split(';')
      .map(q => q.trim())
      .filter(q => q.length > 0);

    for (const query of queries) {
      try {
        await client.query(query);
        const firstLine = query.split('\n')[0];
        console.log(`✅ ${firstLine}`);
      } catch (err) {
        console.error(`❌ Error:`, err.message);
      }
    }

    console.log('\n✅ All migrations completed successfully!');
    
  } catch (err) {
    console.error('❌ Migration failed:', err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

// เชื่อมต่อและรัน migrations
console.log('📊 Carbon Footprint Database Migration');
console.log('=====================================\n');
console.log(`Connecting to: ${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}\n`);

runMigrations().then(() => {
  console.log('\n✨ Ready to use!');
  process.exit(0);
}).catch(err => {
  console.error('Failed:', err);
  process.exit(1);
});