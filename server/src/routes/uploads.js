const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();

const uploadsDir = process.env.UPLOADS_DIR || path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${uuidv4()}${ext}`);
  },
});

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

function fileFilter(req, file, cb) {
  if (!ALLOWED_TYPES.includes(file.mimetype)) {
    return cb(new Error('Only JPEG, PNG, WEBP, or GIF images are allowed'));
  }
  cb(null, true);
}

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024, files: 10 }, // 5MB per file
});

function publicUrlFor(req, filename) {
  return `${req.protocol}://${req.get('host')}/uploads/${filename}`;
}

function handleMulterError(err, res) {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') return res.status(400).json({ error: 'Each image must be under 5MB' });
    return res.status(400).json({ error: err.message });
  }
  return res.status(400).json({ error: err.message || 'Upload failed' });
}

// POST /api/uploads/single -- one image (used for a turf's cover image)
router.post('/single', requireAuth, requireRole('owner'), (req, res) => {
  upload.single('image')(req, res, (err) => {
    if (err) return handleMulterError(err, res);
    if (!req.file) return res.status(400).json({ error: 'No image file provided (field name: image)' });
    res.status(201).json({ url: publicUrlFor(req, req.file.filename) });
  });
});

// POST /api/uploads/multiple -- several images at once (used for a turf's gallery)
router.post('/multiple', requireAuth, requireRole('owner'), (req, res) => {
  upload.array('images', 10)(req, res, (err) => {
    if (err) return handleMulterError(err, res);
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No image files provided (field name: images)' });
    }
    const urls = req.files.map((f) => publicUrlFor(req, f.filename));
    res.status(201).json({ urls });
  });
});

module.exports = { router, uploadsDir };
