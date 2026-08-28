import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { authenticateToken, requireAdmin, AuthRequest, optionalAuth } from '../middleware/auth';
import { safeJsonParse, calculateCartTotal } from '../lib/helpers';
import logger from '../lib/logger';
import { initiatePayment, verifyPayment } from '../lib/payments';
import { notifyOrderStatusChange, notifyPaymentInitiated } from '../lib/notifications';

const router = Router();

const VALID_STATUSES = ['CONFIRMED', 'PREPARING', 'SHIPPED', 'DELIVERED', 'CANCELLED'];
const VALID_PAYMENT_STATUSES = ['PENDING', 'PAID', 'FAILED', 'REFUNDED'];

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
      include: { items: true, user: { select: { name: true, email: true, phone: true } } },
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

    if (!order) return res.status(404).json({ error: 'Commande non trouvée' });

    res.json({
      ...order,
      shippingAddress: safeJsonParse(order.shippingAddress as string, null),
      statusHistory: safeJsonParse(order.statusHistory as string, []),
    });
  } catch {
    res.status(500).json({ error: 'Erreur' });
  }
});

// Create order + initiate payment
router.post('/api/orders', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { shippingAddress, paymentMethod } = req.body;

    const cart = await prisma.cart.findUnique({
      where: { userId: req.userId! },
      include: { items: { include: { product: true } } },
    });

    if (!cart || cart.items.length === 0) {
      return res.status(400).json({ error: 'Panier vide' });
    }

    const { subtotal, discount, shippingFee, total } = await calculateCartTotal(cart, cart.items);

    const orderNumber = `ORD-${Date.now().toString(36).toUpperCase()}`;
    const user = await prisma.user.findUnique({ where: { id: req.userId! } });

    const order = await prisma.$transaction(async (tx) => {
      // Lock stock rows with FOR UPDATE to prevent race conditions
      for (const item of cart.items) {
        const rows = await tx.$queryRaw<{ stockQuantity: number; name: string }[]>`
          SELECT stockQuantity, name FROM Product WHERE id = ${item.productId} FOR UPDATE
        `;
        const product = rows[0];
        if (!product || product.stockQuantity < item.quantity) {
          throw new Error(`"${product?.name || 'Produit'}" n'a que ${product?.stockQuantity || 0} en stock`);
        }
      }

      const order = await tx.order.create({
        data: {
          orderNumber,
          userId: req.userId!,
          customerName: shippingAddress?.fullName || user?.name || '',
          customerEmail: user?.email || '',
          phone: shippingAddress?.phone || user?.phone || '',
          address: shippingAddress?.address || '',
          totalAmount: total,
          paymentMethod: paymentMethod || 'WAVE',
          paymentStatus: 'PENDING',
          shippingAddress: JSON.stringify(shippingAddress || {}),
          statusHistory: JSON.stringify([
            { status: 'CONFIRMED', label: 'Commande confirmée', date: new Date().toISOString(), completed: true },
          ]),
          items: {
            create: cart.items.map((item) => ({
              productId: item.productId,
              productName: item.product.name,
              productImage: safeJsonParse(item.product.images, [])[0] || '',
              price: item.product.price,
              quantity: item.quantity,
              selectedSize: item.selectedSize,
            })),
          },
        },
        include: { items: true },
      });

      for (const item of cart.items) {
        await tx.$queryRaw`
          UPDATE Product SET stockQuantity = stockQuantity - ${item.quantity} WHERE id = ${item.productId}
        `;
        const product = await tx.product.findUnique({
          where: { id: item.productId },
          select: { stockQuantity: true },
        });
        const stock = product?.stockQuantity ?? 0;
        await tx.product.update({
          where: { id: item.productId },
          data: { inStock: stock > 0 },
        });
      }

      await tx.cartItem.deleteMany({ where: { cartId: cart.id } });
      await tx.cart.update({ where: { id: cart.id }, data: { couponCode: null } });

      return order;
    });

    // Initiate payment
    const baseUrl = process.env.APP_URL || 'http://localhost:5173';
    const paymentResult = await initiatePayment(paymentMethod as 'WAVE' | 'ORANGE_MONEY', {
      amount: total,
      currency: 'XOF',
      orderId: order.id,
      orderNumber: order.orderNumber,
      customerPhone: shippingAddress?.phone || user?.phone || '',
      customerName: shippingAddress?.fullName || user?.name || '',
      callbackUrl: `${process.env.API_URL || 'http://localhost:3000'}/api/orders/webhook/${paymentMethod}`,
      returnUrl: `${baseUrl}/?payment=success&orderId=${order.id}`,
      description: `Commande ${orderNumber} - SaTouba Bijouterie`,
    });

    if (!paymentResult.success) {
      // Payment initiation failed - update order status
      await prisma.order.update({
        where: { id: order.id },
        data: { paymentStatus: 'FAILED' },
      });
      return res.status(400).json({ error: paymentResult.error || 'Erreur initiation paiement' });
    }

    // Update order with payment reference and URL
    const updatedOrder = await prisma.order.update({
      where: { id: order.id },
      data: {
        paymentRef: paymentResult.paymentRef,
        paymentUrl: paymentResult.paymentUrl,
      },
      include: { items: true },
    });

    // Notify user that payment is initiated
    await notifyPaymentInitiated(req.userId!, order.orderNumber, paymentResult.paymentUrl!);

    res.status(201).json({
      ...updatedOrder,
      paymentUrl: paymentResult.paymentUrl,
    });
  } catch (error: any) {
    if (error.message && error.message.includes('en stock')) {
      return res.status(400).json({ error: error.message });
    }
    logger.error({ err: error }, 'Create order error');
    res.status(500).json({ error: 'Erreur lors de la commande' });
  }
});

