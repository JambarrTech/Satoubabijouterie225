import helmet from 'helmet';
import compression from 'compression';
import { Express, Request, Response, NextFunction } from 'express';
import { rateLimit } from '../lib/rateLimit';
import { RATE_LIMITS, RATE_WINDOW_MS, TRUST_PROXY } from '../lib/config';

export function setupSecurity(app: Express) {
  // Vercel = 1 seul proxy devant l'app (X-Forwarded-For fiable pour req.ip).
  app.set('trust proxy', TRUST_PROXY);

  // Security headers — production hardened
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        imgSrc: ["'self'", "data:", "https:", "blob:", "https://*.googleapis.com"],
        connectSrc: ["'self'", "https://wa.me", "https://api.sandbox.africastalking.com", "https://api.africastalking.com", "https://*.googleapis.com", "https://*.blob.vercel-storage.com", "https://*.vercel-storage.com", "https://*.vercel.app"],
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

  // Block suspicious requests (path traversal, null bytes, etc.)
  app.use((req: Request, res: Response, next: NextFunction) => {
    const suspicious = /(\.\.|%00|%0d|%0a|\x00)/i;
    if (suspicious.test(req.url) || suspicious.test(decodeURIComponent(req.url))) {
      return res.status(400).json({ error: 'Requete invalide' });
    }
    next();
  });

  // Stricter rate limit for auth endpoints (portée 'auth' dédiée)
  const authRateLimit = rateLimit(RATE_LIMITS.auth, RATE_WINDOW_MS, { name: 'auth' });
  app.use('/api/auth', authRateLimit);

  // Rate limit for order creation
  const orderRateLimit = rateLimit(RATE_LIMITS.orders, RATE_WINDOW_MS, { name: 'orders' });
  app.use('/api/orders', orderRateLimit);

  // Rate limit for uploads
  const uploadRateLimit = rateLimit(RATE_LIMITS.upload, RATE_WINDOW_MS, { name: 'upload' });
  app.use('/api/upload', uploadRateLimit);


  // Cache headers for static assets
  app.use('/uploads', (_req: Request, res: Response, next: NextFunction) => {
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    next();
  });

  // Global rate limiter (fallback)
  const globalRateLimit = rateLimit(RATE_LIMITS.global, RATE_WINDOW_MS, { name: 'global' });
  app.use(globalRateLimit);
}
