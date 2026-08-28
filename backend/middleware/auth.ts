import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || (process.env.NODE_ENV === 'test' ? 'test-jwt-secret-for-vitest-only' : '');

if (!JWT_SECRET) {
  console.error('FATAL: JWT_SECRET is not set in environment variables. Generate with: openssl rand -base64 64');
  if (process.env.NODE_ENV === 'production') {
    process.exit(1);
  } else {
    console.warn('Using insecure fallback JWT_SECRET for development only — set JWT_SECRET in .env');
  }
}

// Fail fast if JWT_SECRET is too weak in production
if (process.env.NODE_ENV === 'production' && JWT_SECRET.length < 32) {
  console.error('FATAL: JWT_SECRET too short (min 32 chars) for production.');
  process.exit(1);
}

export interface AuthRequest extends Request {
  userId?: string;
  userRole?: string;
}

export function authenticateToken(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Token d\'authentification requis' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string; role: string };
    req.userId = decoded.userId;
    req.userRole = decoded.role;
    next();
  } catch {
    return res.status(401).json({ error: 'Token invalide ou expiré' });
  }
}

export function optionalAuth(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (token) {
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { userId: string; role: string };
      req.userId = decoded.userId;
      req.userRole = decoded.role;
    } catch {}
  }
  next();
}

export function requireAdmin(req: AuthRequest, res: Response, next: NextFunction) {
  if (req.userRole !== 'ADMIN') {
    return res.status(403).json({ error: 'Accès réservé aux administrateurs' });
  }
  next();
}

export function generateToken(userId: string, role: string): string {
  return jwt.sign({ userId, role }, JWT_SECRET, { expiresIn: '7d' });
}

// In-memory rate limiter
// NOTE: This does not survive server restarts and is not suitable for multi-instance deployments.
// For production, use a Redis-based rate limiter (e.g., express-rate-limit with Redis store).
const rateLimitStore = new Map<string, { count: number; resetAt: number }>();
const MAX_STORE_SIZE = 10000;

export function rateLimit(maxRequests: number, windowMs: number) {
  return (req: Request, res: Response, next: NextFunction) => {
    const key = req.ip || req.socket.remoteAddress || 'unknown';
    const now = Date.now();
    const entry = rateLimitStore.get(key);

    if (!entry || now > entry.resetAt) {
      if (rateLimitStore.size >= MAX_STORE_SIZE) {
        // Evict oldest 20% of entries when store is full
        const cutoff = now;
        let evicted = 0;
        const target = Math.floor(MAX_STORE_SIZE * 0.2);
        for (const [k, v] of rateLimitStore) {
          if (evicted >= target) break;
          if (now > v.resetAt) { rateLimitStore.delete(k); evicted++; }
        }
      }
      rateLimitStore.set(key, { count: 1, resetAt: now + windowMs });
      return next();
    }

    entry.count++;
    if (entry.count > maxRequests) {
      return res.status(429).json({ error: 'Trop de requêtes. Veuillez réessayer plus tard.' });
    }
    next();
  };
}

// Cleanup old entries every 5 minutes
const cleanupInterval = setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore) {
    if (now > entry.resetAt) rateLimitStore.delete(key);
  }
}, 5 * 60 * 1000);

// Allow cleanup to be cleared on shutdown
if (typeof cleanupInterval === 'object' && cleanupInterval.unref) {
  cleanupInterval.unref();
}
