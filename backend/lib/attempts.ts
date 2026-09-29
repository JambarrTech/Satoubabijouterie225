import { getRedis } from './rateLimit';

// Compteur d'essais (ex: OTP) : Redis partagé si configuré, sinon mémoire locale.
// Fail-open : en cas d'erreur, on laisse passer (le rate-limit reste la 1re barrière).
const memStore = new Map<string, { count: number; resetAt: number }>();

export async function countAttempt(key: string, windowMs: number): Promise<number> {
  const namespaced = `att:${key}`;
  const client = getRedis();
  if (client) {
    try {
      const count = await client.incr(namespaced);
      if (count === 1) {
        await client.expire(namespaced, Math.ceil(windowMs / 1000));
      }
      return count;
    } catch {
      // Fallback mémoire ci-dessous
    }
  }
  const now = Date.now();
  const entry = memStore.get(namespaced);
  if (!entry || now > entry.resetAt) {
    memStore.set(namespaced, { count: 1, resetAt: now + windowMs });
    return 1;
  }
  entry.count++;
  return entry.count;
}

export async function clearAttempts(key: string): Promise<void> {
  const namespaced = `att:${key}`;
  memStore.delete(namespaced);
  const client = getRedis();
  if (client) {
    try {
      await client.del(namespaced);
    } catch {}
  }
}
