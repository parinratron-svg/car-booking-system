CREATE DATABASE IF NOT EXISTS car_booking_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE car_booking_db;

CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(50) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  full_name VARCHAR(100) NOT NULL,
  role ENUM('user', 'admin') NOT NULL DEFAULT 'user',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS vehicles (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  license_plate VARCHAR(20) NOT NULL UNIQUE,
  vehicle_type VARCHAR(50) NOT NULL,
  status ENUM('available', 'unavailable', 'booked') NOT NULL DEFAULT 'available',
  created_by INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS activity_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT,
  action VARCHAR(50) NOT NULL,
  module VARCHAR(50) NOT NULL,
  details TEXT,
  ip_address VARCHAR(45),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Password: admin123 / user123 (bcrypt hash)
INSERT INTO users (username, password_hash, full_name, role) VALUES
('admin', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'ผู้ดูแลระบบ', 'admin'),
('user', '$2a$10$8K1p/a0dL1LXMIgoEDFrwOfMQ3/8QKj5K8YvK8YvK8YvK8YvK8YvK', 'ผู้ใช้ทั่วไป', 'user');

INSERT INTO vehicles (name, license_plate, vehicle_type, status, created_by) VALUES
('Toyota Camry', 'กก 1234', 'รถเก๋ง', 'available', 1),
('Honda Civic', 'ขข 5678', 'รถเก๋ง', 'available', 1),
('Toyota Commuter', 'คค 9012', 'รถตู้', 'unavailable', 1),
('Isuzu D-Max', 'งง 3456', 'รถกระบะ', 'available', 1);
