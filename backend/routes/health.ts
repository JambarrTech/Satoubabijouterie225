import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { getRedis } from '../lib/rateLimit';

const router = Router();

router.get('/api/health', async (_req: Request, res: Response) => {
  const checks: Record<string, string> = {};
  let healthy = true;

  // Database check
  try {
    await prisma.$queryRaw`SELECT 1`;
    checks.database = 'ok';
  } catch (e: any) {
    checks.database = `error: ${e.message?.slice(0, 100) || 'unknown'}`;
    healthy = false;
  }

  // Redis check (optionnel — rate-limit et idempotence basculent en mémoire sans lui)
  try {
    const redis = getRedis();
    if (!redis) {
      checks.redis = 'not configured (memory fallback)';
    } else {
      await redis.ping();
      checks.redis = 'ok';
    }
  } catch (e: any) {
    checks.redis = `error: ${String(e?.message || e).slice(0, 80)}`;
  }

  // Memory check
  const mem = process.memoryUsage();
  const heapUsedMB = Math.round(mem.heapUsed / 1024 / 1024);
  checks.memory = `${heapUsedMB}MB`;
  if (heapUsedMB > 400) checks.memory += ' (high)';

  // Uptime
  const uptime = Math.round(process.uptime());

  res.status(healthy ? 200 : 503).json({
    status: healthy ? 'healthy' : 'degraded',
    version: process.env.npm_package_version || '1.0.0',
    uptime: `${uptime}s`,
    checks,
    timestamp: new Date().toISOString(),
  });
});

// Liveness probe (no DB, for k8s)
router.get('/api/health/live', (_req: Request, res: Response) => {
  res.json({ status: 'alive', timestamp: new Date().toISOString() });
});

export default router;