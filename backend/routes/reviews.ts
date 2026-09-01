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

// Toggle like (create if not exists, delete if exists) — atomic via transaction
router.post('/api/likes', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { productId } = req.body;

    if (!productId) {
      return res.status(400).json({ error: 'Produit requis' });
    }

    const result = await prisma.$transaction(async (tx) => {
      const existingLike = await tx.like.findFirst({
        where: { userId: req.userId!, productId },
      });

      if (existingLike) {
        await tx.like.delete({ where: { id: existingLike.id } });
      } else {
        await tx.like.create({ data: { productId, userId: req.userId! } });
      }

      const likesCount = await tx.like.count({ where: { productId } });
      await tx.product.update({ where: { id: productId }, data: { likesCount } });

      return { liked: !existingLike, likesCount };
    });

    const status = result.liked ? 201 : 200;
    res.status(status).json(result);
  } catch {
    res.status(500).json({ error: 'Erreur lors du like' });
  }
});

// Admin: get all likes
router.get('/api/likes/all', authenticateToken, requireAdmin, async (_req: AuthRequest, res) => {
  try {
    const likes = await prisma.like.findMany({
      include: {
        user: { select: { name: true } },
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