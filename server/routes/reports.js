const express = require('express');
const { queryAll, logActivity } = require('../database');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// FR-05: รายงานข้อมูล
router.get('/', authenticateToken, requireAdmin, (req, res) => {
  // รายงานรายการรถทั้งหมด
  const allVehicles = queryAll('SELECT * FROM vehicles ORDER BY vehicle_type, name');

  // รายงานสรุปจำนวนรถตามประเภท
  const vehiclesByType = queryAll(`
    SELECT vehicle_type, COUNT(*) as count
    FROM vehicles
    GROUP BY vehicle_type
    ORDER BY count DESC
  `);

  // รายงานสถานะการใช้งานรถ (ว่าง/ไม่ว่าง)
  const vehiclesByStatus = queryAll(`
    SELECT status, COUNT(*) as count
    FROM vehicles
    GROUP BY status
  `);

  // รายงานการจอง
  const bookingStats = queryAll(`
    SELECT status, COUNT(*) as count
    FROM bookings
    GROUP BY status
  `);

  const totalBookings = queryAll('SELECT COUNT(*) as total FROM bookings')[0]?.total || 0;

  logActivity(req.user.id, 'VIEW_REPORT', 'ดูรายงานข้อมูล');

  res.json({
    success: true,
    data: {
      allVehicles: {
        title: 'รายงานรายการรถทั้งหมด',
        items: allVehicles,
        total: allVehicles.length,
      },
      vehiclesByType: {
        title: 'รายงานสรุปจำนวนรถตามประเภท',
        items: vehiclesByType,
      },
      vehiclesByStatus: {
        title: 'รายงานสถานะการใช้งานรถ',
        items: vehiclesByStatus.map((item) => ({
          status: item.status,
          statusLabel: item.status === 'available' ? 'ว่าง' : 'ไม่ว่าง',
          count: item.count,
        })),
      },
      bookingStats: {
        title: 'รายงานสถานะการจอง',
        items: bookingStats,
        total: totalBookings,
      },
    },
  });
});

module.exports = router;
