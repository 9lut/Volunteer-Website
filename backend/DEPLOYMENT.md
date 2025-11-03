# 📦 คู่มือการส่งมอบและ Deploy Backend

> คู่มือสำหรับการส่งมอบ Volunteer Management System Backend

---

## 📋 สารบัญ

1. [สิ่งที่ต้องเตรียม](#สิ่งที่ต้องเตรียม)
2. [วิธีการส่งมอบ](#วิธีการส่งมอบ)
3. [การ Deploy แบบต่างๆ](#การ-deploy)
4. [การแก้ปัญหา](#การแก้ปัญหา)

---

## 🎯 สิ่งที่ต้องเตรียม

### ไฟล์ที่จำเป็น
- ✅ โค้ด Backend ทั้งหมด
- ✅ `package.json` และ `package-lock.json`
- ✅ `Dockerfile` และ `docker-compose.yaml`
- ✅ ไฟล์ Migration ใน `src/migrations/`
- ✅ `.env.example` (ตัวอย่าง config)

### ข้อมูลที่ต้องให้ผู้รับ
- ✅ DATABASE_URL (connection string)
- ✅ Session secret key
- ✅ Port ที่จะใช้

---

## 📤 วิธีการส่งมอบ

### วิธีที่ 1: ส่งมอบผ่าน Git Repository (แนะนำ)

```bash
# 1. Push โค้ดขึ้น GitHub/GitLab
git add .
git commit -m "Ready for deployment"
git push origin main

# 2. แชร์ Repository URL กับผู้รับ
# 3. ให้ผู้รับ clone repository
```

**ผู้รับทำ:**
```bash
git clone <repository-url>
cd backend
cp .env.example .env
# แก้ไข .env ให้ตรงกับ environment
npm install
npm run start:migrate  # รัน migration + start server
```

### วิธีที่ 2: ส่งมอบผ่าน ZIP File

```bash
# สร้าง ZIP file (ไม่รวม node_modules)
zip -r volunteer-backend.zip . -x "node_modules/*" -x ".git/*" -x "uploads/*"
```

**ผู้รับทำ:**
```bash
unzip volunteer-backend.zip
cd volunteer-backend
npm install
cp .env.example .env
# แก้ไข .env
npm run start:migrate
```

### วิธีที่ 3: ส่งมอบผ่าน Docker Image

```bash
# Build Docker image
docker build -t volunteer-backend:latest .

# Save image เป็นไฟล์
docker save volunteer-backend:latest -o volunteer-backend.tar

# หรือ push ขึ้น Docker Hub
docker tag volunteer-backend:latest yourusername/volunteer-backend:latest
docker push yourusername/volunteer-backend:latest
```

---

## 🚀 การ Deploy

### A. Deploy บน Local/Development (Docker Compose)

**ง่ายที่สุด สำหรับ Demo หรือ Development**

```bash
# 1. ตรวจสอบว่ามี Docker Desktop
docker --version
docker-compose --version

# 2. สร้างไฟล์ .env
cp .env.example .env

# 3. รัน Docker Compose
docker-compose up -d

# 4. ตรวจสอบ
curl http://localhost:3000
```

✅ **ข้อดี:** รันได้ทันที มี Database ในตัว  
❌ **ข้อจำกัด:** ไม่เหมาะกับ Production

---

### B. Deploy บน Railway (แนะนำสำหรับ Free Tier)

**ฟรี มี Database ให้ ตั้งค่าง่าย**

#### ขั้นตอน:

1. **สมัคร Railway**
   - ไปที่ https://railway.app
   - Login ด้วย GitHub

2. **สร้าง Project ใหม่**
   - คลิก "New Project"
   - เลือก "Deploy from GitHub repo"
   - เลือก repository ของคุณ

3. **เพิ่ม PostgreSQL**
   - คลิก "+ New"
   - เลือก "Database" → "PostgreSQL"
   - Railway จะสร้าง DATABASE_URL ให้อัตโนมัติ

4. **ตั้งค่า Environment Variables**
   ```
   PORT=3000
   NODE_ENV=production
   SESSION_SECRET=<generate-random-secret>
   ```
   (DATABASE_URL จะถูกเพิ่มอัตโนมัติ)

5. **Deploy**
   - Railway จะ deploy อัตโนมัติทุกครั้งที่ push code
   - ดู URL ที่ Settings → Domain

#### ⚠️ สำคัญ: ตั้งค่า Start Command

ไปที่ Settings → Deploy → Start Command:
```
npm run start:migrate
```

หรือแก้ `package.json`:
```json
{
  "scripts": {
    "start": "node ./bin/start-with-migration.js"
  }
}
```

✅ **ข้อดี:** ฟรี มี database auto-deploy  
❌ **ข้อจำกัด:** Free tier มีข้อจำกัดเรื่อง usage

---

### C. Deploy บน Render

**คล้าย Railway แต่มี Free Tier ที่ดีกว่า**

#### ขั้นตอน:

1. **สมัคร Render**
   - ไปที่ https://render.com
   - Login ด้วย GitHub

2. **สร้าง PostgreSQL Database**
   - คลิก "New +" → "PostgreSQL"
   - ตั้งชื่อ database
   - เลือก Free tier
   - คัดลอก "Internal Database URL"

3. **สร้าง Web Service**
   - คลิก "New +" → "Web Service"
   - Connect repository
   - ตั้งค่า:
     ```
     Name: volunteer-backend
     Environment: Node
     Build Command: npm install
     Start Command: npm run start:migrate
     ```

4. **ตั้งค่า Environment Variables**
   - เพิ่มตัวแปร:
     ```
     DATABASE_URL=<paste-internal-database-url>
     NODE_ENV=production
     SESSION_SECRET=<random-secret>
     PORT=10000
     ```

5. **Deploy**
   - คลิก "Create Web Service"
   - รอ deploy เสร็จ (~2-3 นาที)

✅ **ข้อดี:** Free tier ดี deploy ง่าย  
⚠️ **ข้อควรรู้:** Free tier จะ sleep เมื่อไม่ใช้งาน (cold start ~30 วินาที)

---

### D. Deploy บน VPS/Server (Ubuntu)

**สำหรับมีควบคุมเต็มที่**

#### ขั้นตอน:

1. **เตรียม Server (Ubuntu 20.04+)**
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# ติดตั้ง Node.js (v18 LTS)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# ติดตั้ง PostgreSQL
sudo apt install -y postgresql postgresql-contrib

# ติดตั้ง PM2 (process manager)
sudo npm install -g pm2
```

2. **ตั้งค่า Database**
```bash
# เข้า PostgreSQL
sudo -u postgres psql

# สร้าง database และ user
CREATE DATABASE volunteer_db;
CREATE USER volunteer_user WITH PASSWORD 'secure_password';
GRANT ALL PRIVILEGES ON DATABASE volunteer_db TO volunteer_user;
\q
```

3. **Deploy Code**
```bash
# Clone repository
cd /var/www
sudo git clone <repository-url> volunteer-backend
cd volunteer-backend

# Install dependencies
sudo npm install --production

# สร้าง .env file
sudo nano .env
```

แก้ไข `.env`:
```env
DATABASE_URL=postgres://volunteer_user:secure_password@localhost:5432/volunteer_db
PORT=3000
NODE_ENV=production
SESSION_SECRET=<random-secret-key>
```

4. **รัน Migration + Start Server**
```bash
# รัน migration ครั้งแรก
npm run migrate up

# Start server ด้วย PM2
pm2 start bin/start-with-migration.js --name volunteer-api
pm2 save
pm2 startup
```

5. **ตั้งค่า Nginx (Reverse Proxy)**
```bash
sudo apt install -y nginx

# สร้าง config
sudo nano /etc/nginx/sites-available/volunteer-api
```

เพิ่ม:
```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/volunteer-api /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

6. **ตั้งค่า SSL (ไม่บังคับ แต่แนะนำ)**
```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

✅ **ข้อดี:** ควบคุมเต็มที่ performance ดี  
❌ **ข้อเสีย:** ต้องดูแล server เอง

---

### E. Deploy บน Heroku

**⚠️ Heroku ไม่ฟรีแล้วตั้งแต่ปี 2022 แต่ยังใช้งานได้ดี**

#### ขั้นตอน:

1. **ติดตั้ง Heroku CLI**
```bash
# Windows (PowerShell)
winget install Heroku.HerokuCLI

# Login
heroku login
```

2. **สร้าง App**
```bash
heroku create volunteer-backend-app

# เพิ่ม PostgreSQL
heroku addons:create heroku-postgresql:mini
```

3. **ตั้งค่า Environment Variables**
```bash
heroku config:set NODE_ENV=production
heroku config:set SESSION_SECRET=$(node -p "require('crypto').randomBytes(32).toString('hex')")
```

4. **สร้าง Procfile**
```bash
# สร้างไฟล์ Procfile ในโฟลเดอร์ root
echo "web: npm run start:migrate" > Procfile
```

5. **Deploy**
```bash
git add .
git commit -m "Deploy to Heroku"
git push heroku main

# เปิด app
heroku open

# ดู logs
heroku logs --tail
```

---

## 🔧 การแก้ปัญหา (Troubleshooting)

### ❌ ปัญหา: Migration ไม่ทำงาน

**อาการ:** Server เริ่มได้ แต่ตารางไม่ถูกสร้าง

**แก้ไข:**
```bash
# 1. ตรวจสอบ DATABASE_URL
echo $DATABASE_URL  # Linux/Mac
$env:DATABASE_URL   # Windows PowerShell

# 2. รัน migration manual
npm run migrate up

# 3. ตรวจสอบ logs
npm run start:migrate 2>&1 | tee startup.log
```

---

### ❌ ปัญหา: Database connection failed

**อาการ:** Error: `connection refused` หรือ `ECONNREFUSED`

**แก้ไข:**

1. **ตรวจสอบ DATABASE_URL**
   ```bash
   # Format ต้องเป็น
   postgres://username:password@host:port/database
   
   # ตัวอย่าง
   postgres://user:pass@localhost:5432/mydb
   postgres://user:pass@db.railway.app:5432/railway
   ```

2. **ตรวจสอบว่า Database server ทำงาน**
   ```bash
   # PostgreSQL local
   sudo systemctl status postgresql
   
   # Docker
   docker ps | grep postgres
   ```

3. **ตรวจสอบ Firewall/Security Group**
   - Cloud provider อาจบล็อก port 5432
   - เปิด inbound rule สำหรับ PostgreSQL

---

### ❌ ปัญหา: Port already in use

**อาการ:** `Error: listen EADDRINUSE: address already in use :::3000`

**แก้ไข:**

```bash
# Linux/Mac - หา process ที่ใช้ port 3000
lsof -ti:3000
kill -9 <PID>

# Windows PowerShell
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# หรือเปลี่ยน port ใน .env
PORT=3001
```

---

### ❌ ปัญหา: bcrypt compilation error

**อาการ:** Error ตอน `npm install` เกี่ยวกับ bcrypt

**แก้ไข:**
```bash
# ติดตั้ง build tools
# Windows
npm install --global windows-build-tools

# Linux
sudo apt install build-essential python3

# Mac
xcode-select --install

# Rebuild bcrypt
npm rebuild bcrypt
```

---

## 📝 Checklist ก่อนส่งมอบ

- [ ] ทดสอบ Migration ใน environment ใหม่
- [ ] ทดสอบ API endpoints ทั้งหมด
- [ ] สร้างไฟล์ `.env.example` พร้อม comment
- [ ] อัพเดท `README.md` และ `DEPLOYMENT.md`
- [ ] ลบไฟล์ `/uploads/` หรือเพิ่มใน `.gitignore`
- [ ] ลบ `node_modules/` ถ้าส่งเป็น ZIP
- [ ] ตรวจสอบ credentials ทั้งหมด (ห้ามมี password จริงใน code)
- [ ] ทดสอบ Docker build และ docker-compose up
- [ ] เตรียม default accounts สำหรับผู้รับ
- [ ] เขียนเอกสาร API (Postman Collection หรือ Swagger)

---

## 🎓 Default Accounts (หลัง Migration)

หลังจากรัน Migration เสร็จ จะมี accounts ทดสอบดังนี้:

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@volunteer.com | admin123 |
| President | president@volunteer.com | president123 |
| Student | student@volunteer.com | student123 |

⚠️ **สำคัญ:** เปลี่ยน password เหล่านี้ใน production!

---

## 📞 Support

หากพบปัญหา:
1. ตรวจสอบ logs: `npm run start:migrate 2>&1 | tee debug.log`
2. ดู error ใน console
3. ตรวจสอบ DATABASE_URL ว่าถูกต้อง
4. ลอง connect database โดยตรง: `psql $DATABASE_URL`

---

## 🔐 Security Notes

1. **ห้ามใส่ credentials จริงใน code**
2. **ใช้ Environment Variables สำหรับ config ทั้งหมด**
3. **SESSION_SECRET ต้อง random และยาวพอ**
4. **เปลี่ยน default passwords ทันทีใน production**
5. **ใช้ HTTPS ใน production**
6. **Backup database เป็นประจำ**

---

## 📦 ไฟล์ที่แนบมาด้วย

- ✅ `DEPLOYMENT.md` - คู่มือนี้
- ✅ `.env.example` - ตัวอย่าง configuration
- ✅ `bin/start-with-migration.js` - Auto migration script
- ✅ `database-schema.sql` - SQL dump (ถ้ามี)
- ✅ `API.md` - API documentation (ถ้ามี)

---

**Good luck with your deployment! 🚀**
