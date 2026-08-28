import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { calculateCartTotal, formatCartItems } from '../lib/helpers';
import logger from '../lib/logger';

const router = Router();

// Get cart
router.get('/api/cart', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const cart = await prisma.cart.findUnique({
      where: { userId: req.userId! },
      include: { items: { include: { product: true } } },
    });

    if (!cart) {
      const newCart = await prisma.cart.create({
        data: { userId: req.userId! },
        include: { items: { include: { product: true } } },
      });
      const totals = await calculateCartTotal(newCart, newCart.items);
      return res.json({ ...newCart, ...totals, items: formatCartItems(newCart.items) });
    }

    const totals = await calculateCartTotal(cart, cart.items);
    res.json({ ...cart, ...totals, items: formatCartItems(cart.items) });
  } catch (error) {
    logger.error({ err: error }, 'Cart error');
    res.status(500).json({ error: 'Erreur lors du chargement du panier' });
  }
});

// Update cart item quantity (with stock validation)
router.put('/api/cart/items/:id', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { quantity } = req.body;
    if (!quantity || quantity < 1) {
      return res.status(400).json({ error: 'Quantité invalide' });
    }

    const item = await prisma.cartItem.findUnique({ where: { id: req.params.id } });
    if (!item) return res.status(404).json({ error: 'Article non trouvé' });

    const cart = await prisma.cart.findUnique({ where: { userId: req.userId! } });
    if (!cart || item.cartId !== cart.id) {
      return res.status(403).json({ error: 'Accès refusé' });
    }

    // Stock validation
    const product = await prisma.product.findUnique({
      where: { id: item.productId },
      select: { stockQuantity: true, name: true },
    });
    if (product && product.stockQuantity < quantity) {
      return res.status(400).json({
        error: `"${product.name}" n'a que ${product.stockQuantity} en stock`,
      });
    }

    await prisma.cartItem.update({ where: { id: req.params.id }, data: { quantity: Number(quantity) } });

    const updatedCart = await prisma.cart.findUnique({
      where: { userId: req.userId! },
      include: { items: { include: { product: true } } },
    });

    if (!updatedCart) return res.status(500).json({ error: 'Erreur' });

    const totals = await calculateCartTotal(updatedCart, updatedCart.items);
    res.json({ ...updatedCart, ...totals, items: formatCartItems(updatedCart.items) });
  } catch (error) {
    logger.error({ err: error }, 'Update cart quantity error');
    res.status(500).json({ error: 'Erreur' });
  }
});

// Add to cart (with stock check + material-aware dedup)
router.post('/api/cart/items', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { productId, quantity = 1, selectedSize, selectedMaterial } = req.body;

    if (!productId || typeof quantity !== 'number' || quantity < 1) {
      return res.status(400).json({ error: 'Produit et quantité valide requis' });
    }

    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product) return res.status(404).json({ error: 'Produit non trouvé' });

    if (!product.inStock || product.stockQuantity < quantity) {
      return res.status(400).json({ error: `"${product.name}" n'a que ${product.stockQuantity} en stock` });
    }

    let cart = await prisma.cart.findUnique({ where: { userId: req.userId! } });
    if (!cart) {
      cart = await prisma.cart.create({ data: { userId: req.userId! } });
    }

    // Dedup by productId + size + material
    const existingItem = await prisma.cartItem.findFirst({
      where: {
        cartId: cart.id,
        productId,
        selectedSize: selectedSize || null,
        selectedMaterial: selectedMaterial || null,
      },
    });

    if (existingItem) {
      const newQty = existingItem.quantity + quantity;
      if (product.stockQuantity < newQty) {
        return res.status(400).json({ error: `"${product.name}" n'a que ${product.stockQuantity} en stock` });
      }
      await prisma.cartItem.update({
        where: { id: existingItem.id },
        data: { quantity: newQty },
      });
    } else {
      await prisma.cartItem.create({
        data: {
          cartId: cart.id,
          productId,
          quantity,
          selectedSize: selectedSize || null,
          selectedMaterial: selectedMaterial || null,
        },
      });
    }

    const updatedCart = await prisma.cart.findUnique({
      where: { userId: req.userId! },
      include: { items: { include: { product: true } } },
    });

    if (!updatedCart) return res.status(500).json({ error: 'Erreur' });

    const totals = await calculateCartTotal(updatedCart, updatedCart.items);
    res.json({ ...updatedCart, ...totals, items: formatCartItems(updatedCart.items) });
  } catch (error) {
    logger.error({ err: error }, 'Add to cart error');
    res.status(500).json({ error: 'Erreur lors de l\'ajout au panier' });
  }
});

