import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { authenticateToken, requireAdmin, rateLimit, AuthRequest } from '../middleware/auth';
import { safeJsonParse, calculateCartTotal } from '../lib/helpers';
import { sanitizeString } from '../lib/sanitize';
import logger from '../lib/logger';
import { notifyNewOrder, notifyOrderStatusChange } from '../lib/notifications';

const router = Router();

const VALID_STATUSES = ['CONFIRMED', 'PREPARING', 'SHIPPED', 'DELIVERED', 'CANCELLED'];

// Allowed status transitions (state machine)
const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  CONFIRMED: ['PREPARING', 'CANCELLED'],
  PREPARING: ['SHIPPED', 'CANCELLED'],
  SHIPPED: ['DELIVERED', 'CANCELLED'],
  DELIVERED: [],         // terminal state
  CANCELLED: [],         // terminal state
};

function canTransition(from: string, to: string): boolean {
  return ALLOWED_TRANSITIONS[from]?.includes(to) ?? false;
}

// Get user's own orders
router.get('/api/orders', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const orders = await prisma.order.findMany({
      where: { userId: req.userId! },
      include: { items: true },
      orderBy: { createdAt: 'desc' },
    });

    const parsed = orders.map((o) => ({
      ...o,
      shippingAddress: safeJsonParse(o.shippingAddress as string, null),
      statusHistory: safeJsonParse(o.statusHistory as string, []),
    }));

    res.json(parsed);
  } catch {
    res.status(500).json({ error: 'Erreur lors du chargement des commandes' });
  }
});

// Admin: get all orders
router.get('/api/orders/all', authenticateToken, requireAdmin, async (_req: AuthRequest, res) => {
  try {
    const orders = await prisma.order.findMany({
      include: { items: true, user: { select: { name: true, identifier: true, phone: true } } },
      orderBy: { createdAt: 'desc' },
    });

    const parsed = orders.map((o) => ({
      ...o,
      shippingAddress: safeJsonParse(o.shippingAddress as string, null),
      statusHistory: safeJsonParse(o.statusHistory as string, []),
    }));

    res.json(parsed);
  } catch {
    res.status(500).json({ error: 'Erreur' });
  }
});

// Get single order (admin can view any, user only their own)
router.get('/api/orders/:id', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const isAdmin = req.userRole === 'ADMIN';

    const order = await prisma.order.findFirst({
      where: isAdmin
        ? { id: req.params.id }
        : { id: req.params.id, userId: req.userId! },
      include: { items: true },
    });

    if (!order) return res.status(404).json({ error: 'Commande non trouvee' });

    res.json({
      ...order,
      shippingAddress: safeJsonParse(order.shippingAddress as string, null),
      statusHistory: safeJsonParse(order.statusHistory as string, []),
    });
  } catch {
    res.status(500).json({ error: 'Erreur' });
  }
});

