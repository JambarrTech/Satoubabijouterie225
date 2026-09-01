import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { authenticateToken, requireAdmin, AuthRequest } from '../middleware/auth';
import { logAction } from '../lib/audit';

const router = Router();
const HIDDEN_KEYS = ['email'];

// Public: get all store settings
router.get('/api/store-settings', async (_req, res) => {
  try {
    const settings = await prisma.storeSettings.findMany();
    const result: Record<string, string> = {};
    settings.forEach((s) => {
      if (!HIDDEN_KEYS.includes(s.key)) result[s.key] = s.value;
    });
    res.json(result);
  } catch {
    res.status(500).json({ error: 'Erreur' });
  }
});

// Admin: update store settings
router.put('/api/store-settings', authenticateToken, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const updates = req.body as Record<string, string>;
    for (const [key, value] of Object.entries(updates)) {
      if (HIDDEN_KEYS.includes(key)) continue;
      await prisma.storeSettings.upsert({
        where: { key },
        update: { value },
        create: { key, value },
      });
    }
    const settings = await prisma.storeSettings.findMany();
    const result: Record<string, string> = {};
    settings.forEach((s) => {
      if (!HIDDEN_KEYS.includes(s.key)) result[s.key] = s.value;
    });

    await logAction({
      userId: req.userId!,
      action: 'SETTINGS_UPDATE',
      entity: 'StoreSettings',
      details: { keys: Object.keys(updates) },
      ipAddress: req.ip,
    });

    res.json(result);
  } catch {
    res.status(500).json({ error: 'Erreur' });
  }
});

export default router;