// Payment webhook (called by payment providers)
router.post('/api/orders/webhook/:provider', async (req, res) => {
  try {
    const provider = req.params.provider as 'WAVE' | 'ORANGE_MONEY';
    const paymentRef = req.body.paymentRef || req.body.session_id || req.body.pay_token || req.query.paymentRef;

    if (!paymentRef) {
      return res.status(400).json({ error: 'Référence paiement manquante' });
    }

    const order = await prisma.order.findFirst({
      where: { paymentRef },
    });

    if (!order) {
      return res.status(404).json({ error: 'Commande non trouvée' });
    }

    // Verify payment with provider
    const verification = await verifyPayment(provider, paymentRef);

    if (verification.success && verification.paid) {
      // Payment successful
      await prisma.order.update({
        where: { id: order.id },
        data: {
          paymentStatus: 'PAID',
          statusHistory: JSON.stringify([
            ...safeJsonParse(order.statusHistory as string, []),
            { status: 'CONFIRMED', label: 'Paiement confirmé', date: new Date().toISOString(), completed: true },
            { status: 'PREPARING', label: 'En cours de fabrication', date: new Date().toISOString(), completed: true },
          ]),
        },
      });

      // Send notification to user
      await notifyOrderStatusChange(order.id, 'PAID');
      logger.info({ orderId: order.id, orderNumber: order.orderNumber }, 'Payment confirmed via webhook');
    } else if (verification.success && !verification.paid) {
      // Payment failed or pending
      await prisma.order.update({
        where: { id: order.id },
        data: { paymentStatus: 'FAILED' },
      });
    }

    res.json({ received: true });
  } catch (error) {
    logger.error({ err: error }, 'Webhook error');
    res.status(500).json({ error: 'Erreur webhook' });
  }
});

// Frontend callback (user returns from payment page)
router.get('/api/orders/callback/:orderId', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const order = await prisma.order.findFirst({
      where: { id: req.params.orderId, userId: req.userId! },
    });

    if (!order) return res.status(404).json({ error: 'Commande non trouvée' });

    // If payment still pending, verify with provider
    if (order.paymentStatus === 'PENDING' && order.paymentRef) {
      const verification = await verifyPayment(order.paymentMethod as 'WAVE' | 'ORANGE_MONEY', order.paymentRef);

      if (verification.success && verification.paid) {
        await prisma.order.update({
          where: { id: order.id },
          data: {
            paymentStatus: 'PAID',
            statusHistory: JSON.stringify([
              ...safeJsonParse(order.statusHistory as string, []),
              { status: 'CONFIRMED', label: 'Paiement confirmé', date: new Date().toISOString(), completed: true },
              { status: 'PREPARING', label: 'En cours de fabrication', date: new Date().toISOString(), completed: true },
            ]),
          },
        });
      } else if (verification.success && !verification.paid) {
        await prisma.order.update({
          where: { id: order.id },
          data: { paymentStatus: 'FAILED' },
        });
      }
    }

    const updatedOrder = await prisma.order.findUnique({
      where: { id: order.id },
      include: { items: true },
    });

    res.json({
      ...updatedOrder!,
      shippingAddress: safeJsonParse(updatedOrder!.shippingAddress as string, null),
      statusHistory: safeJsonParse(updatedOrder!.statusHistory as string, []),
    });
  } catch {
    res.status(500).json({ error: 'Erreur' });
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
    if (!existingOrder) return res.status(404).json({ error: 'Commande non trouvée' });

    const currentHistory = safeJsonParse(existingOrder.statusHistory as string, []);

    const statusLabels: Record<string, string> = {
      CONFIRMED: 'Commande confirmée',
      PREPARING: 'En cours de fabrication',
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

    // Send notification to user for status changes
    if (['SHIPPED', 'DELIVERED', 'CANCELLED'].includes(status)) {
      await notifyOrderStatusChange(order.id, status as 'SHIPPED' | 'DELIVERED' | 'CANCELLED');
    }

    res.json({
      ...order,
      statusHistory: safeJsonParse(order.statusHistory as string, []),
    });
  } catch {
    res.status(500).json({ error: 'Erreur lors de la mise à jour' });
  }
});

// Admin: update payment status
router.put('/api/orders/:id/payment-status', authenticateToken, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const { paymentStatus } = req.body;
    if (!VALID_PAYMENT_STATUSES.includes(paymentStatus)) {
      return res.status(400).json({ error: 'Statut paiement invalide' });
    }

    const order = await prisma.order.update({
      where: { id: req.params.id },
      data: { paymentStatus },
      include: { items: true },
    });

    res.json(order);
  } catch {
    res.status(500).json({ error: 'Erreur' });
  }
});

export default router;