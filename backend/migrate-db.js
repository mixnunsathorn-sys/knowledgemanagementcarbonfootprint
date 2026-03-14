require('dotenv').config();
const { Pool } = require('pg');

const pool = process.env.DATABASE_URL 
  ? new Pool({ connectionString: process.env.DATABASE_URL })
  : new Pool({
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 5432,
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
      database: process.env.DB_NAME || 'carbon_footprint_db'
    });

async function migrateDatabase() {
  try {
    console.log('🔄 Migrating database schema...');

    // ตรวจสอบการเชื่อมต่อ
    await pool.query('SELECT NOW()');
    console.log('✅ Connected to database');

    // ลบตาราง assessments ก่อน (เพราะมี foreign key)
    console.log('🗑️  Dropping assessments table...');
    await pool.query('DROP TABLE IF EXISTS assessments CASCADE');

    // ลบตาราง users และสร้างใหม่
    console.log('🗑️  Dropping users table...');
    await pool.query('DROP TABLE IF EXISTS users CASCADE');

    // สร้างตาราง users ใหม่พร้อม role column
    console.log('📋 Creating users table...');
    await pool.query(`
      CREATE TABLE users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(50) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        first_name VARCHAR(100) NOT NULL,
        last_name VARCHAR(100) NOT NULL,
        email VARCHAR(100) NOT NULL,
        phone VARCHAR(20),
        role VARCHAR(20) DEFAULT 'user',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✅ Users table created');

    // สร้างตาราง assessments ใหม่
    console.log('📋 Creating assessments table...');
    await pool.query(`
      CREATE TABLE assessments (
        id SERIAL PRIMARY KEY,
        username VARCHAR(50) NOT NULL,
        category VARCHAR(50),
        answers JSONB,
        avg_score DECIMAL(3, 2),
        comment TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (username) REFERENCES users(username) ON DELETE CASCADE
      );
    `);
    console.log('✅ Assessments table created');

    // สร้าง indexes
    console.log('⚙️  Creating indexes...');
    await pool.query(`CREATE INDEX idx_username ON assessments(username);`);
    await pool.query(`CREATE INDEX idx_category ON assessments(category);`);
    await pool.query(`CREATE INDEX idx_created_at ON assessments(created_at);`);
    console.log('✅ Indexes created');

    // เพิ่ม admin user
    console.log('👑 Adding admin user...');
    await pool.query(
      `INSERT INTO users (username, password, first_name, last_name, email, phone, role)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      ['adminkm', 'adminkm123', 'Admin', 'KM', 'admin@carbonkm.com', '0000000000', 'admin']
    );
    console.log('✅ Admin user created: adminkm / adminkm123');

    // แสดงรายชื่อ users ทั้งหมด
    const allUsers = await pool.query('SELECT username, first_name, last_name, email, role FROM users');
    console.log('\n📋 All users:');
    allUsers.rows.forEach(user => {
      console.log(`  - ${user.username} (${user.first_name} ${user.last_name}) - Role: ${user.role}`);
    });

    await pool.end();
    console.log('\n✅ Database migration completed successfully!');
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

migrateDatabase();
