import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { authenticateToken, requireAdmin, AuthRequest } from '../middleware/auth';

const router = Router();

// Get active coupons (public)
router.get('/api/coupons', async (_req, res) => {
  try {
    const coupons = await prisma.coupon.findMany({
      where: { isActive: true },
      select: { id: true, code: true, description: true, discountPercent: true, expiryDate: true },
    });
    res.json(coupons);
  } catch {
    res.status(500).json({ error: 'Erreur' });
  }
});

// Admin: get all coupons
router.get('/api/coupons/all', authenticateToken, requireAdmin, async (_req, res) => {
  try {
    const coupons = await prisma.coupon.findMany({ orderBy: { createdAt: 'desc' } });
    res.json(coupons);
  } catch {
    res.status(500).json({ error: 'Erreur' });
  }
});

// Admin: create coupon
router.post('/api/coupons', authenticateToken, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const { code, discountPercent, description, expiryDate } = req.body;
    if (!code || !discountPercent) {
      return res.status(400).json({ error: 'Code et pourcentage requis' });
    }
    const discount = Number(discountPercent);
    if (isNaN(discount) || discount < 1 || discount > 100) {
      return res.status(400).json({ error: 'Le pourcentage doit être entre 1 et 100' });
    }
    const existing = await prisma.coupon.findFirst({ where: { code: code.toUpperCase() } });
    if (existing) {
      return res.status(400).json({ error: 'Ce code promo existe déjà' });
    }
    const coupon = await prisma.coupon.create({
      data: {
        code: code.toUpperCase(),
        discountPercent: discount,
        description: description || '',
        expiryDate: expiryDate ? new Date(expiryDate) : new Date('2026-12-31'),
      },
    });
    res.status(201).json(coupon);
  } catch {
    res.status(500).json({ error: 'Erreur' });
  }
});

// Admin: update coupon
router.put('/api/coupons/:id', authenticateToken, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const { code, discountPercent, description, expiryDate, isActive } = req.body;
    if (code) {
      const existing = await prisma.coupon.findFirst({ where: { code: code.toUpperCase(), NOT: { id: req.params.id } } });
      if (existing) return res.status(400).json({ error: 'Ce code promo existe déjà' });
    }
    if (discountPercent !== undefined) {
      const d = Number(discountPercent);
      if (isNaN(d) || d < 1 || d > 100) {
        return res.status(400).json({ error: 'Le pourcentage doit être entre 1 et 100' });
      }
    }
    const coupon = await prisma.coupon.update({
      where: { id: req.params.id },
      data: {
        ...(code !== undefined && { code: code.toUpperCase() }),
        ...(discountPercent !== undefined && { discountPercent: Number(discountPercent) }),
        ...(description !== undefined && { description }),
        ...(expiryDate !== undefined && { expiryDate: new Date(expiryDate) }),
        ...(isActive !== undefined && { isActive }),
      },
    });
    res.json(coupon);
  } catch {
    res.status(500).json({ error: 'Erreur' });
  }
});

// Admin: delete coupon
router.delete('/api/coupons/:id', authenticateToken, requireAdmin, async (req: AuthRequest, res) => {
  try {
    await prisma.coupon.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: 'Erreur' });
  }
});

export default router;
