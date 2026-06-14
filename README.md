# ระบบจองรถ (Car Booking System)นน

ระบบจองรถออนไลน์ที่พัฒนาขึ้นเพื่อให้ผู้ใช้งานสามารถตรวจสอบรถที่พร้อมใช้งาน ทำการจองผ่านออนไลน์ และช่วยติดตามจัดการข้อมูลการใช้งานรถ

## วัตถุประสงค์ของระบบ

- ให้ผู้ใช้งานทั่วไปสามารถค้นหา จอง และยกเลิกการจองรถได้
- ให้ผู้ดูแลระบบสามารถจัดการข้อมูลรถ อนุมัติการจอง และดูรายงานได้
- บันทึกข้อมูลการใช้งานทุกครั้ง (Activity Log)
- รองรับ Responsive Design แสดงผลได้ดีบนมือถือ

## กลุ่มผู้ใช้งาน

| กลุ่ม | สิทธิ์ |
|-------|-------|
| **ผู้ใช้งานทั่วไป (User)** | เข้าสู่ระบบ, ค้นหารถ, จองรถ, ดูประวัติ, ยกเลิกการจอง |
| **ผู้ดูแลระบบ (Admin)** | จัดการข้อมูลรถ, อนุมัติ/ปฏิเสธการจอง, ดูรายงาน |

## เทคโนโลยีที่ใช้

| ส่วน | เทคโนโลยี |
|------|----------|
| Backend | Node.js + Express.js |
| Database | SQLite (sql.js) |
| Authentication | JWT + bcrypt |
| Frontend | HTML, CSS, JavaScript (Vanilla) |
| API | RESTful API |

## โครงสร้างโปรเจกต์

```
car-booking-system/
├── server/
│   ├── index.js              # จุดเริ่มต้น Server
│   ├── database.js           # จัดการฐานข้อมูล SQLite
│   ├── middleware/
│   │   └── auth.js           # ตรวจสอบ Token และสิทธิ์
│   └── routes/
│       ├── auth.js           # Login / Logout API
│       ├── vehicles.js       # CRUD รถ + Search/Filter
│       ├── bookings.js       # จองรถ / อนุมัติ / ยกเลิก
│       └── reports.js        # รายงานข้อมูล
├── public/
│   ├── index.html            # หน้า Login
│   ├── dashboard.html        # หน้าผู้ใช้งานทั่วไป
│   ├── admin.html            # หน้าผู้ดูแลระบบ
│   ├── css/style.css         # Responsive CSS
│   └── js/app.js             # Utility functions
├── package.json
└── README.md
```

## Functional Requirements ที่รองรับ

| รหัส | ความต้องการ | สถานะ |
|------|------------|-------|
| FR-01 | Login / Logout | ✅ |
| FR-02 | จัดการข้อมูลรถ (Create) | ✅ |
| FR-03 | จองรถ / ยกเลิกการจอง | ✅ |
| FR-04 | ค้นหาและกรองข้อมูล | ✅ |
| FR-05 | ระบบรายงานข้อมูล | ✅ |

## API Endpoints

### Authentication
| Method | Endpoint | คำอธิบาย |
|--------|----------|----------|
| POST | `/api/auth/login` | เข้าสู่ระบบ |
| POST | `/api/auth/logout` | ออกจากระบบ |

### Vehicles
| Method | Endpoint | คำอธิบาย |
|--------|----------|----------|
| GET | `/api/vehicles?search=&type=&status=` | ดึงข้อมูลรถ (Search + Filter) |
| GET | `/api/vehicles/:id` | ดึงข้อมูลรถคันเดียว |
| POST | `/api/vehicles` | เพิ่มรถใหม่พร้อมรูปภาพ (Admin, multipart/form-data) |
| PUT | `/api/vehicles/:id` | แก้ไขข้อมูลรถและรูปภาพ (Admin) |
| DELETE | `/api/vehicles/:id` | ลบรถ (Admin) |

### Bookings
| Method | Endpoint | คำอธิบาย |
|--------|----------|----------|
| GET | `/api/bookings` | ดูรายการจอง |
| POST | `/api/bookings` | สร้างการจอง |
| PATCH | `/api/bookings/:id/status` | อนุมัติ/ปฏิเสธ (Admin) |
| PATCH | `/api/bookings/:id/cancel` | ยกเลิกการจอง |

### Reports
| Method | Endpoint | คำอธิบาย |
|--------|----------|----------|
| GET | `/api/reports` | รายงานรถทั้งหมด, สรุปตามประเภท, สถานะ |

## วิธีติดตั้งและรัน

### 1. ติดตั้ง Dependencies
```bash
npm install
```

### 2. เริ่ม Server
```bash
npm start
```

### 3. เปิดเบราว์เซอร์
```
http://localhost:3000
```

## บัญชีทดสอบ

| Role | Username | Password |
|------|----------|----------|
| Admin | `admin` | `admin123` |
| User | `user1` | `user123` |
| User | `user2` | `user123` |

## ตัวอย่างการใช้งาน API

### Login
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'
```

### เพิ่มรถพร้อมรูปภาพ (ต้องมี Token)
```bash
curl -X POST http://localhost:3000/api/vehicles \
  -H "Authorization: Bearer <TOKEN>" \
  -F "name=Toyota Yaris" \
  -F "license_plate=กท-9999" \
  -F "vehicle_type=sedan" \
  -F "status=available" \
  -F "image=@/path/to/car-photo.jpg"
```

### ค้นหาและกรองรถ
```bash
curl "http://localhost:3000/api/vehicles?search=Toyota&type=sedan&status=available" \
  -H "Authorization: Bearer <TOKEN>"
```

### ดูรายงาน
```bash
curl http://localhost:3000/api/reports \
  -H "Authorization: Bearer <TOKEN>"
```

## ฐานข้อมูล

ระบบใช้ SQLite มี 4 ตารางหลัก:

- **users** - ข้อมูลผู้ใช้งาน (username, password, role)
- **vehicles** - ข้อมูลรถ (ชื่อ, ทะเบียน, ประเภท, สถานะ, รูปภาพ)
- **bookings** - รายการจอง (ผู้จอง, รถ, วันที่, สถานะ)
- **activity_logs** - บันทึกการใช้งานทุกครั้ง (NFR-02)

## Non-Functional Requirements

| รหัส | ความต้องการ | การรองรับ |
|------|------------|----------|
| NFR-01 | ตอบสนองภายใน 3 วินาที | SQLite + Express (เบาและเร็ว) |
| NFR-02 | บันทึกข้อมูลการใช้งานทุกครั้ง | Activity Log ทุก Action |
| NFR-03 | ให้บริการ 24 ชั่วโมง | Node.js Server |
| NFR-04 | Responsive Design | CSS Media Queries |
| NFR-05 | รองรับ 1000 users | Stateless JWT API |

## ผู้พัฒนา

พัฒนาเป็น Prototype สำหรับวิชา System Analysis and Design
