require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const path = require('path');
// Vercel deployment with environment variables

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '..')));

// PostgreSQL Pool Configuration
const pool = process.env.DATABASE_URL 
  ? new Pool({ connectionString: process.env.DATABASE_URL })
  : new Pool({
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 5432,
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
      database: process.env.DB_NAME || 'carbon_footprint_db'
    });

// ตรวจสอบการเชื่อมต่อฐานข้อมูล
pool.on('connect', () => {
  console.log('✅ Connected to PostgreSQL Database');
});

pool.on('error', (err) => {
  console.error('❌ Unexpected error on idle client', err);
});

// สร้างตารางอัตโนมัติ (ครั้งแรก)
async function initializeDatabase() {
  try {
    // สร้างตาราง users
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

    // สร้างตาราง assessments
    await pool.query(`
      CREATE TABLE IF NOT EXISTS assessments (
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

    // สร้าง indexes
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_username ON assessments(username);`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_category ON assessments(category);`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_created_at ON assessments(created_at);`);
    
    console.log('✅ Database tables initialized successfully');
  } catch (err) {
    console.error('❌ Error initializing database:', err);
  }
}

// ===== User Management Endpoints =====

// Endpoint สมัครสมาชิก
app.post('/api/auth/register', async (req, res) => {
  const { username, password, firstName, lastName, email, phone } = req.body;
  
  try {
    // ตรวจสอบว่าชื่อผู้ใช้มีอยู่หรือไม่
    const check = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
    if (check.rows.length > 0) {
      return res.status(400).json({ status: 'error', message: 'ชื่อผู้ใช้นี้ถูกใช้ไปแล้ว' });
    }
    
    const query = `
      INSERT INTO users (username, password, first_name, last_name, email, phone)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING username, first_name, last_name, email, phone;
    `;
    
    const result = await pool.query(query, [username, password, firstName, lastName, email, phone]);
    const user = result.rows[0];
    
    res.json({ 
      status: 'ok', 
      user: {
        username: user.username,
        firstName: user.first_name,
        lastName: user.last_name,
        email: user.email,
        phone: user.phone
      }
    });
  } catch (err) {
    console.error('Database error:', err);
    res.status(500).json({ status: 'error', message: err.message });
  }
});

// Endpoint เข้าสู่ระบบ
app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body;
  
  try {
    const query = `
      SELECT username, first_name, last_name, email, phone, role 
      FROM users 
      WHERE username = $1 AND password = $2
    `;
    
    const result = await pool.query(query, [username, password]);
    
    if (result.rows.length === 0) {
      return res.status(401).json({ status: 'error', message: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง' });
    }
    
    const user = result.rows[0];
    res.json({ 
      status: 'ok', 
      user: {
        username: user.username,
        firstName: user.first_name,
        lastName: user.last_name,
        email: user.email,
        phone: user.phone,
        role: user.role || 'user'
      }
    });
  } catch (err) {
    console.error('Database error:', err);
    res.status(500).json({ status: 'error', message: err.message });
  }
});

// ===== Assessment Endpoints =====

// บันทึกข้อมูลการประเมิน
app.post('/api/assessment', async (req, res) => {
  const { username, category, answers, avgScore, comment } = req.body;
  
  try {
    const query = `
      INSERT INTO assessments (username, category, answers, avg_score, comment)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id;
    `;
    
    const values = [username, category, JSON.stringify(answers), avgScore, comment];
    const result = await pool.query(query, values);
    
    res.json({ status: 'ok', id: result.rows[0].id });
  } catch (err) {
    console.error('Database error:', err);
    res.status(500).json({ status: 'error', message: err.message });
  }
});

// ===== Admin Endpoints =====

// ดึงรายชื่อ users ทั้งหมด (Admin only)
app.get('/api/admin/users', async (req, res) => {
  try {
    const query = `
      SELECT id, username, first_name, last_name, email, phone, role, created_at 
      FROM users 
      ORDER BY created_at DESC
    `;
    const result = await pool.query(query);
    res.json(result.rows);
  } catch (err) {
    console.error('Database error:', err);
    res.status(500).json({ status: 'error', message: err.message });
  }
});

