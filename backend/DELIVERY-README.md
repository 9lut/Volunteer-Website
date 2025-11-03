# 📦 ชุดไฟล์ส่งมอบ Backend - Volunteer Management System

> **วันที่ส่งมอบ:** 3 พฤศจิกายน 2568

---

## 📁 ไฟล์ที่ส่งมอบ

### 1. โค้ด Backend
- ✅ โฟลเดอร์ `backend/` ทั้งหมด
- ✅ `package.json` - Dependencies และ Scripts
- ✅ `Dockerfile` - สำหรับ build Docker image
- ✅ `docker-compose.yaml` - สำหรับรัน local development

### 2. Database Files
- ✅ `database-full-backup.sql` (60 KB) - **แนะนำใช้ไฟล์นี้**
  - มีทั้งโครงสร้างตารางและข้อมูลทั้งหมด
  - พร้อมใช้งานทันที
  
- ✅ `database-schema-only.sql` (36 KB)
  - เฉพาะโครงสร้างตาราง
  - ใช้ถ้าต้องการรัน migration เอง
  
- ✅ `database-data-only.sql` (39 KB)
  - เฉพาะข้อมูล (INSERT statements)
  - ใช้ร่วมกับ schema

### 3. เอกสารคู่มือ
- ✅ `DEPLOYMENT.md` - คู่มือการ Deploy แบบละเอียด
- ✅ `DATABASE-IMPORT-GUIDE.md` - คู่มือการ Import Database
- ✅ `DELIVERY-README.md` - เอกสารนี้
- ✅ `.env.example` - ตัวอย่าง Configuration

### 4. Migration Scripts
- ✅ `bin/start-with-migration.js` - เริ่มระบบพร้อม auto-migration
- ✅ `src/migrations/0001-create-all-tables.js` - สร้างตาราง
- ✅ `src/migrations/0002-insert-default-data.js` - ใส่ข้อมูลเริ่มต้น

---

## 🚀 Quick Start (เริ่มใช้งานเร็ว)

### วิธีที่ 1: ใช้ Docker Compose (แนะนำสำหรับ Demo)

```powershell
# 1. Clone หรือแตก ZIP
cd backend

# 2. สร้าง .env file
Copy-Item .env.example .env
# แก้ไข .env ถ้าจำเป็น (default ใช้ได้เลย)

# 3. รัน Docker Compose
docker-compose up -d

# 4. Setup Database - เลือก 1 ใน 2 วิธี (อย่าใช้ทั้ง 2 พร้อมกัน!)

# ⭐ Option A: Import SQL (แนะนำ - เร็วที่สุด)
docker exec -i backend-postgres-1 psql -U user -d db < database-full-backup.sql

# หรือ

# Option B: Run Migration (สำหรับ Developer)
docker exec backend-app-1 npm run migrate:up

# 5. เข้าใช้งาน
# API: http://localhost:3000
# Database: localhost:35432
```

> 💡 **คำแนะนำ:** ใช้ **Option A (SQL Import)** สำหรับ Demo/การใช้งานทั่วไป เพราะเร็วและง่ายกว่า  
> ใช้ **Option B (Migration)** เมื่อต้องการพัฒนาต่อหรือแก้ไข schema  
> ดูรายละเอียดการเปรียบเทียบใน `WHICH-METHOD-TO-USE.md`

### วิธีที่ 2: รันแบบ Production (Cloud/VPS)

```bash
# 1. ติดตั้ง Dependencies
npm install --production

# 2. ตั้งค่า Environment Variables
# สร้าง .env หรือตั้งค่าใน platform
DATABASE_URL=postgres://user:pass@host:port/dbname
NODE_ENV=production
PORT=3000
SESSION_SECRET=your-random-secret-key

# 3. รัน Migration + Start Server
npm run start:migrate

# หรือถ้ามี database อยู่แล้ว
npm start
```

---

## 🎓 Default Accounts (หลัง Import/Migration)

| Role | Email | Password | คำอธิบาย |
|------|-------|----------|----------|
| **Admin** | admin@volunteer.com | admin123 | ผู้ดูแลระบบ (จัดการทั้งหมด) |
| **President** | president@volunteer.com | president123 | ประธานชมรม (สร้างกิจกรรม) |
| **Student** | student@volunteer.com | student123 | นักศึกษา (ลงทะเบียนกิจกรรม) |

⚠️ **สำคัญมาก:** เปลี่ยน password ทั้งหมดนี้ใน production!

---

## 📊 Database Schema

ระบบมีตารางหลัก 6 ตาราง:

1. **users** - ผู้ใช้งาน (students, presidents, admin)
2. **clubs** - ชมรมต่างๆ
3. **club_members** - สมาชิกในแต่ละชมรม
4. **activities** - กิจกรรมที่เปิดรับสมัคร
5. **activity_images** - รูปภาพของกิจกรรม
6. **registrations** - การลงทะเบียนเข้าร่วมกิจกรรม

---

## 🔧 NPM Scripts ที่สำคัญ

```json
{
  "start": "npm run start:migrate",           // เริ่มระบบพร้อม auto-migration
  "start:migrate": "...",                     // เริ่มระบบพร้อม auto-migration
  "start:simple": "...",                      // เริ่มระบบธรรมดา (ไม่รัน migration)
  "dev": "nodemon ./bin/start.js",            // Development mode
  "migrate:up": "node ./bin/migrate.js up",   // รัน migration (สร้างตาราง)
  "migrate:down": "node ./bin/migrate.js down" // Rollback migration
}
```

