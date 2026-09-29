import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { authenticateToken, requireAdmin, rateLimit, AuthRequest } from '../middleware/auth';
import { safeJsonParse, calculateCartTotal } from '../lib/helpers';
import { sanitizeString } from '../lib/sanitize';
import logger from '../lib/logger';
import { notifyNewOrder, notifyOrderStatusChange } from '../lib/notifications';
import { logAction } from '../lib/audit';
import { getRedis } from '../lib/rateLimit';
import { IDEMPOTENCY_PENDING_TTL_S, IDEMPOTENCY_TTL_S, PAGINATION_DEFAULT_LIMIT, PAGINATION_MAX_LIMIT, RATE_LIMITS, RATE_WINDOW_MS } from '../lib/config';

const router = Router();

export const VALID_STATUSES = ['CONFIRMED', 'PREPARING', 'SHIPPED', 'DELIVERED', 'CANCELLED'];

// Allowed status transitions (state machine)
export const ALLOWED_TRANSITIONS: Record<string, string[]> = {
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
router.get('/api/orders/all', authenticateToken, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(PAGINATION_MAX_LIMIT, Math.max(1, parseInt(req.query.limit as string) || PAGINATION_DEFAULT_LIMIT));
    const skip = (page - 1) * limit;

    const [orders, total] = await Promise.all([
    prisma.order.findMany({
      include: { items: true, user: { select: { name: true, identifier: true, phone: true } } },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.order.count({ where: {} }),
  ]);

    const parsed = orders.map((o) => ({
      ...o,
      shippingAddress: safeJsonParse(o.shippingAddress as string, null),
      statusHistory: safeJsonParse(o.statusHistory as string, []),
    }));

    res.json({ data: parsed, total, page, totalPages: Math.ceil(total / limit) });
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

// Idempotence POST /orders : clé fournie par le client (header Idempotency-Key
// ou champ body idempotencyKey), stockée dans Redis avec l'orderId (fail-open :
// sans Redis, la commande passe normalement). Évite les doublons double-clic/retry.
const IDEM_KEY_RE = /^[A-Za-z0-9-]{8,64}$/;

function parseOrder(order: any) {
  return {
    ...order,
    shippingAddress: safeJsonParse(order.shippingAddress as string, null),
    statusHistory: safeJsonParse(order.statusHistory as string, []),
  };
}

async function findIdempotentOrder(redis: any, key: string, userId: string) {
  const existing = await redis.get(key);
  if (!existing || existing === 'pending') return existing;
  const order = await prisma.order.findFirst({
    where: { id: existing, userId },
    include: { items: true },
  });
  return order ? parseOrder(order) : null;
}

// Create order (rate limited per user + idempotent)
// Body peut contenir `cartItemIds?: string[]` pour commander 1 ou N articles selectionnes
// et `idempotencyKey?: string` (ou header Idempotency-Key) stable par tentative de commande.
router.post('/api/orders', authenticateToken, rateLimit(RATE_LIMITS.orders, RATE_WINDOW_MS, { keyBy: 'user' }), async (req: AuthRequest, res) => {
  try {
    const { shippingAddress, cartItemIds } = req.body;
    const rawKey = (req.headers['idempotency-key'] as string) || (req.body as any).idempotencyKey;
    const idemKey = typeof rawKey === 'string' && IDEM_KEY_RE.test(rawKey) ? rawKey : null;
    const redisKey = idemKey ? `idem:${req.userId!}:${idemKey}` : null;
    const redis = redisKey ? getRedis() : null;

    // Rejeu d'une tentative déjà aboutie → retourne la commande existante (200, pas de doublon)
    if (redis && redisKey) {
      try {
        const replay = await findIdempotentOrder(redis, redisKey, req.userId!);
        if (replay === 'pending') {
          return res.status(409).json({ error: 'Commande déjà en cours de traitement' });
        }
        if (replay) return res.json(replay);
        const claimed = await redis.set(redisKey, 'pending', { ex: IDEMPOTENCY_PENDING_TTL_S, nx: true });
        if (!claimed) {
          const raced = await findIdempotentOrder(redis, redisKey, req.userId!);
          if (raced === 'pending') {
            return res.status(409).json({ error: 'Commande déjà en cours de traitement' });
          }
          if (raced) return res.json(raced);
        }
      } catch {
        // Redis indisponible → on continue sans idempotence (fail-open)
      }
    }

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

    // Total recalcule serveur sur le sous-ensemble (inclut coupon Cart.couponCode si présent)
    const { total } = await calculateCartTotal(
      cart,
      itemsToOrder
    );

    const user = await prisma.user.findUnique({ where: { id: req.userId! } });

    const generateOrderNumber = () => `ORD-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

    const createOrderTx = (orderNumber: string) => prisma.$transaction(async (tx) => {
      // Atomic stock check + decrement (prevents overselling)
      for (const item of itemsToOrder) {
        const result = await tx.product.updateMany({
          where: {
            id: item.productId,
            stockQuantity: { gte: item.quantity },
          },
          data: {
            stockQuantity: { decrement: item.quantity },
          },
        });
        if (result.count === 0) {
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
            create: itemsToOrder.map((item) => {
              const imgs = (item.product as any).images;
              const firstImg = Array.isArray(imgs) ? (imgs[0] || '') : (safeJsonParse(imgs as unknown as string, [])[0] || '');
              return {
                productId: item.productId,
                productName: item.product.name,
                productImage: firstImg,
                price: item.product.price,
                quantity: item.quantity,
                selectedSize: item.selectedSize,
                selectedMaterial: item.selectedMaterial,
              };
            }),
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

    // Retry une fois en cas de collision orderNumber (contrainte unique)
    let order;
    try {
      order = await createOrderTx(generateOrderNumber());
    } catch (e: any) {
      if (e?.code === 'P2002' && e?.meta?.target?.includes('orderNumber')) {
        order = await createOrderTx(generateOrderNumber());
      } else {
        throw e;
      }
    }

    // Mémorise la tentative (une même clé rejoue la même commande, jamais de doublon)
    if (redis && redisKey) {
      try {
        await redis.set(redisKey, order.id, { ex: IDEMPOTENCY_TTL_S });
      } catch {}
    }

    // Notify customer + gerants (async, non-blocking)
    notifyNewOrder(order.id).catch((err) =>
      logger.error({ err, orderId: order.id }, 'Failed to send new order notifications')
    );

    res.status(201).json(order);
  } catch (error: any) {
    // Échec : libère la clé pour autoriser une nouvelle tentative avec la même clé
    if (redisKey) {
      try {
        const r = getRedis();
        if (r) await r.del(redisKey);
      } catch {}
    }
    if (error.message && error.message.includes('en stock')) {
      return res.status(400).json({ error: error.message });
    }
    logger.error({ err: error, message: error?.message, stack: error?.stack }, 'Create order error');
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
      CONFIRMED: 'Confirmée',
      PREPARING: 'En atelier',
      SHIPPED: 'Expédiée',
      DELIVERED: 'Livrée',
      CANCELLED: 'Annulée',
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
    notifyOrderStatusChange(order.id, status as any).catch((err) =>
      logger.error({ err, orderId: order.id }, 'Failed to send status change notifications')
    );

    await logAction({
      userId: req.userId!,
      action: 'ORDER_STATUS_UPDATE',
      entity: 'Order',
      entityId: order.id,
      details: { orderNumber: order.orderNumber, oldStatus: existingOrder.status, newStatus: status },
      ipAddress: req.ip,
    });

    res.json({
      ...order,
      statusHistory: safeJsonParse(order.statusHistory as string, []),
    });
  } catch {
    res.status(500).json({ error: 'Erreur lors de la mise a jour' });
  }
});

export default router;