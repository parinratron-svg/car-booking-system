const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { queryOne, run, logActivity } = require('../database');
const { JWT_SECRET } = require('../middleware/auth');

const router = express.Router();

function buildAuthResponse(user) {
  const token = jwt.sign(
    {
      id: user.id,
      username: user.username,
      role: user.role,
      fullName: user.full_name,
      email: user.email,
      phone: user.phone,
    },
    JWT_SECRET,
    { expiresIn: '8h' }
  );

  return {
    token,
    user: {
      id: user.id,
      username: user.username,
      fullName: user.full_name,
      email: user.email,
      phone: user.phone,
      role: user.role,
    },
  };
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isValidPhone(phone) {
  return /^[0-9]{9,10}$/.test(phone.replace(/[-\s]/g, ''));
}

// สมัครสมาชิก
router.post('/register', (req, res) => {
  const { username, password, full_name, email, phone } = req.body;

  if (!username || !password || !full_name || !email || !phone) {
    return res.status(400).json({
      success: false,
      message: 'กรุณากรอกข้อมูลให้ครบทุกช่อง',
    });
  }

  if (password.length < 6) {
    return res.status(400).json({
      success: false,
      message: 'รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร',
    });
  }

  if (!isValidEmail(email)) {
    return res.status(400).json({
      success: false,
      message: 'รูปแบบอีเมลไม่ถูกต้อง',
    });
  }

  const cleanPhone = phone.replace(/[-\s]/g, '');
  if (!isValidPhone(cleanPhone)) {
    return res.status(400).json({
      success: false,
      message: 'เบอร์โทรต้องเป็นตัวเลข 9-10 หลัก',
    });
  }

  const existingUsername = queryOne('SELECT id FROM users WHERE username = ?', [username.trim()]);
  if (existingUsername) {
    return res.status(409).json({
      success: false,
      message: 'Username นี้ถูกใช้งานแล้ว',
    });
  }

  const existingEmail = queryOne('SELECT id FROM users WHERE email = ?', [email.trim().toLowerCase()]);
  if (existingEmail) {
    return res.status(409).json({
      success: false,
      message: 'อีเมลนี้ถูกใช้งานแล้ว',
    });
  }

  const hashedPassword = bcrypt.hashSync(password, 10);
  const result = run(
    'INSERT INTO users (username, password, full_name, email, phone, role) VALUES (?, ?, ?, ?, ?, ?)',
    [username.trim(), hashedPassword, full_name.trim(), email.trim().toLowerCase(), cleanPhone, 'user']
  );

  const user = queryOne('SELECT * FROM users WHERE id = ?', [result.lastId]);

  logActivity(user.id, 'REGISTER', `สมัครสมาชิก: ${username}`);

  res.status(201).json({
    success: true,
    message: 'สมัครสมาชิกสำเร็จ',
    data: buildAuthResponse(user),
  });
});

// FR-01: Login API (รองรับ username หรือ email)
router.post('/login', (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({
      success: false,
      message: 'กรุณากรอก Username/Email และ Password',
    });
  }

  const loginId = username.trim();
  const user = queryOne(
    'SELECT * FROM users WHERE username = ? OR email = ?',
    [loginId, loginId.toLowerCase()]
  );

  if (!user || !bcrypt.compareSync(password, user.password)) {
    logActivity(null, 'LOGIN_FAILED', `พยายามเข้าสู่ระบบด้วย: ${loginId}`);
    return res.status(401).json({
      success: false,
      message: 'Username/Email หรือ Password ไม่ถูกต้อง',
    });
  }

  logActivity(user.id, 'LOGIN', 'เข้าสู่ระบบสำเร็จ');

  res.json({
    success: true,
    message: 'เข้าสู่ระบบสำเร็จ',
    data: buildAuthResponse(user),
  });
});

router.post('/logout', (req, res) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (token) {
    try {
      const user = jwt.verify(token, JWT_SECRET);
      logActivity(user.id, 'LOGOUT', 'ออกจากระบบ');
    } catch (e) {
      // token expired, ignore
    }
  }

  res.json({ success: true, message: 'ออกจากระบบสำเร็จ' });
});

module.exports = router;
