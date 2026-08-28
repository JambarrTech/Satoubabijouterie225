import helmet from 'helmet';
import compression from 'compression';
import { Express, Request, Response, NextFunction } from 'express';

export function setupSecurity(app: Express) {
  // Trust proxy when behind Nginx/Cloud Run/Load Balancer
  app.set('trust proxy', 1);

  // Security headers — production hardened
  // Note: 'unsafe-eval' removed (no longer needed; Vite HMR only in dev).
  // 'unsafe-inline' kept for Tailwind inline styles & Vite; consider nonce in future.
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        imgSrc: ["'self'", "data:", "https:", "blob:", "https://firebasestorage.googleapis.com", "https://*.googleapis.com"],
        connectSrc: ["'self'", "https://wa.me", "https://api.wave.com", "https://api.orange.com", "https://api.sandbox.africastalking.com", "https://api.africastalking.com", "https://*.googleapis.com", "https://*.firebaseio.com", "https://fcm.googleapis.com", "https://*.firebaseapp.com"],
        frameSrc: ["'none'"],
        objectSrc: ["'none'"],
        baseUri: ["'self'"],
        formAction: ["'self'"],
      },
    },
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: "cross-origin" },
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true,
    },
    referrerPolicy: { policy: "strict-origin-when-cross-origin" },
  }));

  // Gzip compression
  app.use(compression({
    filter: (req, res) => {
      if (req.headers['x-no-compression']) return false;
      return compression.filter(req, res);
    },
    threshold: 1024,
  }));

  // Cache headers for static assets
  app.use('/uploads', (_req: Request, res: Response, next: NextFunction) => {
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    next();
  });

  // Global rate limiter (simple IP-based, production: use Redis)
  const globalRateLimit = new Map<string, { count: number; resetAt: number }>();
  const MAX_REQUESTS = 200;
  const WINDOW_MS = 60 * 1000;

  app.use((req: Request, res: Response, next: NextFunction) => {
    const key = req.ip || req.socket.remoteAddress || 'unknown';
    const now = Date.now();
    const entry = globalRateLimit.get(key);

    if (!entry || now > entry.resetAt) {
      globalRateLimit.set(key, { count: 1, resetAt: now + WINDOW_MS });
      return next();
    }

    entry.count++;
    if (entry.count > MAX_REQUESTS) {
      return res.status(429).json({ error: 'Trop de requêtes. Réessayez dans une minute.' });
    }
    next();
  });

  // Cleanup every 5 min
  const interval = setInterval(() => {
    const now = Date.now();
    for (const [k, v] of globalRateLimit) {
      if (now > v.resetAt) globalRateLimit.delete(k);
    }
  }, 5 * 60 * 1000);
  if (interval.unref) interval.unref();
}