---

## 📌 สิ่งที่ต้องทำก่อน Deploy Production

### 1. ✅ แก้ไข Environment Variables

```env
# .env
DATABASE_URL=postgres://production_user:secure_password@host:port/prod_db
NODE_ENV=production
SESSION_SECRET=<สร้าง random secret ที่ปลอดภัย>
PORT=3000
```

**วิธีสร้าง secure session secret:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 2. ✅ เปลี่ยน Default Passwords

เข้า database แล้วเปลี่ยน password ทั้งหมด หรือลบ accounts ทดสอบออก:

```sql
-- เปลี่ยน password
UPDATE users SET password = '<hashed-new-password>' WHERE email = 'admin@volunteer.com';

-- หรือลบ accounts ทดสอบ
DELETE FROM users WHERE email IN (
  'admin@volunteer.com', 
  'president@volunteer.com', 
  'student@volunteer.com'
);
```

### 3. ✅ ตั้งค่า CORS

แก้ไข `server.js` ให้ CORS อนุญาตเฉพาะ domain ของคุณ:

```javascript
const cors = require('cors');
app.use(cors({
  origin: 'https://your-frontend-domain.com',
  credentials: true
}));
```

### 4. ✅ เปิด HTTPS

- ใช้ Reverse Proxy (Nginx) + Let's Encrypt
- หรือใช้ Cloud Platform ที่มี SSL built-in (Railway, Render)

### 5. ✅ Setup Backup

สร้าง backup script อัตโนมัติ:

```bash
# crontab -e (Linux)
0 2 * * * docker exec backend-postgres-1 pg_dump -U user -d db > /backups/db-$(date +\%Y\%m\%d).sql
```

---

## 🌐 Platform-Specific Instructions

### Railway.app
1. Create new project → Deploy from GitHub
2. Add PostgreSQL database
3. Set `start:migrate` as start command
4. Deploy! (auto-deploy on git push)

### Render.com
1. New → Web Service → Connect repository
2. New → PostgreSQL → Copy Internal Database URL
3. Add DATABASE_URL to Web Service env vars
4. Set build: `npm install`, start: `npm run start:migrate`

### Heroku
```bash
heroku create volunteer-backend
heroku addons:create heroku-postgresql:mini
heroku config:set NODE_ENV=production
git push heroku main
```

### VPS/EC2 (Ubuntu)
ดูคู่มือละเอียดใน `DEPLOYMENT.md`

---

## 📞 การแก้ปัญหาเบื้องต้น

### ❌ Migration ไม่ทำงาน
```bash
# ตรวจสอบ DATABASE_URL
echo $DATABASE_URL

# รัน migration manual
npm run migrate:up

# ดู error
npm run start:migrate 2>&1 | tee error.log
```

### ❌ Database connection failed
```bash
# ตรวจสอบว่า PostgreSQL ทำงาน
docker ps | grep postgres

# ลองเชื่อมต่อโดยตรง
psql $DATABASE_URL
```

### ❌ Port already in use
```bash
# Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# หรือเปลี่ยน PORT ใน .env
PORT=3001
```

---

## 📚 เอกสารเพิ่มเติม

1. **`DEPLOYMENT.md`** - คู่มือ Deploy แบบละเอียด ทุก platform
2. **`DATABASE-IMPORT-GUIDE.md`** - คู่มือ Import database ทุกแบบ
3. **`README.md`** - เอกสารหลักของโปรเจค
4. **`.env.example`** - ตัวอย่าง configuration

---

## 🎯 สรุป 3 ขั้นตอน

### ✨ สำหรับผู้รับงาน:

1. **เริ่มต้นเร็ว (Local):**
   ```bash
   docker-compose up -d
   docker exec -i backend-postgres-1 psql -U user -d db < database-full-backup.sql
   # เข้าใช้ที่ http://localhost:3000
   ```

2. **Deploy Production:**
   - เลือก platform (Railway/Render แนะนำ)
   - Connect GitHub repo
   - เพิ่ม PostgreSQL database
   - ตั้ง start command: `npm run start:migrate`
   - Deploy!

3. **ตรวจสอบ:**
   - ทดสอบ API endpoints
   - ทดสอบ login ด้วย default accounts
   - เปลี่ยน passwords ทั้งหมด!

---

## ✅ Checklist ก่อนใช้งาน

- [ ] ติดตั้ง dependencies (`npm install`)
- [ ] สร้าง `.env` จาก `.env.example`
- [ ] ตั้งค่า DATABASE_URL ให้ถูกต้อง
- [ ] Import database หรือรัน migration
- [ ] ทดสอบ login ด้วย default accounts
- [ ] เปลี่ยน SESSION_SECRET
- [ ] เปลี่ยน default passwords (Production)
- [ ] ตั้งค่า CORS ให้เฉพาะ frontend domain (Production)
- [ ] เปิด HTTPS (Production)
- [ ] Setup database backup (Production)

---

## 📧 ติดต่อ

หากมีปัญหาหรือคำถาม:
1. อ่าน `DEPLOYMENT.md` และ `DATABASE-IMPORT-GUIDE.md`
2. ตรวจสอบ logs ด้วย `docker-compose logs -f`
3. ตรวจสอบ DATABASE_URL ว่าถูกต้อง

---

**ขอให้การ Deploy สำเร็จ! 🚀✨**

*Last updated: November 3, 2025*
