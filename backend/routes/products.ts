import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { authenticateToken, requireAdmin, optionalAuth, rateLimit, AuthRequest } from '../middleware/auth';
import { sanitizeString } from '../lib/sanitize';
import { safeJsonParse } from '../lib/helpers';
import logger from '../lib/logger';
import { logAction } from '../lib/audit';
import { FALLBACK_CATEGORY_ID, PAGINATION_DEFAULT_LIMIT, PAGINATION_MAX_LIMIT, RATE_LIMITS, RATE_WINDOW_MS } from '../lib/config';

const router = Router();

export const ALLOWED_PRODUCT_FIELDS = ['name', 'slug', 'categoryId', 'description', 'price', 'compareAtPrice', 'images', 'material', 'collection', 'carats', 'weightGrams', 'stockQuantity', 'isBestSeller', 'isNew', 'isPromo'];
export const VALID_ORDER_SORTS = ['newest', 'price_asc', 'price_desc', 'popular', 'best_seller'];

// Public: get all products (with filters + pagination)
// includeAll=true réservé admin (sinon on force inStock=true) — utilise optionalAuth existant
router.get('/api/products', optionalAuth, async (req: AuthRequest, res) => {
  try {
    const { category, search, isBestSeller, isPromo, includeAll, page = '1', limit = '50', sort = 'newest' } = req.query;
    const where: any = {};

    const wantsAll = includeAll === 'true';
    const isAdmin = (req as AuthRequest).userRole === 'ADMIN';
    if (!wantsAll || !isAdmin) {
      where.inStock = true;
    }

    if (category && search) {
      where.AND = [
        { OR: [{ categoryId: category as string }, { category: { slug: category as string } }] },
        { OR: [{ name: { contains: search as string, mode: 'insensitive' } }, { description: { contains: search as string, mode: 'insensitive' } }] },
      ];
    } else if (category) {
      where.OR = [
        { categoryId: category as string },
        { category: { slug: category as string } },
      ];
    } else if (search) {
      where.OR = [
        { name: { contains: search as string, mode: 'insensitive' } },
        { description: { contains: search as string, mode: 'insensitive' } },
      ];
    }

    if (isBestSeller === 'true') where.isBestSeller = true;
    if (isPromo === 'true') where.isPromo = true;

    const pageNum = Math.max(1, parseInt(page as string));
    const limitNum = Math.min(PAGINATION_MAX_LIMIT, Math.max(1, parseInt(limit as string)));
    const skip = (pageNum - 1) * limitNum;

    const orderBy: any = (() => {
      switch (sort) {
        case 'price_asc': return { price: 'asc' as const };
        case 'price_desc': return { price: 'desc' as const };
        case 'popular': return { createdAt: 'desc' as const };
        case 'best_seller': return [{ isBestSeller: 'desc' as const }, { createdAt: 'desc' as const }];
        default: return { createdAt: 'desc' as const };
      }
    })();

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        include: { category: true },
        orderBy,
        skip,
        take: limitNum,
      }),
      prisma.product.count({ where }),
    ]);

    const parsed = products.map((p) => ({
      ...p,
      images: safeJsonParse(p.images as unknown as string, []),
    }));

    res.json({
      data: parsed,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    logger.error({ err: error }, 'Products error');
    res.status(500).json({ error: 'Erreur lors du chargement des produits' });
  }
});

// Public: get product by id or slug
router.get('/api/products/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const product = await prisma.product.findFirst({
      where: { OR: [{ id }, { slug: id }] },
      include: { category: true },
    });

    if (!product) return res.status(404).json({ error: 'Produit non trouvé' });

    res.json({ ...product, images: safeJsonParse(product.images as unknown as string, []) });
  } catch {
    res.status(500).json({ error: 'Erreur' });
  }
});

