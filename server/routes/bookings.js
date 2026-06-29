const express = require('express');
const { queryAll, queryOne, run, logActivity } = require('../database');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// สร้างการจอง
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { vehicle_id, start_date, end_date, purpose } = req.body;

    if (!vehicle_id || !start_date || !end_date) {
      return res.status(400).json({
        success: false,
        message: 'กรุณากรอก รถ วันที่เริ่ม และวันที่สิ้นสุด',
      });
    }

    const vehicle = await queryOne('SELECT * FROM vehicles WHERE id = ?', [vehicle_id]);
    if (!vehicle) {
      return res.status(404).json({ success: false, message: 'ไม่พบข้อมูลรถ' });
    }

    if (vehicle.status !== 'available') {
      return res.status(400).json({ success: false, message: 'รถคันนี้ไม่ว่าง' });
    }

    const result = await run(
      'INSERT INTO bookings (user_id, vehicle_id, start_date, end_date, purpose) VALUES (?, ?, ?, ?, ?)',
      [req.user.id, vehicle_id, start_date, end_date, purpose || '']
    );

    const booking = await queryOne(
      `SELECT b.*, v.name as vehicle_name, v.license_plate, u.full_name as user_name
       FROM bookings b
       JOIN vehicles v ON b.vehicle_id = v.id
       JOIN users u ON b.user_id = u.id
       WHERE b.id = ?`,
      [result.lastId]
    );

    await logActivity(req.user.id, 'CREATE_BOOKING', `จองรถ: ${vehicle.name} วันที่ ${start_date} - ${end_date}`);

    res.status(201).json({ success: true, message: 'จองรถสำเร็จ รอการอนุมัติ', data: booking });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ดูรายการจอง
router.get('/', authenticateToken, async (req, res) => {
  try {
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

    const bookings = await queryAll(sql, params);
    res.json({ success: true, data: bookings, total: bookings.length });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// อนุมัติ/ปฏิเสธการจอง (Admin)
router.patch('/:id/status', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { status } = req.body;
    const validStatuses = ['approved', 'rejected', 'cancelled'];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: 'สถานะไม่ถูกต้อง' });
    }

    const booking = await queryOne('SELECT * FROM bookings WHERE id = ?', [req.params.id]);
    if (!booking) {
      return res.status(404).json({ success: false, message: 'ไม่พบรายการจอง' });
    }

    await run(
      'UPDATE bookings SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [status, req.params.id]
    );

    if (status === 'approved') {
      await run('UPDATE vehicles SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [
        'unavailable',
        booking.vehicle_id,
      ]);
    } else if (status === 'cancelled' || status === 'rejected') {
      const activeBooking = await queryOne(
        `SELECT id FROM bookings WHERE vehicle_id = ? AND status = 'approved' AND id != ?`,
        [booking.vehicle_id, req.params.id]
      );
      if (!activeBooking) {
        await run('UPDATE vehicles SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [
          'available',
          booking.vehicle_id,
        ]);
      }
    }

    await logActivity(req.user.id, 'UPDATE_BOOKING_STATUS', `เปลี่ยนสถานะจอง ID:${req.params.id} เป็น ${status}`);

    res.json({ success: true, message: `อัปเดตสถานะเป็น ${status} สำเร็จ` });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ยกเลิกการจอง (User)
router.patch('/:id/cancel', authenticateToken, async (req, res) => {
  try {
    const booking = await queryOne('SELECT * FROM bookings WHERE id = ?', [req.params.id]);

    if (!booking) {
      return res.status(404).json({ success: false, message: 'ไม่พบรายการจอง' });
    }

    if (req.user.role !== 'admin' && booking.user_id !== req.user.id) {
      return res.status(403).json({ success: false, message: 'ไม่มีสิทธิ์ยกเลิก' });
    }

    if (booking.status === 'cancelled') {
      return res.status(400).json({ success: false, message: 'รายการนี้ถูกยกเลิกแล้ว' });
    }

    await run(
      'UPDATE bookings SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      ['cancelled', req.params.id]
    );

    if (booking.status === 'approved') {
      await run('UPDATE vehicles SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [
        'available',
        booking.vehicle_id,
      ]);
    }

    await logActivity(req.user.id, 'CANCEL_BOOKING', `ยกเลิกการจอง ID: ${req.params.id}`);

    res.json({ success: true, message: 'ยกเลิกการจองสำเร็จ' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
