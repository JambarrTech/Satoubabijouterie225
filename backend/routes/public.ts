import { Router } from 'express';
import { prisma } from '../lib/prisma';

const router = Router();

// Public: basic stats for home page (no auth required)
router.get('/api/stats/public', async (_req, res) => {
  try {
    const [totalCustomers, totalProducts, totalLikes] = await Promise.all([
      prisma.user.count({ where: { role: 'CUSTOMER' } }),
      prisma.product.count(),
      prisma.like.count(),
    ]);

    res.json({
      totalCustomers,
      totalProducts,
      totalLikes,
    });
  } catch {
    res.status(500).json({ error: 'Erreur' });
  }
});

export default router;
