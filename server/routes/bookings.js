const express = require('express');
const { queryAll, queryOne, run, logActivity } = require('../database');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// สร้างการจอง
router.post('/', authenticateToken, (req, res) => {
  const { vehicle_id, start_date, end_date, purpose } = req.body;

  if (!vehicle_id || !start_date || !end_date) {
    return res.status(400).json({
      success: false,
      message: 'กรุณากรอก รถ วันที่เริ่ม และวันที่สิ้นสุด',
    });
  }

  const vehicle = queryOne('SELECT * FROM vehicles WHERE id = ?', [vehicle_id]);
  if (!vehicle) {
    return res.status(404).json({ success: false, message: 'ไม่พบข้อมูลรถ' });
  }

  if (vehicle.status !== 'available') {
    return res.status(400).json({ success: false, message: 'รถคันนี้ไม่ว่าง' });
  }

  const result = run(
    'INSERT INTO bookings (user_id, vehicle_id, start_date, end_date, purpose) VALUES (?, ?, ?, ?, ?)',
    [req.user.id, vehicle_id, start_date, end_date, purpose || '']
  );

  const booking = queryOne(
    `SELECT b.*, v.name as vehicle_name, v.license_plate, u.full_name as user_name
     FROM bookings b
     JOIN vehicles v ON b.vehicle_id = v.id
     JOIN users u ON b.user_id = u.id
     WHERE b.id = ?`,
    [result.lastId]
  );

  logActivity(req.user.id, 'CREATE_BOOKING', `จองรถ: ${vehicle.name} วันที่ ${start_date} - ${end_date}`);

  res.status(201).json({ success: true, message: 'จองรถสำเร็จ รอการอนุมัติ', data: booking });
});

// ดูรายการจอง
router.get('/', authenticateToken, (req, res) => {
  let sql = `
    SELECT b.*, v.name as vehicle_name, v.license_plate, v.vehicle_type, u.full_name as user_name
    FROM bookings b
    JOIN vehicles v ON b.vehicle_id = v.id
    JOIN users u ON b.user_id = u.id
  `;
  const params = [];

  if (req.user.role !== 'admin') {
    sql += ' WHERE b.user_id = ?';
    params.push(req.user.id);
  }

  sql += ' ORDER BY b.created_at DESC';

  const bookings = queryAll(sql, params);
  res.json({ success: true, data: bookings, total: bookings.length });
});

// อนุมัติ/ปฏิเสธการจอง (Admin)
router.patch('/:id/status', authenticateToken, requireAdmin, (req, res) => {
  const { status } = req.body;
  const validStatuses = ['approved', 'rejected', 'cancelled'];

  if (!validStatuses.includes(status)) {
    return res.status(400).json({ success: false, message: 'สถานะไม่ถูกต้อง' });
  }

  const booking = queryOne('SELECT * FROM bookings WHERE id = ?', [req.params.id]);
  if (!booking) {
    return res.status(404).json({ success: false, message: 'ไม่พบรายการจอง' });
  }

  run(
    'UPDATE bookings SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
    [status, req.params.id]
  );

  if (status === 'approved') {
    run('UPDATE vehicles SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [
      'unavailable',
      booking.vehicle_id,
    ]);
  } else if (status === 'cancelled' || status === 'rejected') {
    const activeBooking = queryOne(
      `SELECT id FROM bookings WHERE vehicle_id = ? AND status = 'approved' AND id != ?`,
      [booking.vehicle_id, req.params.id]
    );
    if (!activeBooking) {
      run('UPDATE vehicles SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [
        'available',
        booking.vehicle_id,
      ]);
    }
  }

  logActivity(req.user.id, 'UPDATE_BOOKING_STATUS', `เปลี่ยนสถานะจอง ID:${req.params.id} เป็น ${status}`);

  res.json({ success: true, message: `อัปเดตสถานะเป็น ${status} สำเร็จ` });
});

// ยกเลิกการจอง (User)
router.patch('/:id/cancel', authenticateToken, (req, res) => {
  const booking = queryOne('SELECT * FROM bookings WHERE id = ?', [req.params.id]);

  if (!booking) {
    return res.status(404).json({ success: false, message: 'ไม่พบรายการจอง' });
  }

  if (req.user.role !== 'admin' && booking.user_id !== req.user.id) {
    return res.status(403).json({ success: false, message: 'ไม่มีสิทธิ์ยกเลิก' });
  }

  if (booking.status === 'cancelled') {
    return res.status(400).json({ success: false, message: 'รายการนี้ถูกยกเลิกแล้ว' });
  }

  run(
    'UPDATE bookings SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
    ['cancelled', req.params.id]
  );

  if (booking.status === 'approved') {
    run('UPDATE vehicles SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [
      'available',
      booking.vehicle_id,
    ]);
  }

  logActivity(req.user.id, 'CANCEL_BOOKING', `ยกเลิกการจอง ID: ${req.params.id}`);

  res.json({ success: true, message: 'ยกเลิกการจองสำเร็จ' });
});

module.exports = router;
