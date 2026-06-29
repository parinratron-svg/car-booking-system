const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

let pool = null;

async function initDatabase() {
  const {
    DB_HOST = 'db',
    DB_PORT = 3306,
    DB_USER = 'root',
    DB_PASSWORD = 'rootpassword',
    DB_NAME = 'car_booking_db',
  } = process.env;

  const rootConnection = await mysql.createConnection({
    host: DB_HOST,
    port: DB_PORT,
    user: DB_USER,
    password: DB_PASSWORD,
  });

  await rootConnection.query(`CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`);
  await rootConnection.end();

  pool = mysql.createPool({
    host: DB_HOST,
    port: DB_PORT,
    user: DB_USER,
    password: DB_PASSWORD,
    database: DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
  });

  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      username VARCHAR(50) NOT NULL UNIQUE,
      password VARCHAR(255) NOT NULL,
      full_name VARCHAR(100) NOT NULL,
      email VARCHAR(255),
      phone VARCHAR(20),
      role ENUM('user', 'admin') NOT NULL DEFAULT 'user',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS vehicles (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      license_plate VARCHAR(50) NOT NULL UNIQUE,
      vehicle_type VARCHAR(50) NOT NULL,
      status ENUM('available', 'unavailable') NOT NULL DEFAULT 'available',
      image VARCHAR(255),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS bookings (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      vehicle_id INT NOT NULL,
      start_date DATE NOT NULL,
      end_date DATE NOT NULL,
      purpose TEXT,
      status ENUM('pending', 'approved', 'rejected', 'cancelled') NOT NULL DEFAULT 'pending',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (vehicle_id) REFERENCES vehicles(id)
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS activity_logs (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT,
      action VARCHAR(50) NOT NULL,
      details TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  await seedData();
  return pool;
}

async function seedData() {
  const [rows] = await pool.query('SELECT COUNT(*) as count FROM users');
  const userCount = rows[0]?.count || 0;
  if (userCount > 0) return;

  const adminPassword = bcrypt.hashSync('admin123', 10);
  const userPassword = bcrypt.hashSync('user123', 10);

  await pool.query(
    'INSERT INTO users (username, password, full_name, email, phone, role) VALUES (?, ?, ?, ?, ?, ?)',
    ['admin', adminPassword, 'ผู้ดูแลระบบ', 'admin@carbooking.local', '0800000000', 'admin']
  );
  await pool.query(
    'INSERT INTO users (username, password, full_name, email, phone, role) VALUES (?, ?, ?, ?, ?, ?)',
    ['user1', userPassword, 'สมชาย ใจดี', 'user1@carbooking.local', '0812345678', 'user']
  );
  await pool.query(
    'INSERT INTO users (username, password, full_name, email, phone, role) VALUES (?, ?, ?, ?, ?, ?)',
    ['user2', userPassword, 'สมหญิง รักเรียน', 'user2@carbooking.local', '0898765432', 'user']
  );

  const vehicles = [
    ['Toyota Camry', 'กข-1234', 'sedan', 'available'],
    ['Honda Civic', 'กค-5678', 'sedan', 'available'],
    ['Toyota Fortuner', 'กง-9012', 'suv', 'unavailable'],
    ['Isuzu D-Max', 'กจ-3456', 'pickup', 'available'],
    ['Mercedes-Benz Sprinter', 'กฉ-7890', 'van', 'available'],
    ['Nissan Almera', 'กช-1122', 'sedan', 'available'],
    ['Mitsubishi Pajero', 'กซ-3344', 'suv', 'available'],
    ['Ford Ranger', 'กญ-5566', 'pickup', 'unavailable'],
  ];

  for (const [name, plate, type, status] of vehicles) {
    await pool.query(
      'INSERT INTO vehicles (name, license_plate, vehicle_type, status, image) VALUES (?, ?, ?, ?, ?)',
      [name, plate, type, status, null]
    );
  }

  await logActivity(null, 'SYSTEM_INIT', 'ระบบเริ่มต้นพร้อมข้อมูลตัวอย่าง');
}

async function queryAll(sql, params = []) {
  const [rows] = await pool.query(sql, params);
  return rows;
}

async function queryOne(sql, params = []) {
  const rows = await queryAll(sql, params);
  return rows[0] || null;
}

async function run(sql, params = []) {
  const [result] = await pool.query(sql, params);
  return { changes: result.affectedRows, lastId: result.insertId };
}

async function logActivity(userId, action, details) {
  await pool.query(
    'INSERT INTO activity_logs (user_id, action, details) VALUES (?, ?, ?)',
    [userId, action, details]
  );
}

module.exports = {
  initDatabase,
  queryAll,
  queryOne,
  run,
  logActivity,
};
