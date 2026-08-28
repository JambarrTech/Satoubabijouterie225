import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';

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

  // Memory check
  const mem = process.memoryUsage();
  const heapUsedMB = Math.round(mem.heapUsed / 1024 / 1024);
  checks.memory = `${heapUsedMB}MB`;
  // Warn if heap > 80% of 512MB (common Cloud Run limit)
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
