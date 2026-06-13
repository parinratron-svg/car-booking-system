const express = require('express');
const cors = require('cors');
const path = require('path');
const { initDatabase } = require('./database');

const authRoutes = require('./routes/auth');
const vehicleRoutes = require('./routes/vehicles');
const bookingRoutes = require('./routes/bookings');
const reportRoutes = require('./routes/reports');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

app.use('/api/auth', authRoutes);
app.use('/api/vehicles', vehicleRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/reports', reportRoutes);

app.get('/api/health', (req, res) => {
  res.json({ success: true, message: 'ระบบจองรถทำงานปกติ', timestamp: new Date().toISOString() });
});

async function startServer() {
  try {
    await initDatabase();
    console.log('✅ ฐานข้อมูลพร้อมใช้งาน');

    app.listen(PORT, () => {
      console.log(`🚗 ระบบจองรถ เริ่มทำงานที่ http://localhost:${PORT}`);
      console.log('📋 บัญชีทดสอบ:');
      console.log('   Admin: admin / admin123');
      console.log('   User:  user1 / user123');
    });
  } catch (error) {
    console.error('❌ เกิดข้อผิดพลาด:', error);
    process.exit(1);
  }
}

startServer();