// ดึงข้อมูลการประเมินทั้งหมด พร้อมข้อมูล user (Admin only)
app.get('/api/admin/assessments', async (req, res) => {
  try {
    const query = `
      SELECT 
        a.id, a.username, a.category, a.answers, 
        a.avg_score, a.comment, a.created_at,
        u.first_name, u.last_name, u.email, u.phone
      FROM assessments a
      LEFT JOIN users u ON a.username = u.username
      ORDER BY a.created_at DESC
    `;
    const result = await pool.query(query);
    
    const data = result.rows.map(row => ({
      ...row,
      avg_score: parseFloat(row.avg_score)
    }));
    
    res.json(data);
  } catch (err) {
    console.error('Database error:', err);
    res.status(500).json({ status: 'error', message: err.message });
  }
});

// ส่งออกข้อมูลการประเมินเป็นไฟล์ Excel (Admin only)
app.get('/api/admin/assessments/export', async (req, res) => {
  try {
    const ExcelJS = require('exceljs');
    const { category } = req.query;
    
    // ดึงข้อมูลการประเมิน
    let query = `
      SELECT 
        a.id, a.username, a.category, a.answers, 
        a.avg_score, a.comment, a.created_at,
        u.first_name, u.last_name, u.email, u.phone
      FROM assessments a
      LEFT JOIN users u ON a.username = u.username
    `;
    
    const params = [];
    if (category) {
      query += ` WHERE a.category = $1`;
      params.push(category);
    }
    
    query += ` ORDER BY a.created_at DESC`;
    
    const result = await pool.query(query, params);
    
    // สร้าง Workbook
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('ผลการประเมิน');
    
    // ตั้งค่า columns
    worksheet.columns = [
      { header: 'ลำดับ', key: 'id', width: 8 },
      { header: 'ชื่อผู้ใช้', key: 'username', width: 15 },
      { header: 'ชื่อจริง', key: 'first_name', width: 15 },
      { header: 'นามสกุล', key: 'last_name', width: 15 },
      { header: 'อีเมล', key: 'email', width: 20 },
      { header: 'เบอร์โทร', key: 'phone', width: 15 },
      { header: 'หมวดหมู่', key: 'category', width: 15 },
      { header: 'คะแนน', key: 'avg_score', width: 10 },
      { header: 'หมายเหตุ', key: 'comment', width: 25 },
      { header: 'วันที่สอบ', key: 'created_at', width: 20 }
    ];
    
    // เพิ่มข้อมูล
    result.rows.forEach((row, index) => {
      worksheet.addRow({
        id: index + 1,
        username: row.username,
        first_name: row.first_name || '-',
        last_name: row.last_name || '-',
        email: row.email || '-',
        phone: row.phone || '-',
        category: row.category,
        avg_score: parseFloat(row.avg_score || 0).toFixed(2),
        comment: row.comment || '-',
        created_at: new Date(row.created_at).toLocaleDateString('th-TH')
      });
    });
    
    // สไตล์ header
    worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    worksheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4CAF50' } };
    worksheet.getRow(1).alignment = { horizontal: 'center', vertical: 'center' };
    
    // ส่งไฟล์
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="assessment_${new Date().getTime()}.xlsx"`);
    
    await workbook.xlsx.write(res);
    res.end();
    
  } catch (err) {
    console.error('Export error:', err);
    res.status(500).json({ status: 'error', message: err.message });
  }
});

// ดึงสถิติการประเมิน (Admin only)
app.get('/api/admin/stats', async (req, res) => {
  try {
    const query = `
      SELECT 
        category, 
        COUNT(*) as count, 
        AVG(avg_score) as avg_score,
        MIN(avg_score) as min_score,
        MAX(avg_score) as max_score
      FROM assessments
      GROUP BY category
      ORDER BY count DESC
    `;
    const result = await pool.query(query);
    res.json(result.rows);
  } catch (err) {
    console.error('Database error:', err);
    res.status(500).json({ status: 'error', message: err.message });
  }
});

// ดึงข้อมูลผู้ใช้ 1 คน พร้อมคะแนนทั้งหมด (Admin only)
app.get('/api/admin/user/:username', async (req, res) => {
  const { username } = req.params;
  
  try {
    const userQuery = `SELECT * FROM users WHERE username = $1`;
    const userResult = await pool.query(userQuery, [username]);
    
    if (userResult.rows.length === 0) {
      return res.status(404).json({ status: 'error', message: 'User not found' });
    }
    
    const assessmentQuery = `
      SELECT id, category, avg_score, comment, created_at 
      FROM assessments 
      WHERE username = $1 
      ORDER BY created_at DESC
    `;
    const assessmentResult = await pool.query(assessmentQuery, [username]);
    
    res.json({
      user: userResult.rows[0],
      assessments: assessmentResult.rows
    });
  } catch (err) {
    console.error('Database error:', err);
    res.status(500).json({ status: 'error', message: err.message });
  }
});

// สร้าง user ใหม่ (Admin only)
app.post('/api/admin/users/create', async (req, res) => {
  const { username, password, firstName, lastName, email, phone, role } = req.body;
  
  try {
    // ตรวจสอบว่าชื่อผู้ใช้มีอยู่หรือไม่
    const check = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
    if (check.rows.length > 0) {
      return res.status(400).json({ status: 'error', message: 'ชื่อผู้ใช้นี้ถูกใช้ไปแล้ว' });
    }
    
    const query = `
      INSERT INTO users (username, password, first_name, last_name, email, phone, role)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING username, first_name, last_name, email, phone, role
    `;
    
    const result = await pool.query(query, [username, password, firstName, lastName, email, phone, role || 'user']);
    const user = result.rows[0];
    
    res.json({ 
      status: 'ok', 
      message: 'User created successfully',
      user: user
    });
  } catch (err) {
    console.error('Database error:', err);
    res.status(500).json({ status: 'error', message: err.message });
  }
});

// แก้ไข role ของ user (Admin only)
app.put('/api/admin/users/:username/role', async (req, res) => {
  const { username } = req.params;
  const { role } = req.body;
  
  try {
    const query = `
      UPDATE users SET role = $1 WHERE username = $2
      RETURNING username, first_name, last_name, email, role
    `;
    
    const result = await pool.query(query, [role, username]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ status: 'error', message: 'User not found' });
    }
    
    res.json({ 
      status: 'ok',
      message: 'Role updated successfully',
      user: result.rows[0]
    });
  } catch (err) {
    console.error('Database error:', err);
    res.status(500).json({ status: 'error', message: err.message });
  }
});

// ลบ user (Admin only)
app.delete('/api/admin/users/:username', async (req, res) => {
  const { username } = req.params;
  
  // ป้องกันการลบ admin
  if (username === 'adminkm') {
    return res.status(403).json({ status: 'error', message: 'ไม่สามารถลบ admin account ได้' });
  }
  
  try {
    const result = await pool.query('DELETE FROM users WHERE username = $1 RETURNING username', [username]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ status: 'error', message: 'User not found' });
    }
    
    res.json({ 
      status: 'ok',
      message: 'User deleted successfully'
    });
  } catch (err) {
    console.error('Database error:', err);
    res.status(500).json({ status: 'error', message: err.message });
  }
});

// ดึงข้อมูลการประเมินทั้งหมด
app.get('/api/assessments', async (req, res) => {
  try {
    const query = `
      SELECT 
        a.id, a.username, a.category, a.answers, 
        a.avg_score, a.comment, a.created_at,
        u.first_name, u.last_name, u.email, u.phone
      FROM assessments a
      LEFT JOIN users u ON a.username = u.username
      ORDER BY a.created_at DESC;
    `;
    const result = await pool.query(query);
    
    const data = result.rows.map(row => ({
      ...row,
      answers: row.answers,
      avgScore: parseFloat(row.avg_score),
      name: `${row.first_name} ${row.last_name}`
    }));
    
    res.json(data);
  } catch (err) {
    console.error('Database error:', err);
    res.status(500).json({ status: 'error', message: err.message });
  }
});

// ดึงข้อมูลตามหมวดหมู่
app.get('/api/assessments/:category', async (req, res) => {
  const { category } = req.params;
  
  try {
    const query = `
      SELECT 
        a.id, a.username, a.category, a.answers, 
        a.avg_score, a.comment, a.created_at,
        u.first_name, u.last_name, u.email, u.phone
      FROM assessments a
      LEFT JOIN users u ON a.username = u.username
      WHERE a.category = $1 
      ORDER BY a.created_at DESC;
    `;
    const result = await pool.query(query, [category]);
    
    const data = result.rows.map(row => ({
      ...row,
      answers: row.answers,
      avgScore: parseFloat(row.avg_score),
      name: `${row.first_name} ${row.last_name}`
    }));
    
    res.json(data);
  } catch (err) {
    console.error('Database error:', err);
    res.status(500).json({ status: 'error', message: err.message });
  }
});

// ดึงสรุปผลการประเมิน
app.get('/api/summary', async (req, res) => {
  try {
    const query = `
      SELECT 
        category, 
        COUNT(*) as count, 
        AVG(avg_score) as avg_score
      FROM assessments
      GROUP BY category;
    `;
    const result = await pool.query(query);
    res.json(result.rows);
  } catch (err) {
    console.error('Database error:', err);
    res.status(500).json({ status: 'error', message: err.message });
  }
});

// ส่งออกเป็น CSV
app.get('/api/export/csv', async (req, res) => {
  try {
    const query = 'SELECT * FROM assessments ORDER BY created_at DESC;';
    const result = await pool.query(query);

    let csv = 'ลำดับที่,ชื่อ-สกุล,อีเมล,เบอร์โทร,หมวดหมู่,คะแนนเฉลี่ย,ความเห็น,วันที่\n';
    
    result.rows.forEach((row, index) => {
      csv += `${index + 1},"${row.name}","${row.email}","${row.phone || ''}","${row.category}",${row.avg_score},"${row.comment || ''}","${row.created_at}"\n`;
    });

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="assessment_results.csv"');
    res.send('\uFEFF' + csv);
  } catch (err) {
    console.error('Database error:', err);
    res.status(500).send('Database error');
  }
});

// ส่งออกเป็น TXT
app.get('/api/export/txt', async (req, res) => {
  try {
    const query = 'SELECT * FROM assessments ORDER BY created_at DESC;';
    const result = await pool.query(query);

    let text = '';
    text += '═══════════════════════════════════════════════════════════\n';
    text += '         สรุปผลการประเมิน Carbon Footprint for School\n';
    text += '═══════════════════════════════════════════════════════════\n\n';

    result.rows.forEach((row, index) => {
      text += `ลำดับที่: ${index + 1}\n`;
      text += `ชื่อ-สกุล: ${row.name}\n`;
      text += `อีเมล: ${row.email}\n`;
      text += `เบอร์โทร: ${row.phone || '-'}\n`;
      text += `หมวดหมู่: ${row.category}\n`;
      text += `คะแนนเฉลี่ย: ${row.avg_score}/5.00\n`;
      text += `ความเห็น: ${row.comment || '-'}\n`;
      text += `วันที่: ${row.created_at}\n`;
      text += '───────────────────────────────────────────────────────────\n\n';
    });

    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="assessment_results.txt"');
    res.send(text);
  } catch (err) {
    console.error('Database error:', err);
    res.status(500).send('Database error');
  }
});

// ดึงข้อมูลสถิติ
app.get('/api/stats', async (req, res) => {
  try {
    const query = 'SELECT * FROM assessments;';
    const result = await pool.query(query);

    const stats = {
      totalCount: result.rows.length,
      avgScore: result.rows.length > 0 ? 
        (result.rows.reduce((sum, r) => sum + parseFloat(r.avg_score), 0) / result.rows.length).toFixed(2) 
        : 0,
      categories: {}
    };

    result.rows.forEach(row => {
      if (!stats.categories[row.category]) {
        stats.categories[row.category] = { count: 0, avgScore: 0, scores: [] };
      }
      stats.categories[row.category].count++;
      stats.categories[row.category].scores.push(parseFloat(row.avg_score));
    });

    Object.keys(stats.categories).forEach(cat => {
      const scores = stats.categories[cat].scores;
      stats.categories[cat].avgScore = (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(2);
      delete stats.categories[cat].scores;
    });

    res.json(stats);
  } catch (err) {
    console.error('Database error:', err);
    res.status(500).json({ status: 'error', message: err.message });
  }
});

// Health check endpoint
app.get('/api/health', async (req, res) => {
  try {
    await pool.query('SELECT NOW()');
    res.json({ status: 'ok', database: 'connected', timestamp: new Date().toISOString() });
  } catch (err) {
    res.status(500).json({ status: 'error', database: 'disconnected', error: err.message });
  }
});

// เริ่มต้น Server
const PORT = process.env.SERVER_PORT || 3000;

(async () => {
  try {
    await initializeDatabase();
    app.listen(PORT, () => {
      console.log(`✅ Backend running at http://localhost:${PORT}`);
      console.log(`📊 Admin Dashboard: http://localhost:${PORT}/admin.html`);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
})();

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n📍 Shutting down gracefully...');
  await pool.end();
  process.exit(0);
});
