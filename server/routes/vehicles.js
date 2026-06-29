const express = require('express');
const { queryAll, queryOne, run, logActivity } = require('../database');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const { upload, deleteVehicleImage, getImagePath } = require('../middleware/upload');

const router = express.Router();

async function handleCreateVehicle(req, res) {
  try {
    const { name, license_plate, vehicle_type, status } = req.body;

    if (!name || !license_plate || !vehicle_type) {
      if (req.file) deleteVehicleImage(getImagePath(req.file.filename));
      return res.status(400).json({
        success: false,
        message: 'กรุณากรอก ชื่อรถ ทะเบียนรถ และประเภทรถ',
      });
    }

    const existing = await queryOne('SELECT id FROM vehicles WHERE license_plate = ?', [license_plate.trim()]);
    if (existing) {
      if (req.file) deleteVehicleImage(getImagePath(req.file.filename));
      return res.status(409).json({
        success: false,
        message: 'ทะเบียนรถนี้มีอยู่ในระบบแล้ว',
      });
    }

    const validTypes = ['sedan', 'suv', 'pickup', 'van', 'truck'];
    if (!validTypes.includes(vehicle_type)) {
      if (req.file) deleteVehicleImage(getImagePath(req.file.filename));
      return res.status(400).json({
        success: false,
        message: `ประเภทรถต้องเป็น: ${validTypes.join(', ')}`,
      });
    }

    const vehicleStatus = status || 'available';
    const imagePath = req.file ? getImagePath(req.file.filename) : null;

    const result = await run(
      'INSERT INTO vehicles (name, license_plate, vehicle_type, status, image) VALUES (?, ?, ?, ?, ?)',
      [name.trim(), license_plate.trim(), vehicle_type, vehicleStatus, imagePath]
    );

    const vehicle = await queryOne('SELECT * FROM vehicles WHERE id = ?', [result.lastId]);

    await logActivity(req.user.id, 'CREATE_VEHICLE', `เพิ่มรถ: ${name} (${license_plate})`);

    res.status(201).json({
      success: true,
      message: 'เพิ่มข้อมูลรถสำเร็จ',
      data: vehicle,
    });
  } catch (error) {
    if (req.file) deleteVehicleImage(getImagePath(req.file.filename));
    res.status(500).json({ success: false, message: error.message || 'เกิดข้อผิดพลาดในการเพิ่มรถ' });
  }
}

router.get('/', authenticateToken, async (req, res) => {
  try {
    const { search, type, status } = req.query;

    let sql = 'SELECT * FROM vehicles WHERE 1=1';
    const params = [];

    if (search) {
      sql += ' AND (name LIKE ? OR license_plate LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }

    if (type) {
      sql += ' AND vehicle_type = ?';
      params.push(type);
    }

    if (status) {
      sql += ' AND status = ?';
      params.push(status);
    }

    sql += ' ORDER BY created_at DESC';

    const vehicles = await queryAll(sql, params);

    await logActivity(req.user.id, 'GET_VEHICLES', `ดึงข้อมูลรถ ${vehicles.length} คัน`);

    res.json({
      success: true,
      message: 'ดึงข้อมูลรถสำเร็จ',
      data: vehicles,
      total: vehicles.length,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const vehicle = await queryOne('SELECT * FROM vehicles WHERE id = ?', [req.params.id]);

    if (!vehicle) {
      return res.status(404).json({ success: false, message: 'ไม่พบข้อมูลรถ' });
    }

    res.json({ success: true, data: vehicle });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Create Vehicle - multer อ่าน multipart เสมอ (รองรับทั้งมี/ไม่มีรูป)
router.post('/', authenticateToken, requireAdmin, (req, res, next) => {
  upload.single('image')(req, res, async (err) => {
    if (err) return next(err);
    await handleCreateVehicle(req, res);
  });
});

router.put('/:id', authenticateToken, requireAdmin, (req, res, next) => {
  const contentType = req.headers['content-type'] || '';

  const updateHandler = async (req, res) => {
    try {
      const { name, license_plate, vehicle_type, status } = req.body;
      const vehicle = await queryOne('SELECT * FROM vehicles WHERE id = ?', [req.params.id]);

      if (!vehicle) {
        if (req.file) deleteVehicleImage(getImagePath(req.file.filename));
        return res.status(404).json({ success: false, message: 'ไม่พบข้อมูลรถ' });
      }

      let imagePath = vehicle.image;
      if (req.file) {
        deleteVehicleImage(vehicle.image);
        imagePath = getImagePath(req.file.filename);
      }

      await run(
        `UPDATE vehicles SET name = ?, license_plate = ?, vehicle_type = ?, status = ?, image = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
        [
          (name || vehicle.name).trim(),
          (license_plate || vehicle.license_plate).trim(),
          vehicle_type || vehicle.vehicle_type,
          status || vehicle.status,
          imagePath,
          req.params.id,
        ]
      );

      const updated = await queryOne('SELECT * FROM vehicles WHERE id = ?', [req.params.id]);
      await logActivity(req.user.id, 'UPDATE_VEHICLE', `แก้ไขรถ ID: ${req.params.id}`);

      res.json({ success: true, message: 'แก้ไขข้อมูลรถสำเร็จ', data: updated });
    } catch (error) {
      if (req.file) deleteVehicleImage(getImagePath(req.file.filename));
      res.status(500).json({ success: false, message: error.message });
    }
  };

  if (contentType.includes('multipart/form-data')) {
    upload.single('image')(req, res, (err) => {
      if (err) return next(err);
      updateHandler(req, res);
    });
  } else {
    updateHandler(req, res);
  }
});

router.delete('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const vehicle = await queryOne('SELECT * FROM vehicles WHERE id = ?', [req.params.id]);

    if (!vehicle) {
      return res.status(404).json({ success: false, message: 'ไม่พบข้อมูลรถ' });
    }

    deleteVehicleImage(vehicle.image);
    await run('DELETE FROM vehicles WHERE id = ?', [req.params.id]);
    await logActivity(req.user.id, 'DELETE_VEHICLE', `ลบรถ: ${vehicle.name} (${vehicle.license_plate})`);

    res.json({ success: true, message: 'ลบข้อมูลรถสำเร็จ' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
