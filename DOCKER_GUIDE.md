# Docker Setup Guide - Carbon Footprint Backend

## 📦 ข้อกำหนด

- **Docker** v20.10+
- **Docker Compose** v1.29+ หรือ v2+

### ติดตั้ง Docker:
- **Windows/Mac**: https://www.docker.com/products/docker-desktop
- **Linux**: https://docs.docker.com/engine/install/

---

## 🚀 วิธีใช้งาน

### **Option 1: Development (ใช้ Docker สำหรับ PostgreSQL เท่านั้น)**

โปรแกรม Node.js รันบน local machine คุณ ส่วน PostgreSQL รันใน Docker

```bash
# 1. เริ่มต้น PostgreSQL Container
docker-compose -f docker-compose.dev.yml up -d

# 2. ติดตั้ง dependencies (ถ้ายังไม่)
cd backend
npm install

# 3. รันโปรแกรมบน Local
npm run dev
```

✅ **ข้อดี:**
- เร็ว (ไม่ต้อง build Docker)
- ง่ายแก้ไขโค้ด
- Debug ง่าย

**ที่อยู่:**
- Backend: http://localhost:3000
- Admin: http://localhost:3000/admin.html
- Database: localhost:5432

**หยุด PostgreSQL:**
```bash
docker-compose -f docker-compose.dev.yml down
```

---

### **Option 2: Full Docker (Backend + Database)**

โปรแกรม Node.js และ PostgreSQL ทั้งคู่รันใน Docker

```bash
# 1. Build Docker images
docker-compose build

# 2. เริ่มต้น containers
docker-compose up -d

# 3. รัน migration (ครั้งแรก)
docker-compose exec backend node migrate.js
```

✅ **ข้อดี:**
- ใช้ได้ทุกเครื่อง (Windows, Mac, Linux)
- ง่ายในการ Deploy
- Isolated environment

**ที่อยู่:**
- Backend: http://localhost:3000
- Admin: http://localhost:3000/admin.html

**หยุด:**
```bash
docker-compose down
```

---

### **Option 3: Production Deploy**

สำหรับใช้ขึ้น Server จริง

```bash
# ตั้งค่า environment variables
cp .env.example .env
# แล้วแก้ไข .env ให้ตรงกับการตั้งค่าจริง

# Build และ start
docker-compose -f docker-compose.prod.yml up -d

# ตรวจสอบสถานะ
docker-compose -f docker-compose.prod.yml ps
```

---

## 📋 คำสั่ง Docker Compose ที่สำคัญ

```bash
# เริ่มต้น containers
docker-compose up -d

# หยุด containers
docker-compose down

# ดูสถานะ containers
docker-compose ps

# ดูคำสั่ง logs
docker-compose logs -f backend
docker-compose logs -f postgres

# เข้าไป shell ของ container
docker-compose exec backend sh
docker-compose exec postgres psql -U admin -d carbon_footprint_db

# Rebuild images
docker-compose build --no-cache

# ลบข้อมูล volumes (ระวัง!)
docker-compose down -v
```

---

## 🗄️ เข้าถึง PostgreSQL

### ใน Docker Container:
```bash
# เข้า PostgreSQL shell
docker-compose exec postgres psql -U admin -d carbon_footprint_db

# ดูทั้งหมด tables
\dt

# ดูข้อมูล
SELECT * FROM assessments;

# ออก
\q
```

### ใน Local Machine (ถ้า expose port):
```bash
# ด้วย psql
psql -h localhost -U admin -d carbon_footprint_db

# ด้วย DBeaver
- Server: localhost
- Port: 5432
- Username: admin
- Password: admin
- Database: carbon_footprint_db
```

---

## 🔧 ตรวจสอบสถานะ

```bash
# ตรวจสอบ Backend API
curl http://localhost:3000/api/health

# ตรวจสอบ Database Status
docker-compose exec postgres pg_IsReady

# ดูข้อมูล containers
docker ps

# ดูข้อมูล images
docker images
```

---

## 🚨 Troubleshooting

### ❌ Port 5432 ถูก occupy
```bash
# หากใช้ postgres local อยู่แล้ว
# เปลี่ยน port ใน docker-compose.dev.yml
ports:
  - "5433:5432"  # เปลี่ยนจาก 5432 เป็น 5433
```

### ❌ Connection refused
```bash
# รอให้ PostgreSQL พร้อม
docker-compose logs postgres
docker-compose ps
```

### ❌ Permission denied
```bash
# Windows PowerShell ต้อง run as Administrator
# หรือใช้ Git Bash แทน
```

### ❌ Out of disk space
```bash
# ล้าง Docker cache
docker system prune -a --volumes
```

---

## 📁 File Structure

```
km/
├── docker-compose.yml          ← Production + Backend
├── docker-compose.dev.yml      ← Development (DB only)
├── docker-compose.prod.yml     ← Production (ถ้าต้อง)
├── Dockerfile                  ← Build image for Backend
├── .dockerignore                ← Files to ignore
└── backend/
    ├── .env                    ← Database credentials
    ├── .dockerignore            ← For backend image
    ├── package.json
    ├── server.js
    ├── migrate.js
    ├── init-db.sql             ← Auto-create tables
    └── node_modules/
```

---

## 🆚 เปรียบเทียบตัวเลือก

| ข้อ | Local PostgreSQL | Docker Dev | Full Docker |
|-----|-----------------|-----------|------------|
| **ความเร็ว** | ⚡⚡⚡ | ⚡⚡ | ⚡ |
| **ง่ายติดตั้ง** | ❌ | ✅ | ✅ |
| **ความปลอดภัย** | ❌ | ✓ | ✅✅ |
| **Portable** | ❌ | ✓ | ✅✅ |
| **Production Ready** | ❌ | ❌ | ✅✅ |

---

## 💡 Tips

1. **ใช้ Docker Compose Dev** สำหรับ Development
   - ไม่ต้อง build Docker image
   - โค้ดง่ายแก้ไข
   - เร็ว

2. **ใช้ Full Docker** สำหรับ Production
   - ส่วนต่างหากอยู่ใน container
   - ง่ายในการ scale
   - ทำให้ safe

3. **Backup Database:**
   ```bash
   docker-compose exec postgres pg_dump -U admin carbon_footprint_db > backup.sql
   ```

4. **Restore Database:**
   ```bash
   docker-compose exec -T postgres psql -U admin carbon_footprint_db < backup.sql
   ```

---

## 📞 Support

- Docker Docs: https://docs.docker.com/
- PostgreSQL Docker: https://hub.docker.com/_/postgres
- Docker Compose: https://docs.docker.com/compose/

---

**Happy Containerizing! 🐳**