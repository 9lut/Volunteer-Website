# 📥 คู่มือการ Import Database

> วิธีการนำเข้า Database สำหรับ Volunteer Management System

---

## 📋 ไฟล์ SQL ที่มีให้

| ไฟล์ | ขนาด | รายละเอียด | ใช้เมื่อไหร่ |
|------|------|-----------|-------------|
| `database-full-backup.sql` | ~60 KB | Schema + Data ทั้งหมด | **แนะนำ**: ต้องการ database พร้อมใช้งาน |
| `database-schema-only.sql` | ~36 KB | เฉพาะโครงสร้างตาราง | ต้องการโครงสร้างแล้วใส่ข้อมูลเอง |
| `database-data-only.sql` | ~39 KB | เฉพาะข้อมูล (INSERT) | มี schema แล้ว ต้องการเฉพาะข้อมูล |

---

## 🚀 วิธีการ Import

### วิธีที่ 1: Import แบบ Full Backup (แนะนำ)

#### A. ใช้ Docker Compose (Local Development)

```bash
# 1. Start Docker services
docker-compose up -d

# 2. รอ PostgreSQL พร้อม (~5-10 วินาที)
sleep 10

# 3. Import database
docker exec -i backend-postgres-1 psql -U user -d db < database-full-backup.sql

# 4. ตรวจสอบว่า import สำเร็จ
docker exec backend-postgres-1 psql -U user -d db -c "\dt"
```

#### B. ใช้ PostgreSQL บน Local Machine

```bash
# 1. สร้าง database ใหม่
createdb volunteer_db

# 2. Import
psql -U postgres -d volunteer_db < database-full-backup.sql

# 3. ตรวจสอบ
psql -U postgres -d volunteer_db -c "\dt"
```

#### C. Import ไปยัง Cloud Database (Railway/Render/Heroku)

```bash
# ใช้ DATABASE_URL ที่ได้จาก platform
psql $DATABASE_URL < database-full-backup.sql

# หรือระบุเต็ม
psql postgres://username:password@host:port/database < database-full-backup.sql
```

---

### วิธีที่ 2: Import เฉพาะ Schema

**ใช้เมื่อ:** ต้องการสร้างโครงสร้างตาราง แล้วใส่ข้อมูลทดสอบเอง

```bash
# Docker
docker exec -i backend-postgres-1 psql -U user -d db < database-schema-only.sql

# Local PostgreSQL
psql -U postgres -d volunteer_db < database-schema-only.sql

# Cloud
psql $DATABASE_URL < database-schema-only.sql
```

**หลังจากนี้:** รัน migration หรือใส่ข้อมูลเอง
```bash
npm run migrate up
```

---

### วิธีที่ 3: Import เฉพาะ Data

**ใช้เมื่อ:** มีโครงสร้างตารางอยู่แล้ว ต้องการเฉพาะข้อมูล

```bash
# Docker
docker exec -i backend-postgres-1 psql -U user -d db < database-data-only.sql

# Local
psql -U postgres -d volunteer_db < database-data-only.sql

# Cloud
psql $DATABASE_URL < database-data-only.sql
```

---

## 🔧 การแก้ปัญหา

### ❌ ปัญหา: "permission denied" หรือ "role does not exist"

**สาเหตุ:** User ใน SQL dump ไม่ตรงกับ user ปัจจุบัน

**แก้ไข:**

```bash
# Option 1: ใช้ superuser import
docker exec -i backend-postgres-1 psql -U postgres -d db < database-full-backup.sql

# Option 2: แก้ไข SQL file ลบ OWNER statements
sed -i '/OWNER TO/d' database-full-backup.sql
docker exec -i backend-postgres-1 psql -U user -d db < database-full-backup.sql
```

---

### ❌ ปัญหา: "database already exists" หรือ "table already exists"

**สาเหตุ:** Database หรือตารางมีอยู่แล้ว

**แก้ไข:**

```bash
# ลบ database เดิมแล้วสร้างใหม่
docker exec backend-postgres-1 psql -U user -c "DROP DATABASE IF EXISTS db;"
docker exec backend-postgres-1 psql -U user -c "CREATE DATABASE db;"
docker exec -i backend-postgres-1 psql -U user -d db < database-full-backup.sql
```

**หรือใช้ไฟล์ที่มี `--clean` ในตัว (database-full-backup.sql มีอยู่แล้ว)**

---

### ❌ ปัญหา: "syntax error" หรือ import ไม่สำเร็จ

**วิธีตรวจสอบ:**

```bash
# ดู error แบบละเอียด
docker exec -i backend-postgres-1 psql -U user -d db < database-full-backup.sql 2>&1 | tee import.log

# อ่าน log
cat import.log | grep -i error
```

**สาเหตุที่พบบ่อย:**
1. เวอร์ชัน PostgreSQL ไม่ตรงกัน
2. Extensions ไม่ถูกติดตั้ง (เช่น uuid-ossp)
3. ไฟล์ SQL เสียหาย