// Remove from cart
router.delete('/api/cart/items/:id', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const item = await prisma.cartItem.findUnique({ where: { id: req.params.id } });
    if (!item) return res.status(404).json({ error: 'Article non trouvé' });

    const cart = await prisma.cart.findUnique({ where: { userId: req.userId! } });
    if (!cart || item.cartId !== cart.id) {
      return res.status(403).json({ error: 'Accès refusé' });
    }

    await prisma.cartItem.delete({ where: { id: req.params.id } });

    const updatedCart = await prisma.cart.findUnique({
      where: { userId: req.userId! },
      include: { items: { include: { product: true } } },
    });

    if (!updatedCart) return res.status(500).json({ error: 'Erreur' });

    const totals = await calculateCartTotal(updatedCart, updatedCart.items);
    res.json({ ...updatedCart, ...totals, items: formatCartItems(updatedCart.items) });
  } catch {
    res.status(500).json({ error: 'Erreur lors de la suppression' });
  }
});

// Clear entire cart
router.delete('/api/cart', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const cart = await prisma.cart.findUnique({ where: { userId: req.userId! } });
    if (cart) {
      await prisma.cartItem.deleteMany({ where: { cartId: cart.id } });
      await prisma.cart.update({ where: { id: cart.id }, data: { couponCode: null } });
    }
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: 'Erreur' });
  }
});

// Apply coupon
router.post('/api/cart/coupon', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { code } = req.body;
    if (!code) return res.status(400).json({ error: 'Code requis' });

    const coupon = await prisma.coupon.findFirst({
      where: { code, isActive: true, expiryDate: { gte: new Date() } },
    });

    if (!coupon) {
      return res.status(400).json({ error: 'Code promo invalide ou expiré' });
    }

    await prisma.cart.update({
      where: { userId: req.userId! },
      data: { couponCode: coupon.code },
    });

    const cart = await prisma.cart.findUnique({
      where: { userId: req.userId! },
      include: { items: { include: { product: true } } },
    });

    if (!cart) return res.status(500).json({ error: 'Erreur' });

    const totals = await calculateCartTotal(cart, cart.items);
    res.json({
      success: true,
      cart: { ...cart, ...totals, items: formatCartItems(cart.items) },
      coupon: { code: coupon.code, discountPercent: coupon.discountPercent, description: coupon.description },
    });
  } catch {
    res.status(500).json({ error: 'Erreur' });
  }
});

// Remove coupon from cart
router.delete('/api/cart/coupon', authenticateToken, async (req: AuthRequest, res) => {
  try {
    await prisma.cart.update({
      where: { userId: req.userId! },
      data: { couponCode: null },
    });

    const cart = await prisma.cart.findUnique({
      where: { userId: req.userId! },
      include: { items: { include: { product: true } } },
    });

    if (!cart) return res.status(500).json({ error: 'Erreur' });

    const totals = await calculateCartTotal(cart, cart.items);
    res.json({ success: true, cart: { ...cart, ...totals, items: formatCartItems(cart.items) } });
  } catch {
    res.status(500).json({ error: 'Erreur' });
  }
});

export default router;
