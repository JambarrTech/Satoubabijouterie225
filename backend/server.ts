import express from "express";
import cors from "cors";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { createRequire } from "module";
import pinoHttp from "pino-http";
import logger from "./lib/logger";
import { setupSecurity } from "./middleware/security";
import authRoutes from "./routes/auth";
import categoryRoutes from "./routes/categories";
import productRoutes from "./routes/products";
import cartRoutes from "./routes/cart";
import orderRoutes from "./routes/orders";
import favoriteRoutes from "./routes/favorites";
import reviewRoutes from "./routes/reviews";
import notificationRoutes from "./routes/notifications";
import customRoutes from "./routes/custom";
import repairRoutes from "./routes/repairs";
import couponRoutes from "./routes/coupons";
import adminRoutes from "./routes/admin";
import publicRoutes from "./routes/public";
import settingsRoutes from "./routes/settings";
import uploadRoutes from "./routes/upload";
import pushRoutes from "./routes/push";
import healthRoutes from "./routes/health";

const app = express();
// ESM + CJS compatible __dirname (esbuild cjs bundle leaves import.meta empty)
let __filename: string;
let __dirname: string;
try {
  // ESM: import.meta.url available
  __filename = fileURLToPath((import.meta as any).url);
  __dirname = path.dirname(__filename);
} catch {
  // CJS bundle fallback
  try {
    const require = createRequire(import.meta.url as any);
    __filename = require('url').fileURLToPath(import.meta.url as any);
    __dirname = path.dirname(__filename);
  } catch {
    __filename = process.cwd();
    __dirname = process.cwd();
  }
}

// Security: helmet, compression, rate limiting, cache headers
setupSecurity(app);

// Request logging (pino-http) — disabled in test, sampled in prod
if (process.env.NODE_ENV !== 'test') {
  app.use(pinoHttp({
    logger,
    autoLogging: {
      ignore: (req) => req.url === '/api/health',
    },
  }));
}

// CORS — supports single origin or comma-separated list via APP_URL / CORS_ORIGIN
const rawOrigins = process.env.CORS_ORIGIN || process.env.APP_URL || 'http://localhost:5173';
const allowedOrigins = rawOrigins.split(',').map(s => s.trim()).filter(Boolean);
app.use(cors({
  origin: (origin, callback) => {
    // Allow non-browser requests (curl, health checks) with no origin
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
      return callback(null, true);
    }
    // In production, reject unknown origins; in dev, log warning but allow localhost
    if (process.env.NODE_ENV !== 'production' && origin.startsWith('http://localhost')) {
      return callback(null, true);
    }
    return callback(new Error(`CORS blocked for origin: ${origin}`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  maxAge: 86400,
}));

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Serve uploaded files as static (ensure directory exists)
function resolveUploadsDir(): string {
  if (process.env.UPLOADS_DIR) return process.env.UPLOADS_DIR;
  const cwdBackend = path.join(process.cwd(), 'backend', 'uploads');
  const sibling = path.join(__dirname, 'uploads');
  // Prefer backend/uploads if running via tsx, otherwise dist/uploads or cwd
  // Check which exists or fallback to cwdBackend
  return fs.existsSync(cwdBackend) ? cwdBackend : (fs.existsSync(sibling) ? sibling : cwdBackend);
}
const uploadsDir = resolveUploadsDir();
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
app.use('/uploads', express.static(uploadsDir, {
  maxAge: '1y',
  etag: true,
}));

// Health check
app.use(healthRoutes);

// Mount all routes
app.use(authRoutes);
app.use(categoryRoutes);
app.use(productRoutes);
app.use(cartRoutes);
app.use(orderRoutes);
app.use(favoriteRoutes);
app.use(reviewRoutes);
app.use(notificationRoutes);
app.use(customRoutes);
app.use(repairRoutes);
app.use(couponRoutes);
app.use(adminRoutes);
app.use(publicRoutes);
app.use(settingsRoutes);
app.use(uploadRoutes);
app.use(pushRoutes);

// 404 handler — only for API routes, pass through to Vite for everything else
app.use((req, res, next) => {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: 'Route non trouvée' });
  }
  next();
});

// Global error handler — only for API routes
app.use((err: any, req: express.Request, res: express.Response, _next: express.NextFunction) => {
  // Handle CORS errors
  if (err.message && err.message.startsWith('CORS blocked')) {
    return res.status(403).json({ error: 'Origine non autorisée' });
  }
  // Handle JSON parse errors
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'JSON invalide' });
  }
  // Handle payload too large
  if (err.type === 'entity.too.large') {
    return res.status(413).json({ error: 'Payload trop volumineux' });
  }
  if (req.path.startsWith('/api/')) {
    console.error('Unhandled error:', err);
    // Don't leak stack in production
    const message = process.env.NODE_ENV === 'production' ? 'Erreur interne du serveur' : err.message || 'Erreur interne du serveur';
    return res.status(err.status || 500).json({ error: message });
  }
  // Non-API errors: pass to Vite/next middleware
  _next(err);
});

export default app;
