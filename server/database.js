const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

const DB_PATH = path.join(__dirname, 'database.sqlite');

let db = null;

async function initDatabase() {
  const SQL = await initSqlJs();

  if (fs.existsSync(DB_PATH)) {
    const buffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(buffer);
  } else {
    db = new SQL.Database();
  }

  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      full_name TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('user', 'admin')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS vehicles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      license_plate TEXT UNIQUE NOT NULL,
      vehicle_type TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'available' CHECK(status IN ('available', 'unavailable')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS bookings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      vehicle_id INTEGER NOT NULL,
      start_date TEXT NOT NULL,
      end_date TEXT NOT NULL,
      purpose TEXT,
      status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'approved', 'rejected', 'cancelled')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (vehicle_id) REFERENCES vehicles(id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS activity_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      action TEXT NOT NULL,
      details TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  seedData();
  saveDatabase();
  return db;
}

function seedData() {
  const userCount = db.exec('SELECT COUNT(*) as count FROM users')[0]?.values[0][0] || 0;
  if (userCount > 0) return;

  const adminPassword = bcrypt.hashSync('admin123', 10);
  const userPassword = bcrypt.hashSync('user123', 10);

  db.run(
    'INSERT INTO users (username, password, full_name, role) VALUES (?, ?, ?, ?)',
    ['admin', adminPassword, 'ผู้ดูแลระบบ', 'admin']
  );
  db.run(
    'INSERT INTO users (username, password, full_name, role) VALUES (?, ?, ?, ?)',
    ['user1', userPassword, 'สมชาย ใจดี', 'user']
  );
  db.run(
    'INSERT INTO users (username, password, full_name, role) VALUES (?, ?, ?, ?)',
    ['user2', userPassword, 'สมหญิง รักเรียน', 'user']
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

  vehicles.forEach(([name, plate, type, status]) => {
    db.run(
      'INSERT INTO vehicles (name, license_plate, vehicle_type, status) VALUES (?, ?, ?, ?)',
      [name, plate, type, status]
    );
  });

  logActivity(null, 'SYSTEM_INIT', 'ระบบเริ่มต้นพร้อมข้อมูลตัวอย่าง');
}

function saveDatabase() {
  const data = db.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(DB_PATH, buffer);
}

function logActivity(userId, action, details) {
  db.run(
    'INSERT INTO activity_logs (user_id, action, details) VALUES (?, ?, ?)',
    [userId, action, details]
  );
  saveDatabase();
}

function queryAll(sql, params = []) {
  const stmt = db.prepare(sql);
  stmt.bind(params);
  const results = [];
  while (stmt.step()) {
    results.push(stmt.getAsObject());
  }
  stmt.free();
  return results;
}

function queryOne(sql, params = []) {
  const results = queryAll(sql, params);
  return results[0] || null;
}

function run(sql, params = []) {
  db.run(sql, params);
  saveDatabase();
  return { changes: db.getRowsModified(), lastId: getLastInsertId() };
}

function getLastInsertId() {
  const result = db.exec('SELECT last_insert_rowid() as id');
  return result[0]?.values[0][0] || null;
}

module.exports = {
  initDatabase,
  queryAll,
  queryOne,
  run,
  logActivity,
  saveDatabase,
};