// Admin: create product (rate limited)
router.post('/api/products', authenticateToken, requireAdmin, rateLimit(RATE_LIMITS.productsCreate, RATE_WINDOW_MS), async (req: AuthRequest, res) => {
  try {
    const data = req.body;
    if (!data.name || !data.price) {
      return res.status(400).json({ error: 'Nom et prix requis' });
    }

    const price = Number(data.price);
    if (isNaN(price) || price < 0) {
      return res.status(400).json({ error: 'Prix invalide' });
    }
    const stockQuantity = Number(data.stockQuantity) || 0;
    if (stockQuantity < 0) {
      return res.status(400).json({ error: 'Quantité en stock invalide' });
    }

    const filtered: any = {};
    for (const key of ALLOWED_PRODUCT_FIELDS) {
      if (data[key] !== undefined) filtered[key] = data[key];
    }

    // Sanitize string fields
    if (filtered.name) filtered.name = sanitizeString(filtered.name);
    if (filtered.description) filtered.description = sanitizeString(filtered.description);
    if (filtered.material) filtered.material = sanitizeString(filtered.material);
    if (filtered.collection) filtered.collection = sanitizeString(filtered.collection);

    // Normalise images pour le champ Prisma Json (tableau, pas chaîne doublement encodée)
    const rawImages = filtered.images ?? [];
    const imagesArray = Array.isArray(rawImages) ? rawImages : safeJsonParse(rawImages as unknown as string, []);

    const product = await prisma.product.create({
      data: {
        name: filtered.name,
        slug: filtered.slug || filtered.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        categoryId: filtered.categoryId || FALLBACK_CATEGORY_ID,
        description: filtered.description || '',
        price,
        compareAtPrice: filtered.compareAtPrice ? Number(filtered.compareAtPrice) : null,
        images: imagesArray as any,
        material: filtered.material || null,
        collection: filtered.collection || null,
        carats: filtered.carats ? String(filtered.carats) : null,
        weightGrams: filtered.weightGrams ? Number(filtered.weightGrams) : null,
        stockQuantity,
        isBestSeller: Boolean(filtered.isBestSeller),
        isNew: Boolean(filtered.isNew),
        isPromo: Boolean(filtered.isPromo),
      },
    });

    await logAction({
      userId: req.userId!,
      action: 'PRODUCT_CREATE',
      entity: 'Product',
      entityId: product.id,
      details: { name: product.name, price },
      ipAddress: req.ip,
    });

    res.status(201).json({ ...product, images: safeJsonParse(product.images as unknown as string, []) });
  } catch (error) {
    logger.error({ err: error }, 'Create product error');
    res.status(500).json({ error: 'Erreur lors de la création du produit' });
  }
});

// Admin: update product (rate limited)
router.put('/api/products/:id', authenticateToken, requireAdmin, rateLimit(RATE_LIMITS.productsUpdate, RATE_WINDOW_MS), async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const data = req.body;

    const updateData: any = {};
    for (const key of ALLOWED_PRODUCT_FIELDS) {
      if (data[key] !== undefined) {
        updateData[key] = data[key];
      }
    }
    // Sanitize string fields
    if (updateData.name) updateData.name = sanitizeString(updateData.name);
    if (updateData.description) updateData.description = sanitizeString(updateData.description);
    if (updateData.material) updateData.material = sanitizeString(updateData.material);
    if (updateData.collection) updateData.collection = sanitizeString(updateData.collection);
    if (data.images !== undefined) {
      updateData.images = Array.isArray(data.images) ? data.images : safeJsonParse(data.images as unknown as string, []);
    }
    if (updateData.price !== undefined) {
      const p = Number(updateData.price);
      if (isNaN(p) || p < 0) return res.status(400).json({ error: 'Prix invalide' });
    }
    if (updateData.stockQuantity !== undefined) {
      const s = Number(updateData.stockQuantity);
      if (isNaN(s) || s < 0) return res.status(400).json({ error: 'Quantité en stock invalide' });
      updateData.inStock = s > 0;
    }

    const product = await prisma.product.update({ where: { id }, data: updateData });

    await logAction({
      userId: req.userId!,
      action: 'PRODUCT_UPDATE',
      entity: 'Product',
      entityId: id,
      details: { name: product.name, changes: Object.keys(updateData) },
      ipAddress: req.ip,
    });

    res.json({ ...product, images: safeJsonParse(product.images as unknown as string, []) });
  } catch {
    res.status(500).json({ error: 'Erreur lors de la mise à jour' });
  }
});

// Admin: delete product
router.delete('/api/products/:id', authenticateToken, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    await prisma.$transaction(async (tx) => {
      await tx.cartItem.deleteMany({ where: { productId: id } });
      await tx.favorite.deleteMany({ where: { productId: id } });
      await tx.like.deleteMany({ where: { productId: id } });
      await tx.product.update({ where: { id }, data: { inStock: false, stockQuantity: 0 } });
    });

    await logAction({
      userId: req.userId!,
      action: 'PRODUCT_DELETE',
      entity: 'Product',
      entityId: id,
      ipAddress: req.ip,
    });

    res.json({ success: true });
  } catch {
    res.status(500).json({ error: 'Erreur lors de la suppression' });
  }
});

export default router;