**แก้ไข:**
```bash
# ติดตั้ง extensions ที่จำเป็น
docker exec backend-postgres-1 psql -U user -d db -c "CREATE EXTENSION IF NOT EXISTS \"uuid-ossp\";"
docker exec backend-postgres-1 psql -U user -d db -c "CREATE EXTENSION IF NOT EXISTS \"pgcrypto\";"

# ลอง import อีกครั้ง
docker exec -i backend-postgres-1 psql -U user -d db < database-full-backup.sql
```

---

## 📊 ตรวจสอบว่า Import สำเร็จ

### 1. ตรวจสอบตารางทั้งหมด

```bash
# Docker
docker exec backend-postgres-1 psql -U user -d db -c "\dt"

# Local
psql -U postgres -d volunteer_db -c "\dt"

# ควรเห็นตาราง:
# - users
# - clubs
# - club_members
# - activities
# - activity_images
# - registrations
# - migrations (ถ้ามี)
```

### 2. ตรวจสอบจำนวนข้อมูล

```bash
docker exec backend-postgres-1 psql -U user -d db -c "
SELECT 
  'users' as table_name, COUNT(*) as count FROM users
UNION ALL
SELECT 'clubs', COUNT(*) FROM clubs
UNION ALL
SELECT 'activities', COUNT(*) FROM activities
UNION ALL
SELECT 'registrations', COUNT(*) FROM registrations;
"
```

### 3. ทดสอบ Login

```bash
# ทดสอบ API
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@volunteer.com",
    "password": "admin123"
  }'

# ควรได้ token กลับมา
```

---

## 🔄 Backup และ Restore เป็นประจำ

### สร้าง Backup Script

**Windows PowerShell:**
```powershell
# backup-db.ps1
$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$filename = "backup-$timestamp.sql"
docker exec backend-postgres-1 pg_dump -U user -d db --clean --if-exists > $filename
Write-Host "Backup created: $filename"
```

**Linux/Mac:**
```bash
#!/bin/bash
# backup-db.sh
timestamp=$(date +%Y%m%d-%H%M%S)
filename="backup-${timestamp}.sql"
docker exec backend-postgres-1 pg_dump -U user -d db --clean --if-exists > "$filename"
echo "Backup created: $filename"
```

---

## 🎓 ข้อมูล Default Accounts (หลัง Import)

หาก import `database-full-backup.sql` หรือ `database-data-only.sql` จะได้ accounts ทดสอบ:

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@volunteer.com | admin123 |
| President | president@volunteer.com | president123 |
| Student | student@volunteer.com | student123 |

⚠️ **สำคัญ:** เปลี่ยน password เหล่านี้ใน production!

---

## 📝 สรุป Quick Reference

```bash
# ===== IMPORT FULL BACKUP (แนะนำ) =====
docker exec -i backend-postgres-1 psql -U user -d db < database-full-backup.sql

# ===== IMPORT SCHEMA ONLY =====
docker exec -i backend-postgres-1 psql -U user -d db < database-schema-only.sql

# ===== IMPORT DATA ONLY =====
docker exec -i backend-postgres-1 psql -U user -d db < database-data-only.sql

# ===== ตรวจสอบตาราง =====
docker exec backend-postgres-1 psql -U user -d db -c "\dt"

# ===== ตรวจสอบข้อมูล =====
docker exec backend-postgres-1 psql -U user -d db -c "SELECT COUNT(*) FROM users;"

# ===== ลบและสร้างใหม่ =====
docker exec backend-postgres-1 psql -U user -c "DROP DATABASE IF EXISTS db;"
docker exec backend-postgres-1 psql -U user -c "CREATE DATABASE db;"
```

---

## 🌐 Import บน Cloud Platforms

### Railway
```bash
# Get DATABASE_URL from Railway dashboard
railway run psql $DATABASE_URL < database-full-backup.sql
```

### Render
```bash
# Get Internal Database URL from Render dashboard
psql <RENDER_DATABASE_URL> < database-full-backup.sql
```

### Heroku
```bash
heroku pg:psql < database-full-backup.sql
# หรือ
heroku pg:psql -a your-app-name < database-full-backup.sql
```

### AWS RDS
```bash
psql -h your-rds-endpoint.region.rds.amazonaws.com -U master -d dbname < database-full-backup.sql
```

---

## ⚠️ หมายเหตุสำคัญ

1. **Backup ก่อนทำอะไร:** สำรอง database เดิมก่อน import เสมอ
2. **ตรวจสอบเวอร์ชัน:** PostgreSQL version ควรใกล้เคียงกัน (อยู่ที่ 10.4)
3. **Environment Variables:** ตรวจสอบว่า DATABASE_URL ถูกต้อง
4. **Permissions:** User ต้องมีสิทธิ์ CREATE, INSERT, UPDATE, DELETE
5. **Storage:** ตรวจสอบว่ามีพื้นที่เพียงพอ

---

**Happy Importing! 🚀**
