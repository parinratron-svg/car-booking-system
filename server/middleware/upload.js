const multer = require('multer');
const path = require('path');
const fs = require('fs');

const UPLOAD_DIR = path.join(__dirname, '../../public/uploads/vehicles');

if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOAD_DIR);
  },
  filename: (req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e6)}`;
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `vehicle-${unique}${ext}`);
  },
});

const fileFilter = (req, file, cb) => {
  const allowed = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowed.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error('รองรับเฉพาะไฟล์รูปภาพ JPG, PNG, GIF, WEBP'));
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 },
});

function deleteVehicleImage(imagePath) {
  if (!imagePath) return;
  const relative = imagePath.replace(/^\/+/, '');
  const fullPath = path.join(__dirname, '../../public', relative);
  if (fs.existsSync(fullPath)) {
    fs.unlinkSync(fullPath);
  }
}

function getImagePath(filename) {
  return `/uploads/vehicles/${filename}`;
}

module.exports = { upload, deleteVehicleImage, getImagePath, UPLOAD_DIR };
