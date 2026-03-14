# Carbon Footprint for School - Backend Setup

## 📋 ข้อกำหนด

- **Node.js** v14+ 
- **PostgreSQL** v12+
- **npm** หรือ **yarn**

---

## 🚀 ขั้นตอนการติดตั้ง

### 1️⃣ ติดตั้ง PostgreSQL

#### Windows:
1. ดาวน์โหลดจาก: https://www.postgresql.org/download/windows/
2. รันตัวติดตั้ง
3. จดชื่อผู้ใช้ (default: `postgres`) และรหัสผ่าน
4. ตั้งค่า port (default: `5432`)

#### macOS:
```bash
brew install postgresql@15
brew services start postgresql@15
```

#### Linux (Ubuntu/Debian):
```bash
sudo apt-get install postgresql postgresql-contrib
sudo service postgresql start
```

---

### 2️⃣ สร้างฐานข้อมูล

```sql
-- เปิด pgAdmin หรือ PostgreSQL CLI
CREATE DATABASE carbon_footprint_db;
```

หรือใช้ Command Line:
```bash
createdb -U postgres carbon_footprint_db
```

---

### 3️⃣ ตั้งค่าไฟล์ .env

```bash
# ไปที่โฟลเดอร์ backend
cd backend

# คัดลอก .env.example เป็น .env
cp .env.example .env
```

**แล้วแก้ไขไฟล์ .env ให้ตรงกับการตั้งค่า PostgreSQL ของคุณ:**

```env
# PostgreSQL Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=YOUR_PASSWORD  # ← เปลี่ยนเป็นรหัสผ่านจริง
DB_NAME=carbon_footprint_db

# Server Configuration
NODE_ENV=development
SERVER_PORT=3000

# API Configuration
CORS_ORIGIN=*
```

---

### 4️⃣ ติดตั้ง Dependencies

```bash
cd backend
npm install
```

---

### 5️⃣ รัน Migration สร้าง Tables

```bash
# สร้าง table และ indexes
node migrate.js
```

**ผลลัพธ์:**
```
✅ CREATE TABLE IF NOT EXISTS assessments
✅ CREATE INDEX IF NOT EXISTS idx_assessments_category
✅ CREATE INDEX IF NOT EXISTS idx_assessments_created_at
✅ CREATE INDEX IF NOT EXISTS idx_assessments_email
✅ All migrations completed successfully!
```

---

### 6️⃣ เริ่มต้น Server

```bash
# Development (with hot reload)
npm run dev

# หรือ Production
npm start
```

**ผลลัพธ์:**
```
✅ Connected to PostgreSQL Database
✅ Database tables initialized successfully
✅ Backend running at http://localhost:3000
📊 Admin Dashboard: http://localhost:3000/admin.html
```

---

## 📚 API Endpoints

### ส่งข้อมูลการประเมิน
```
POST /api/assessment
Content-Type: application/json

{
  "name": "ชื่อ สกุล",
  "email": "email@example.com",
  "phone": "0812345678",
  "category": "survey",
  "answers": [5, 4, 3, 5, 4, 3, 5, 4, 3, 5],
  "avgScore": 4.1,
  "comment": "ดีมาก"
}
```

### ดึงข้อมูลทั้งหมด
```
GET /api/assessments
```

### ดึงข้อมูลตามหมวดหมู่
```
GET /api/assessments/survey
GET /api/assessments/pre
GET /api/assessments/post
```

### ดึงสรุปผล
```
GET /api/summary
GET /api/stats
```

### ส่งออกข้อมูล
```
GET /api/export/csv
GET /api/export/txt
```

### ตรวจสอบ Database Connection
```
GET /api/health
```

---

## 🗄️ โครงสร้าง Database

### ตาราง: assessments

| Column | Type | Description |
|--------|------|-------------|
| id | SERIAL | รหัสการประเมิน (Auto) |
| name | VARCHAR(255) | ชื่อผู้ประเมิน |
| email | VARCHAR(255) | อีเมล |
| phone | VARCHAR(20) | เบอร์โทร |
| category | VARCHAR(50) | ประเภท (pre, post, survey) |
| answers | JSONB | คำตอบ (Array) |
| avg_score | DECIMAL(3, 2) | คะแนนเฉลี่ย |
| comment | TEXT | ความเห็น |
| created_at | TIMESTAMP | วันที่สร้าง |
| updated_at | TIMESTAMP | วันที่แก้ไข |

---

## 🛠️ สำหรับ Development

### ใช้ DBeaver เพื่อดูข้อมูล

1. ดาวน์โหลด: https://dbeaver.io/download/
2. เปิด DBeaver
3. File → New → Database Connection
4. เลือก PostgreSQL
5. กรอกข้อมูล:
   ```
   Server Host: localhost
   Port: 5432
   Database: carbon_footprint_db
   Username: postgres
   Password: YOUR_PASSWORD
   ```
6. Test Connection → อนุมัติ

---

## 📝 Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| DB_HOST | localhost | Database host |
| DB_PORT | 5432 | Database port |
| DB_USER | postgres | Database user |
| DB_PASSWORD | - | Database password |
| DB_NAME | carbon_footprint_db | Database name |
| NODE_ENV | development | Node environment |
| SERVER_PORT | 3000 | Server port |
| CORS_ORIGIN | * | CORS origin |

---

## ⚠️ Troubleshooting

### ❌ Error: connect ECONNREFUSED 127.0.0.1:5432

**ปัญหา**: PostgreSQL ไม่ได้รัน

**แก้ไข**:
```bash
# Windows
pg_ctl -D "C:\Program Files\PostgreSQL\15\data" start

# macOS
brew services start postgresql@15

# Linux
sudo service postgresql start
```

### ❌ Error: password authentication failed

**ปัญหา**: รหัสผ่าน .env ไม่ตรง

**แก้ไข**: ตรวจสอบ `DB_PASSWORD` ใน `.env` ให้ตรงกับรหัสผ่าน PostgreSQL

### ❌ Error: database "carbon_footprint_db" does not exist

**ปัญหา**: ยังไม่ได้สร้างฐานข้อมูล

**แก้ไข**:
```bash
psql -U postgres -c "CREATE DATABASE carbon_footprint_db;"
```

---

## 📊 Admin Dashboard

```
http://localhost:3000/admin.html
```

สามารถ:
- 📋 ดูข้อมูลทั้งหมดแบบตาราง
- 🔍 ค้นหาตามหมวดหมู่
- 📥 ดาวน์โหลด CSV/TXT
- 📈 ดูสถิติและสรุปผล

---

## 🔐 Security Tips

1. **ไม่ push .env ขึ้น GitHub**
   - ไฟล์ `.gitignore` ได้จัดการไว้แล้ว

2. **ปลี่ยนรหัสผ่าน PostgreSQL**
   ```sql
   ALTER USER postgres WITH PASSWORD 'new_strong_password';
   ```

3. **ใช้ HTTPS ในขั้นตอนการผลิต**
   - ตั้งค่า NODE_ENV=production

---

## 📞 Support

หากมีปัญหา:
1. ตรวจสอบ `DB_PASSWORD` ใน `.env`
2. ตรวจสอบว่า PostgreSQL รันอยู่หรือไม่
3. รันใหม่: `npm run dev`

---

**Happy Coding! 🚀**