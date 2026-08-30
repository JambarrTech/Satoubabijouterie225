import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
import { authenticateToken, requireAdmin } from '../middleware/auth';
import { handleUpload, type HandleUploadBody } from '@vercel/blob/client';

const router = Router();

// ============================================================
// Vercel Blob (production / serverless) — upload direct depuis
// le navigateur via token. Parcourt la limite de body serverless.
// Actif si BLOB_READ_WRITE_TOKEN est configuré (Vercel).
// ============================================================
const hasBlobToken = !!process.env.BLOB_READ_WRITE_TOKEN;

// POST /api/upload/handle — génère un token d'upload pour Vercel Blob.
// Réservé admin. Valide le type MIME (images uniquement).
router.post('/api/upload/handle', authenticateToken, requireAdmin, async (req, res) => {
  if (!hasBlobToken) {
    return res.status(400).json({ error: 'Vercel Blob n\u2019est pas configuré (BLOB_READ_WRITE_TOKEN manquant)' });
  }
  try {
    const body = (await req.body) as HandleUploadBody;
    const jsonResponse = await handleUpload({
      body,
      request: req,
      onBeforeGenerateToken: async (pathname) => ({
        allowedContentTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
        maximumSizeInBytes: 5 * 1024 * 1024,
        addRandomSuffix: true,
        // L'admin est déjà validé par le middleware requireAdmin ci-dessus.
        ...(pathname ? {} : {}),
      }),
      onUploadCompleted: async () => {},
    });
    return res.json(jsonResponse);
  } catch (error: any) {
    console.error('Blob handleUpload error:', error);
    return res.status(500).json({ error: error.message || 'Erreur génération token upload' });
  }
});

// ============================================================
// Fallback local (développement) — stockage disque via multer.
// Utilisé uniquement quand Vercel Blob n'est pas configuré.
// ============================================================
function getUploadsDir(): string {
  if (process.env.UPLOADS_DIR) return process.env.UPLOADS_DIR;
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
  for (const dir of candidates) {
    if (fs.existsSync(dir)) return dir;
  }
  return candidates[0];
}
const uploadsDir = getUploadsDir();
try {
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
} catch {
  // Serverless (Vercel): filesystem is read-only, uploads go via Vercel Blob
}

const storage = multer.diskStorage({
  destination: uploadsDir,
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${crypto.randomUUID()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
  fileFilter: (_req, file, cb) => {
    const allowed = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];
    const ext = path.extname(file.originalname).toLowerCase();
    // Vérifie aussi le MIME déclaré (double garde ext + MIME)
    const mimeOk = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.mimetype);
    if (allowed.includes(ext) && mimeOk) {
      cb(null, true);
    } else {
      cb(new Error('Format de fichier non supporté. Utilisez JPG, PNG ou WebP.'));
    }
  },
});

// Fallback: POST /api/upload — upload a single image (dev local)
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

// Fallback: POST /api/upload/multiple — upload up to 5 images (dev local)
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
