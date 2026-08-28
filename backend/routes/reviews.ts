import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { authenticateToken, requireAdmin, AuthRequest } from '../middleware/auth';

const router = Router();

// Get likes for product
router.get('/api/likes/:productId', async (req, res) => {
  try {
    const likes = await prisma.like.findMany({
      where: { productId: req.params.productId },
      include: { user: { select: { name: true, avatar: true } } },
      orderBy: { createdAt: 'desc' },
    });
    res.json(likes);
  } catch {
    res.status(500).json({ error: 'Erreur' });
  }
});

// Toggle like (create if not exists, delete if exists)
router.post('/api/likes', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { productId } = req.body;

    if (!productId) {
      return res.status(400).json({ error: 'Produit requis' });
    }

    const existingLike = await prisma.like.findFirst({
      where: { userId: req.userId!, productId },
    });

    if (existingLike) {
      // Unlike
      await prisma.like.delete({ where: { id: existingLike.id } });
      const likesCount = await prisma.like.count({ where: { productId } });
      await prisma.product.update({ where: { id: productId }, data: { likesCount } });
      return res.json({ liked: false, likesCount });
    }

    // Like
    await prisma.like.create({ data: { productId, userId: req.userId! } });
    const likesCount = await prisma.like.count({ where: { productId } });
    await prisma.product.update({ where: { id: productId }, data: { likesCount } });
    return res.status(201).json({ liked: true, likesCount });
  } catch {
    res.status(500).json({ error: 'Erreur lors du like' });
  }
});

// Admin: get all likes
router.get('/api/likes/all', authenticateToken, requireAdmin, async (_req: AuthRequest, res) => {
  try {
    const likes = await prisma.like.findMany({
      include: {
        user: { select: { name: true, email: true } },
        product: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(likes);
  } catch {
    res.status(500).json({ error: 'Erreur' });
  }
});

export default router;