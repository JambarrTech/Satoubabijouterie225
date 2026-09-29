import { Redis } from '@upstash/redis';
import { Request, Response, NextFunction } from 'express';
import logger from './logger';

/**
 * Rate limiting partagé.
 * - En production Vercel (multi-instance) : basé sur Upstash Redis (UPSTASH_REDIS_REST_URL).
 * - Sinon (dev, tests) : fallback en mémoire locale.
 * Stratégie : fenêtre fixe (fixed window) par IP.
 */

let redis: Redis | null | undefined;

export function getRedis(): Redis | null {
  if (redis !== undefined) return redis;
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) {
    redis = null;
    return redis;
  }
  let client: Redis;
  try {
    client = new Redis({ url, token });
  } catch {
    client = null as unknown as Redis;
  }
  redis = client;
  return redis || null;
}

// Fallback mémoire (dev / tests / pas de Redis)
const memStore = new Map<string, { count: number; resetAt: number }>();
const MEM_MAX_SIZE = 20000;

function memCleanup(windowMs: number) {
  const now = Date.now();
  for (const [k, v] of memStore) {
    if (now > v.resetAt + windowMs) memStore.delete(k);
  }
  if (memStore.size > MEM_MAX_SIZE) {
    let removed = 0;
    for (const [k, v] of memStore) {
      if (now > v.resetAt) { memStore.delete(k); removed++; }
      if (removed > MEM_MAX_SIZE * 0.2) break;
    }
  }
}

export function rateLimit(maxRequests: number, windowMs: number, opts?: { keyBy?: 'ip' | 'user'; name?: string }) {
  return async (req: Request, res: Response, next: NextFunction) => {
    // keyBy 'user' : bucket par compte (évite de bloquer tout un NAT mobile partagé).
    // Réservé aux routes APRÈS authenticateToken. Les routes publiques/sensibles
    // (login, OTP…) restent keyées par IP pour ne pas affaiblir l'anti-brute-force.
    const authedId = (req as any).userId as string | undefined;
    const key = opts?.keyBy === 'user' && authedId
      ? `u:${authedId}`
      : `${req.ip || req.socket.remoteAddress || 'unknown'}`;
    // Portée du compteur : chaque middleware a SON propre bucket (sans ça, le
    // compteur global + les middlewares de route partagent la même clé et
    // multiplient les incréments → 429 prématurés pour un client normal).
    const scope = opts?.name || `${req.method}:${req.baseUrl}${req.path}`;
    const client = getRedis();

    if (client) {
      const bucketKey = `rl:${scope}:${key}:${Math.floor(Date.now() / windowMs)}`;
      try {
        const count = await client.incr(bucketKey);
        if (count === 1) {
          await client.expire(bucketKey, Math.ceil(windowMs / 1000));
        }
        if (count > maxRequests) {
          return res.status(429).json({ error: 'Trop de requêtes. Veuillez réessayer plus tard.' });
        }
        return next();
      } catch (err) {
        // Fail-open sur erreur Redis (cf. DEPLOYMENT.md) : ne pas bloquer
        // tout le trafic si Upstash est indisponible. Log + laisse passer.
        logger.warn({ err }, 'Rate limit Redis error - fail open');
        return next();
      }
    }

    // Fallback mémoire (clé par portée + IP/compte + fenêtre)
    const now = Date.now();
    memCleanup(windowMs);
    const memKey = `${scope}|${key}`;
    const entry = memStore.get(memKey);
    if (!entry || now > entry.resetAt) {
      memStore.set(memKey, { count: 1, resetAt: now + windowMs });
      return next();
    }
    entry.count++;
    if (entry.count > maxRequests) {
      return res.status(429).json({ error: 'Trop de requêtes. Veuillez réessayer plus tard.' });
    }
    next();
  };
}
