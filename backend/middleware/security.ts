import helmet from 'helmet';
import compression from 'compression';
import { Express, Request, Response, NextFunction } from 'express';
import { rateLimit } from '../lib/rateLimit';

export function setupSecurity(app: Express) {
  // Trust proxy when behind Nginx/Cloud Run/Load Balancer
  app.set('trust proxy', 1);

  // Security headers — production hardened
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        imgSrc: ["'self'", "data:", "https:", "blob:", "https://firebasestorage.googleapis.com", "https://*.googleapis.com"],
        connectSrc: ["'self'", "https://wa.me", "https://api.sandbox.africastalking.com", "https://api.africastalking.com", "https://*.googleapis.com", "https://*.firebaseio.com", "https://fcm.googleapis.com", "https://*.firebaseapp.com"],
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

  // Stricter rate limit for auth endpoints
  const authRateLimit = rateLimit(15, 60 * 1000);
  app.use('/api/auth', authRateLimit);

  // Rate limit for order creation
  const orderRateLimit = rateLimit(10, 60 * 1000);
  app.use('/api/orders', orderRateLimit);

  // Rate limit for uploads
  const uploadRateLimit = rateLimit(20, 60 * 1000);
  app.use('/api/upload', uploadRateLimit);

  // Rate limit for push token registration
  const pushRateLimit = rateLimit(10, 60 * 1000);
  app.use('/api/push', pushRateLimit);

  // Cache headers for static assets
  app.use('/uploads', (_req: Request, res: Response, next: NextFunction) => {
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    next();
  });

  // Global rate limiter (fallback)
  const globalRateLimit = rateLimit(200, 60 * 1000);
  app.use(globalRateLimit);
}
