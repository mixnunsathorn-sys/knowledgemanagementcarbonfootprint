require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL 
});

async function testConnection() {
  try {
    console.log('🔄 Testing connection to Railway PostgreSQL...');
    console.log('📍 Database URL:', process.env.DATABASE_URL);
    
    // Test connection
    const result = await pool.query('SELECT NOW()');
    console.log('✅ Connection successful!');
    console.log('📅 Server time:', result.rows[0].now);
    
    // Check tables
    const tables = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);
    
    console.log('\n📊 Tables in database:');
    tables.rows.forEach(row => {
      console.log(`  ✓ ${row.table_name}`);
    });
    
    // Check users count
    const users = await pool.query('SELECT COUNT(*) as count FROM users');
    console.log('\n👥 Users count:', users.rows[0].count);
    
    // List users
    const userList = await pool.query('SELECT username, role FROM users');
    console.log('👤 Users:');
    userList.rows.forEach(user => {
      console.log(`  - ${user.username} (${user.role})`);
    });
    
    console.log('\n✅ All tests passed! Railway database is working correctly.');
    
    await pool.end();
  } catch (err) {
    console.error('❌ Connection failed:', err.message);
    process.exit(1);
  }
}

testConnection();
