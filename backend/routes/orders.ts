import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { authenticateToken, requireAdmin, AuthRequest } from '../middleware/auth';
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

// Create order + initiate Wave Business payment (montant verrouillé serveur)
// Body peut contenir `cartItemIds?: string[]` pour payer 1 ou N articles sélectionnés
router.post('/api/orders', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { shippingAddress, cartItemIds } = req.body;
    // Paiement exclusif Wave Business
    const paymentMethod: 'WAVE' = 'WAVE';

    const cart = await prisma.cart.findUnique({
      where: { userId: req.userId! },
      include: { items: { include: { product: true } } },
    });

    if (!cart || cart.items.length === 0) {
      return res.status(400).json({ error: 'Panier vide' });
    }

    // Filtrage 1 ou N articles si le client a sélectionné un sous-ensemble
    let itemsToOrder = cart.items;
    if (Array.isArray(cartItemIds) && cartItemIds.length > 0) {
      const idSet = new Set(cartItemIds as string[]);
      itemsToOrder = cart.items.filter((i) => idSet.has(i.id));
      if (itemsToOrder.length === 0) {
        return res.status(400).json({ error: 'Aucun article sélectionné trouvé dans le panier' });
      }
      if (itemsToOrder.length !== cartItemIds.length) {
        return res.status(400).json({ error: 'Certains articles sélectionnés sont introuvables' });
      }
    }

    // Total recalculé serveur sur le sous-ensemble (montant non modifiable côté Wave)
    const { subtotal, discount, shippingFee, total } = await calculateCartTotal(
      cart,
      itemsToOrder
    );

    const orderNumber = `ORD-${Date.now().toString(36).toUpperCase()}`;
    const user = await prisma.user.findUnique({ where: { id: req.userId! } });

    const order = await prisma.$transaction(async (tx) => {
      // Lock stock rows with FOR UPDATE pour les articles sélectionnés uniquement
      for (const item of itemsToOrder) {
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
          paymentMethod,
          paymentStatus: 'PENDING',
          shippingAddress: JSON.stringify(shippingAddress || {}),
          statusHistory: JSON.stringify([
            { status: 'CONFIRMED', label: 'Commande confirmée', date: new Date().toISOString(), completed: true },
          ]),
          items: {
            create: itemsToOrder.map((item) => ({
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

      for (const item of itemsToOrder) {
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

      // Ne supprime que les articles commandés — le reste reste dans le panier
      const orderedIds = itemsToOrder.map((i) => i.id);
      await tx.cartItem.deleteMany({ where: { cartId: cart.id, id: { in: orderedIds } } });
      // Si panier vidé entièrement, on retire le coupon
      const remaining = await tx.cartItem.count({ where: { cartId: cart.id } });
      if (remaining === 0) {
        await tx.cart.update({ where: { id: cart.id }, data: { couponCode: null } });
      }

      return order;
    });

    // Initiate Wave Business payment — montant verrouillé serveur
    const baseUrl = process.env.APP_URL || 'http://localhost:5173';
    const paymentResult = await initiatePayment('WAVE', {
      amount: total,
      currency: 'XOF',
      orderId: order.id,
      orderNumber: order.orderNumber,
      customerPhone: shippingAddress?.phone || user?.phone || '',
      customerName: shippingAddress?.fullName || user?.name || '',
      callbackUrl: `${process.env.API_URL || 'http://localhost:3000'}/api/orders/webhook/wave`,
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

// Webhook Wave Business (appelé par Wave après paiement)
// Compat : /api/orders/webhook/wave et /api/orders/webhook/:provider (legacy ORANGE_MONEY -> 400)
router.post('/api/orders/webhook/:provider', async (req, res) => {
  try {
    const provider = (req.params.provider as string).toUpperCase();
    if (provider !== 'WAVE') {
      return res.status(400).json({ error: 'Seul Wave Business est supporté' });
    }
    const paymentRef = req.body.paymentRef || req.body.session_id || req.body.checkout_session_id || req.body.pay_token || req.query.paymentRef;

    if (!paymentRef) {
      return res.status(400).json({ error: 'Référence paiement manquante' });
    }

    const order = await prisma.order.findFirst({
      where: { paymentRef },
    });

    if (!order) {
      return res.status(404).json({ error: 'Commande non trouvée' });
    }

    // Verify payment Wave Business (montant déjà verrouillé à la création)
    const verification = await verifyPayment('WAVE', paymentRef);

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

    // If payment still pending, verify Wave Business
    if (order.paymentStatus === 'PENDING' && order.paymentRef) {
      const verification = await verifyPayment('WAVE', order.paymentRef);

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

// Client: compléter une commande incomplète (PENDING/FAILED) — relance du paiement Wave
// Peut corriger/compléter les infos de livraison avant de payer
router.post('/api/orders/:id/pay', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const order = await prisma.order.findFirst({
      where: { id: req.params.id, userId: req.userId! },
    });
    if (!order) return res.status(404).json({ error: 'Commande non trouvée' });

    if (order.paymentStatus === 'PAID') {
      return res.status(400).json({ error: 'Cette commande est déjà payée' });
    }

    // Corriger/compléter les infos de livraison si fournies
    const { shippingAddress } = req.body || {};
    let addr = safeJsonParse(order.shippingAddress as string, {});
    if (shippingAddress && typeof shippingAddress === 'object') {
      addr = {
        fullName: shippingAddress.fullName || order.customerName || '',
        phone: shippingAddress.phone || order.phone || '',
        address: shippingAddress.address || order.address || '',
        city: shippingAddress.city || 'Abidjan',
        notes: shippingAddress.notes || '',
      };
      await prisma.order.update({
        where: { id: order.id },
        data: {
          customerName: addr.fullName,
          phone: addr.phone,
          address: addr.address,
          shippingAddress: JSON.stringify(addr),
        },
      });
    }

    // Re-initier le paiement Wave — montant verrouillé serveur (totalAmount inchangé)
    const baseUrl = process.env.APP_URL || 'http://localhost:5173';
    const paymentResult = await initiatePayment('WAVE', {
      amount: order.totalAmount,
      currency: 'XOF',
      orderId: order.id,
      orderNumber: order.orderNumber,
      customerPhone: addr.phone || '',
      customerName: addr.fullName || '',
      callbackUrl: `${process.env.API_URL || 'http://localhost:3000'}/api/orders/webhook/wave`,
      returnUrl: `${baseUrl}/?payment=success&orderId=${order.id}`,
      description: `Commande ${order.orderNumber} - SaTouba Bijouterie`,
    });

    if (!paymentResult.success) {
      await prisma.order.update({
        where: { id: order.id },
        data: { paymentStatus: 'FAILED' },
      });
      return res.status(400).json({ error: paymentResult.error || 'Erreur initiation paiement' });
    }

    const updatedOrder = await prisma.order.update({
      where: { id: order.id },
      data: {
        paymentStatus: 'PENDING',
        paymentRef: paymentResult.paymentRef,
        paymentUrl: paymentResult.paymentUrl,
      },
      include: { items: true },
    });

    await notifyPaymentInitiated(req.userId!, order.orderNumber, paymentResult.paymentUrl!);

    res.json({
      ...updatedOrder,
      paymentUrl: paymentResult.paymentUrl,
      shippingAddress: safeJsonParse(updatedOrder.shippingAddress as string, {}),
      statusHistory: safeJsonParse(updatedOrder.statusHistory as string, []),
    });
  } catch (error: any) {
    logger.error({ err: error }, 'Retry payment error');
    res.status(500).json({ error: 'Erreur lors de la reprise du paiement' });
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