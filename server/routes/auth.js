const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { queryOne, logActivity } = require('../database');
const { JWT_SECRET } = require('../middleware/auth');

const router = express.Router();

// FR-01: Login API
router.post('/login', (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({
      success: false,
      message: 'กรุณากรอก Username และ Password',
    });
  }

  const user = queryOne('SELECT * FROM users WHERE username = ?', [username]);

  if (!user || !bcrypt.compareSync(password, user.password)) {
    logActivity(null, 'LOGIN_FAILED', `พยายามเข้าสู่ระบบด้วย username: ${username}`);
    return res.status(401).json({
      success: false,
      message: 'Username หรือ Password ไม่ถูกต้อง',
    });
  }

  const token = jwt.sign(
    { id: user.id, username: user.username, role: user.role, fullName: user.full_name },
    JWT_SECRET,
    { expiresIn: '8h' }
  );

  logActivity(user.id, 'LOGIN', `เข้าสู่ระบบสำเร็จ`);

  res.json({
    success: true,
    message: 'เข้าสู่ระบบสำเร็จ',
    data: {
      token,
      user: {
        id: user.id,
        username: user.username,
        fullName: user.full_name,
        role: user.role,
      },
    },
  });
});

// FR-01: Logout (client-side token removal, server logs activity)
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