// Create order (rate limited: 10 per minute)
// Body peut contenir `cartItemIds?: string[]` pour commander 1 ou N articles selectionnes
router.post('/api/orders', authenticateToken, rateLimit(10, 60_000), async (req: AuthRequest, res) => {
  try {
    const { shippingAddress, cartItemIds } = req.body;

    // Sanitize shipping address fields
    const sanitizedAddress = shippingAddress ? {
      fullName: sanitizeString(shippingAddress.fullName),
      phone: sanitizeString(shippingAddress.phone),
      address: sanitizeString(shippingAddress.address),
      city: sanitizeString(shippingAddress.city),
      notes: sanitizeString(shippingAddress.notes),
    } : {};

    const cart = await prisma.cart.findUnique({
      where: { userId: req.userId! },
      include: { items: { include: { product: true } } },
    });

    if (!cart || cart.items.length === 0) {
      return res.status(400).json({ error: 'Panier vide' });
    }

    // Filtrage 1 ou N articles si le client a selectionne un sous-ensemble
    let itemsToOrder = cart.items;
    if (Array.isArray(cartItemIds) && cartItemIds.length > 0) {
      const idSet = new Set(cartItemIds as string[]);
      itemsToOrder = cart.items.filter((i) => idSet.has(i.id));
      if (itemsToOrder.length === 0) {
        return res.status(400).json({ error: 'Aucun article selectionne trouve dans le panier' });
      }
      if (itemsToOrder.length !== cartItemIds.length) {
        return res.status(400).json({ error: 'Certains articles selectionnes sont introuvables' });
      }
    }

    // Total recalcule serveur sur le sous-ensemble
    const { total } = await calculateCartTotal(
      cart,
      itemsToOrder
    );

    const orderNumber = `ORD-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
    const user = await prisma.user.findUnique({ where: { id: req.userId! } });

    const order = await prisma.$transaction(async (tx) => {
      // Atomic stock check + decrement (prevents overselling)
      for (const item of itemsToOrder) {
        const result = await tx.$executeRaw`
          UPDATE "Product" SET "stockQuantity" = "stockQuantity" - ${item.quantity}
          WHERE "id" = ${item.productId} AND "stockQuantity" >= ${item.quantity}
        `;
        if (result === 0) {
          const product = await tx.product.findUnique({
            where: { id: item.productId },
            select: { name: true, stockQuantity: true },
          });
          throw new Error(`"${product?.name || 'Produit'}" n'a que ${product?.stockQuantity || 0} en stock`);
        }
      }

      const order = await tx.order.create({
        data: {
          orderNumber,
          userId: req.userId!,
          customerName: sanitizedAddress.fullName || user?.name || '',
          phone: sanitizedAddress.phone || user?.phone || '',
          address: sanitizedAddress.address || '',
          totalAmount: total,
          shippingAddress: JSON.stringify(sanitizedAddress || {}),
          statusHistory: JSON.stringify([
            { status: 'CONFIRMED', label: 'Commande confirmee', date: new Date().toISOString(), completed: true },
          ]),
          items: {
            create: itemsToOrder.map((item) => ({
              productId: item.productId,
              productName: item.product.name,
              productImage: safeJsonParse(item.product.images, [])[0] || '',
              price: item.product.price,
              quantity: item.quantity,
              selectedSize: item.selectedSize,
              selectedMaterial: item.selectedMaterial,
            })),
          },
        },
        include: { items: true },
      });

      // Update inStock flags after atomic decrement
      for (const item of itemsToOrder) {
        const updated = await tx.product.findUnique({
          where: { id: item.productId },
          select: { stockQuantity: true },
        });
        if (updated) {
          await tx.product.update({
            where: { id: item.productId },
            data: { inStock: updated.stockQuantity > 0 },
          });
        }
      }

      // Ne supprime que les articles commandés — le reste reste dans le panier
      const orderedIds = itemsToOrder.map((i) => i.id);
      await tx.cartItem.deleteMany({ where: { cartId: cart.id, id: { in: orderedIds } } });

      return order;
    });

    // Notify customer + gerants (async, non-blocking)
    notifyNewOrder(order.id).catch((err) =>
      logger.error({ err, orderId: order.id }, 'Failed to send new order notifications')
    );

    res.status(201).json(order);
  } catch (error: any) {
    if (error.message && error.message.includes('en stock')) {
      return res.status(400).json({ error: error.message });
    }
    logger.error({ err: error }, 'Create order error');
    res.status(500).json({ error: 'Erreur lors de la commande' });
  }
});

// Admin: update order status (+ append to statusHistory)
router.put('/api/orders/:id/status', authenticateToken, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const { status } = req.body;
    if (!VALID_STATUSES.includes(status)) {
      return res.status(400).json({ error: 'Statut invalide' });
    }

    const existingOrder = await prisma.order.findUnique({ where: { id: req.params.id } });
    if (!existingOrder) return res.status(404).json({ error: 'Commande non trouvee' });

    // State machine: validate transition
    if (!canTransition(existingOrder.status, status)) {
      return res.status(400).json({
        error: `Transition invalide: ${existingOrder.status} -> ${status}`,
      });
    }

    const currentHistory = safeJsonParse(existingOrder.statusHistory as string, []);

    const statusLabels: Record<string, string> = {
      CONFIRMED: 'Commande confirmee',
      PREPARING: 'En cours de fabrication',
      SHIPPED: 'Expediee',
      DELIVERED: 'Livree',
      CANCELLED: 'Annulee',
    };

    const newEntry = {
      status,
      label: statusLabels[status] || status,
      date: new Date().toISOString(),
      completed: true,
    };

    const order = await prisma.order.update({
      where: { id: req.params.id },
      data: {
        status,
        statusHistory: JSON.stringify([...currentHistory, newEntry]),
      },
      include: { items: true },
    });

    // Restore stock on cancellation (atomic)
    if (status === 'CANCELLED') {
      await prisma.$transaction(async (tx) => {
        for (const item of order.items) {
          await tx.product.update({
            where: { id: item.productId },
            data: { stockQuantity: { increment: item.quantity }, inStock: true },
          });
        }
      });
      logger.info({ orderId: order.id }, 'Stock restored after cancellation');
    }

    // Notify customer for all status changes
    await notifyOrderStatusChange(order.id, status as any);

    res.json({
      ...order,
      statusHistory: safeJsonParse(order.statusHistory as string, []),
    });
  } catch {
    res.status(500).json({ error: 'Erreur lors de la mise a jour' });
  }
});

export default router;