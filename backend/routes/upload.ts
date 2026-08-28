import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { v4 as uuid } from 'uuid';
import { authenticateToken, requireAdmin } from '../middleware/auth';

const router = Router();

// Resolve uploads dir: env override > cwd/backend/uploads > cwd/uploads (prod bundle)
function getUploadsDir(): string {
  if (process.env.UPLOADS_DIR) return process.env.UPLOADS_DIR;
  // Try ESM __dirname, fallback to cwd
  let baseDir: string;
  try {
    baseDir = path.dirname(fileURLToPath((import.meta as any).url));
  } catch {
    baseDir = process.cwd();
  }
  const candidates = [
    path.join(process.cwd(), 'backend', 'uploads'),
    path.join(process.cwd(), 'uploads'),
    path.join(baseDir, '..', 'uploads'),
    path.join(baseDir, 'uploads'),
  ];
  // Prefer first that exists, otherwise backend/uploads
  for (const dir of candidates) {
    if (fs.existsSync(dir)) return dir;
  }
  return candidates[0];
}
const uploadsDir = getUploadsDir();
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: uploadsDir,
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${uuid()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
  fileFilter: (_req, file, cb) => {
    const allowed = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Format de fichier non supporté. Utilisez JPG, PNG ou WebP.'));
    }
  },
});

// POST /api/upload — upload a single image
router.post('/api/upload', authenticateToken, requireAdmin, (req, res) => {
  upload.single('image')(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ error: 'Le fichier ne doit pas dépasser 5 Mo.' });
      }
      return res.status(400).json({ error: err.message });
    }
    if (err) {
      return res.status(400).json({ error: err.message });
    }
    if (!req.file) {
      return res.status(400).json({ error: 'Aucun fichier envoyé.' });
    }

    const url = `/uploads/${req.file.filename}`;
    res.json({ url, filename: req.file.filename });
  });
});

// POST /api/upload/multiple — upload up to 5 images
router.post('/api/upload/multiple', authenticateToken, requireAdmin, (req, res) => {
  upload.array('images', 5)(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ error: 'Chaque fichier ne doit pas dépasser 5 Mo.' });
      }
      if (err.code === 'LIMIT_UNEXPECTED_FILE') {
        return res.status(400).json({ error: 'Maximum 5 images à la fois.' });
      }
      return res.status(400).json({ error: err.message });
    }
    if (err) {
      return res.status(400).json({ error: err.message });
    }
    if (!req.files || (req.files as Express.Multer.File[]).length === 0) {
      return res.status(400).json({ error: 'Aucun fichier envoyé.' });
    }

    const urls = (req.files as Express.Multer.File[]).map(f => `/uploads/${f.filename}`);
    res.json({ urls });
  });
});

export default router;
