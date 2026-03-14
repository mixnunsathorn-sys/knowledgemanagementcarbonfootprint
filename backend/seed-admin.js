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

async function seedAdminUser() {
  try {
    // ตรวจสอบการเชื่อมต่อ
    await pool.query('SELECT NOW()');
    console.log('✅ Connected to database');

    // สร้างตาราง users ถ้ายังไม่มี
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
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
    console.log('✅ Users table ready');

    // ตรวจสอบว่า admin มีอยู่หรือไม่
    const check = await pool.query('SELECT * FROM users WHERE username = $1', ['adminkm']);
    
    if (check.rows.length > 0) {
      // อัปเดต role เป็น admin
      await pool.query(
        `UPDATE users SET role = $1 WHERE username = $2`,
        ['admin', 'adminkm']
      );
      console.log('✅ Admin user already exists - role set to admin');
    } else {
      // เพิ่ม admin user พร้อม role
      await pool.query(
        `INSERT INTO users (username, password, first_name, last_name, email, phone, role)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        ['adminkm', 'adminkm123', 'Admin', 'KM', 'admin@carbonkm.com', '0000000000', 'admin']
      );
      console.log('✅ Admin user created: adminkm / adminkm123');
    }

    // แสดงรายชื่อ users ทั้งหมด
    const allUsers = await pool.query('SELECT username, first_name, last_name, email FROM users');
    console.log('\n📋 All users:');
    allUsers.rows.forEach(user => {
      console.log(`  - ${user.username} (${user.first_name} ${user.last_name})`);
    });

    await pool.end();
    console.log('\n✅ Database seeding completed');
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

seedAdminUser();
