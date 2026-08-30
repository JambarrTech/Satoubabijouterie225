import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { authenticateToken, requireAdmin, AuthRequest } from '../middleware/auth';
import { sendSMS } from '../lib/sms';
import logger from '../lib/logger';

const router = Router();

// Admin: send custom SMS to a customer
router.post('/api/sms/send', authenticateToken, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const { phone, message, userId } = req.body;

    if (!phone || !message) {
      return res.status(400).json({ error: 'Telephone et message requis' });
    }

    if (message.length > 160) {
      return res.status(400).json({ error: 'Message trop long (max 160 caracteres)' });
    }

    const result = await sendSMS({ to: phone, message });

    // Log the SMS attempt
    logger.info({
      from: req.userId,
      to: phone,
      userId: userId || null,
      success: result.success,
      messageId: result.messageId,
    }, 'Admin custom SMS sent');

    if (result.success) {
      res.json({ success: true, messageId: result.messageId });
    } else {
      res.status(500).json({ error: result.error || 'Echec envoi SMS' });
    }
  } catch (error: any) {
    logger.error({ err: error }, 'SMS send error');
    res.status(500).json({ error: 'Erreur lors de l\'envoi du SMS' });
  }
});

// Admin: send SMS reply to customer regarding an order
router.post('/api/sms/order-reply', authenticateToken, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const { orderId, message } = req.body;

    if (!orderId || !message) {
      return res.status(400).json({ error: 'Commande et message requis' });
    }

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { user: { select: { id: true, phone: true, name: true } } },
    });

    if (!order) {
      return res.status(404).json({ error: 'Commande non trouvee' });
    }

    const phone = order.user?.phone || order.phone;
    if (!phone) {
      return res.status(400).json({ error: 'Pas de numero de telephone pour cette commande' });
    }

    const result = await sendSMS({ to: phone, message });

    logger.info({
      from: req.userId,
      orderId,
      customerId: order.user?.id,
      phone,
      success: result.success,
      messageId: result.messageId,
    }, 'Order reply SMS sent');

    if (result.success) {
      // Also create an in-app notification for the customer
      if (order.user?.id) {
        await prisma.notification.create({
          data: {
            userId: order.user.id,
            title: `Reponse SaTouba - Commande ${order.orderNumber}`,
            message,
            type: 'ORDER',
          },
        });
      }
      res.json({ success: true, messageId: result.messageId });
    } else {
      res.status(500).json({ error: result.error || 'Echec envoi SMS' });
    }
  } catch (error: any) {
    logger.error({ err: error }, 'Order reply SMS error');
    res.status(500).json({ error: 'Erreur lors de l\'envoi du SMS' });
  }
});

// Admin: send SMS reply regarding a custom request
router.post('/api/sms/custom-reply', authenticateToken, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const { requestId, message } = req.body;

    if (!requestId || !message) {
      return res.status(400).json({ error: 'Demande et message requis' });
    }

    const request = await prisma.customRequest.findUnique({
      where: { id: requestId },
      include: { user: { select: { id: true, phone: true, name: true } } },
    });

    if (!request) {
      return res.status(404).json({ error: 'Demande non trouvee' });
    }

    const phone = request.user?.phone;
    if (!phone) {
      return res.status(400).json({ error: 'Pas de numero de telephone pour cette demande' });
    }

    const result = await sendSMS({ to: phone, message });

    logger.info({
      from: req.userId,
      requestId,
      customerId: request.user?.id,
      phone,
      success: result.success,
    }, 'Custom request reply SMS sent');

    if (result.success) {
      if (request.user?.id) {
        await prisma.notification.create({
          data: {
            userId: request.user.id,
            title: 'Reponse SaTouba - Demande sur-mesure',
            message,
            type: 'CUSTOM',
          },
        });
      }
      res.json({ success: true, messageId: result.messageId });
    } else {
      res.status(500).json({ error: result.error || 'Echec envoi SMS' });
    }
  } catch (error: any) {
    logger.error({ err: error }, 'Custom reply SMS error');
    res.status(500).json({ error: 'Erreur lors de l\'envoi du SMS' });
  }
});

// Admin: send SMS reply regarding a repair request
router.post('/api/sms/repair-reply', authenticateToken, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const { requestId, message } = req.body;

    if (!requestId || !message) {
      return res.status(400).json({ error: 'Demande et message requis' });
    }

    const request = await prisma.repairRequest.findUnique({
      where: { id: requestId },
      include: { user: { select: { id: true, phone: true, name: true } } },
    });

    if (!request) {
      return res.status(404).json({ error: 'Demande non trouvee' });
    }

    const phone = request.user?.phone;
    if (!phone) {
      return res.status(400).json({ error: 'Pas de numero de telephone pour cette demande' });
    }

    const result = await sendSMS({ to: phone, message });

    logger.info({
      from: req.userId,
      requestId,
      customerId: request.user?.id,
      phone,
      success: result.success,
    }, 'Repair reply SMS sent');

    if (result.success) {
      if (request.user?.id) {
        await prisma.notification.create({
          data: {
            userId: request.user.id,
            title: 'Reponse SaTouba - Demande de reparation',
            message,
            type: 'REPAIR',
          },
        });
      }
      res.json({ success: true, messageId: result.messageId });
    } else {
      res.status(500).json({ error: result.error || 'Echec envoi SMS' });
    }
  } catch (error: any) {
    logger.error({ err: error }, 'Repair reply SMS error');
    res.status(500).json({ error: 'Erreur lors de l\'envoi du SMS' });
  }
});

export default router;