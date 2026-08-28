import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { authenticateToken, requireAdmin, AuthRequest } from '../middleware/auth';

const router = Router();

// Public: get all categories
router.get('/api/categories', async (_req, res) => {
  try {
    const categories = await prisma.category.findMany({
      include: { _count: { select: { products: true } } },
    });
    res.json(categories.map(c => ({ ...c, itemCount: c._count.products })));
  } catch {
    res.status(500).json({ error: 'Erreur lors du chargement des catégories' });
  }
});

// Admin: create category
router.post('/api/categories', authenticateToken, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const { name, image, description } = req.body;
    if (!name) return res.status(400).json({ error: 'Nom requis' });
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const category = await prisma.category.create({
      data: { name, slug, image: image || null, description: description || null },
    });
    res.status(201).json(category);
  } catch {
    res.status(500).json({ error: 'Erreur' });
  }
});

// Admin: update category
router.put('/api/categories/:id', authenticateToken, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const { name, image, description } = req.body;
    const data: any = {};
    if (name) { data.name = name; data.slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''); }
    if (image !== undefined) data.image = image;
    if (description !== undefined) data.description = description;
    const category = await prisma.category.update({ where: { id: req.params.id }, data });
    res.json(category);
  } catch {
    res.status(500).json({ error: 'Erreur' });
  }
});

// Admin: delete category
router.delete('/api/categories/:id', authenticateToken, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const productCount = await prisma.product.count({ where: { categoryId: req.params.id } });
    if (productCount > 0) {
      return res.status(400).json({ error: `${productCount} produit(s) utilisent cette catégorie. Supprimez-les d'abord.` });
    }
    await prisma.category.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: 'Erreur' });
  }
});

export default router;
