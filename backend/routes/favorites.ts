import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { safeJsonParse } from '../lib/helpers';

const router = Router();

// Get favorites
router.get('/api/favorites', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const favorites = await prisma.favorite.findMany({
      where: { userId: req.userId! },
      include: { product: { include: { category: true } } },
    });

    const products = favorites.map((f) => ({
      ...f.product,
      images: safeJsonParse(f.product.images, []),
    }));

    res.json(products);
  } catch {
    res.status(500).json({ error: 'Erreur lors du chargement des favoris' });
  }
});

// Toggle favorite
router.post('/api/favorites/:productId', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { productId } = req.params;
    const existing = await prisma.favorite.findUnique({
      where: { userId_productId: { userId: req.userId!, productId } },
    });

    if (existing) {
      await prisma.favorite.delete({ where: { id: existing.id } });
    } else {
      await prisma.favorite.create({
        data: { userId: req.userId!, productId },
      });
    }

    const allFavorites = await prisma.favorite.findMany({
      where: { userId: req.userId! },
      select: { productId: true },
    });

    res.json({ favorites: allFavorites.map((f) => f.productId) });
  } catch {
    res.status(500).json({ error: 'Erreur lors de la mise à jour des favoris' });
  }
});

export default router;
