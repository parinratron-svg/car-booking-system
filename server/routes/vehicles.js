const express = require('express');
const { queryAll, queryOne, run, logActivity } = require('../database');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// Get Vehicle API - ดึงข้อมูลรถทั้งหมด พร้อม Search และ Filter
router.get('/', authenticateToken, (req, res) => {
  const { search, type, status } = req.query;

  let sql = 'SELECT * FROM vehicles WHERE 1=1';
  const params = [];

  // Search: ค้นหาจากชื่อรถ หรือ ทะเบียนรถ
  if (search) {
    sql += ' AND (name LIKE ? OR license_plate LIKE ?)';
    params.push(`%${search}%`, `%${search}%`);
  }

  // Filter: กรองตามประเภทรถ
  if (type) {
    sql += ' AND vehicle_type = ?';
    params.push(type);
  }

  // Filter: กรองตามสถานะ (ว่าง/ไม่ว่าง)
  if (status) {
    sql += ' AND status = ?';
    params.push(status);
  }

  sql += ' ORDER BY created_at DESC';

  const vehicles = queryAll(sql, params);

  logActivity(req.user.id, 'GET_VEHICLES', `ดึงข้อมูลรถ ${vehicles.length} คัน`);

  res.json({
    success: true,
    message: 'ดึงข้อมูลรถสำเร็จ',
    data: vehicles,
    total: vehicles.length,
  });
});

// Get single vehicle
router.get('/:id', authenticateToken, (req, res) => {
  const vehicle = queryOne('SELECT * FROM vehicles WHERE id = ?', [req.params.id]);

  if (!vehicle) {
    return res.status(404).json({ success: false, message: 'ไม่พบข้อมูลรถ' });
  }

  res.json({ success: true, data: vehicle });
});

// Create Vehicle API - เพิ่มข้อมูลรถ (Admin only)
router.post('/', authenticateToken, requireAdmin, (req, res) => {
  const { name, license_plate, vehicle_type, status } = req.body;

  if (!name || !license_plate || !vehicle_type) {
    return res.status(400).json({
      success: false,
      message: 'กรุณากรอก ชื่อรถ ทะเบียนรถ และประเภทรถ',
    });
  }

  const existing = queryOne('SELECT id FROM vehicles WHERE license_plate = ?', [license_plate]);
  if (existing) {
    return res.status(409).json({
      success: false,
      message: 'ทะเบียนรถนี้มีอยู่ในระบบแล้ว',
    });
  }

  const validTypes = ['sedan', 'suv', 'pickup', 'van', 'truck'];
  if (!validTypes.includes(vehicle_type)) {
    return res.status(400).json({
      success: false,
      message: `ประเภทรถต้องเป็น: ${validTypes.join(', ')}`,
    });
  }

  const vehicleStatus = status || 'available';
  const result = run(
    'INSERT INTO vehicles (name, license_plate, vehicle_type, status) VALUES (?, ?, ?, ?)',
    [name, license_plate, vehicle_type, vehicleStatus]
  );

  const vehicle = queryOne('SELECT * FROM vehicles WHERE id = ?', [result.lastId]);

  logActivity(req.user.id, 'CREATE_VEHICLE', `เพิ่มรถ: ${name} (${license_plate})`);

  res.status(201).json({
    success: true,
    message: 'เพิ่มข้อมูลรถสำเร็จ',
    data: vehicle,
  });
});

// Update vehicle (Admin only)
router.put('/:id', authenticateToken, requireAdmin, (req, res) => {
  const { name, license_plate, vehicle_type, status } = req.body;
  const vehicle = queryOne('SELECT * FROM vehicles WHERE id = ?', [req.params.id]);

  if (!vehicle) {
    return res.status(404).json({ success: false, message: 'ไม่พบข้อมูลรถ' });
  }

  run(
    `UPDATE vehicles SET name = ?, license_plate = ?, vehicle_type = ?, status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
    [
      name || vehicle.name,
      license_plate || vehicle.license_plate,
      vehicle_type || vehicle.vehicle_type,
      status || vehicle.status,
      req.params.id,
    ]
  );

  const updated = queryOne('SELECT * FROM vehicles WHERE id = ?', [req.params.id]);
  logActivity(req.user.id, 'UPDATE_VEHICLE', `แก้ไขรถ ID: ${req.params.id}`);

  res.json({ success: true, message: 'แก้ไขข้อมูลรถสำเร็จ', data: updated });
});

// Delete vehicle (Admin only)
router.delete('/:id', authenticateToken, requireAdmin, (req, res) => {
  const vehicle = queryOne('SELECT * FROM vehicles WHERE id = ?', [req.params.id]);

  if (!vehicle) {
    return res.status(404).json({ success: false, message: 'ไม่พบข้อมูลรถ' });
  }

  run('DELETE FROM vehicles WHERE id = ?', [req.params.id]);
  logActivity(req.user.id, 'DELETE_VEHICLE', `ลบรถ: ${vehicle.name} (${vehicle.license_plate})`);

  res.json({ success: true, message: 'ลบข้อมูลรถสำเร็จ' });
});

module.exports = router;
