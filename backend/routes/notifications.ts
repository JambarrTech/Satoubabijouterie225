import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { authenticateToken, requireAdmin, AuthRequest } from '../middleware/auth';
import { sanitizeString } from '../lib/sanitize';
import { logAction } from '../lib/audit';

const router = Router();

const createNotificationSchema = z.object({
  userId: z.string().min(1, 'Utilisateur requis'),
  title: z.string().trim().min(1, 'Titre requis').max(200),
  message: z.string().trim().min(1, 'Message requis').max(2000),
  type: z.enum(['ORDER', 'PROMO', 'SYSTEM', 'REPAIR', 'CUSTOM']).optional(),
});

function validateNotification<T extends z.ZodTypeAny>(schema: T, data: unknown): { success: true; data: z.infer<T> } | { success: false; error: string } {
  const result = schema.safeParse(data);
  if (result.success) return { success: true, data: result.data };
  const firstError = result.error.issues[0];
  return { success: false, error: firstError?.message || 'Données invalides' };
}

// Get notifications
router.get('/api/notifications', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const notifications = await prisma.notification.findMany({
      where: { userId: req.userId! },
      orderBy: { createdAt: 'desc' },
    });
    res.json(notifications);
  } catch {
    res.status(500).json({ error: 'Erreur' });
  }
});

// Mark as read (with ownership check)
router.patch('/api/notifications/:id/read', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const notification = await prisma.notification.findUnique({ where: { id: req.params.id } });
    if (!notification) return res.status(404).json({ error: 'Notification non trouvée' });
    if (notification.userId !== req.userId) return res.status(403).json({ error: 'Accès refusé' });

    await prisma.notification.update({
      where: { id: req.params.id },
      data: { read: true },
    });
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: 'Erreur' });
  }
});

// Mark all as read
router.patch('/api/notifications/read-all', authenticateToken, async (req: AuthRequest, res) => {
  try {
    await prisma.notification.updateMany({
      where: { userId: req.userId!, read: false },
      data: { read: true },
    });
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: 'Erreur' });
  }
});

// Delete notification
router.delete('/api/notifications/:id', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const notification = await prisma.notification.findUnique({ where: { id: req.params.id } });
    if (!notification) return res.status(404).json({ error: 'Notification non trouvée' });
    if (notification.userId !== req.userId) return res.status(403).json({ error: 'Accès refusé' });

    await prisma.notification.delete({ where: { id: req.params.id } });

    await logAction({
      userId: req.userId!,
      action: 'NOTIFICATION_DELETE',
      entity: 'Notification',
      entityId: req.params.id,
      ipAddress: req.ip,
    });

    res.json({ success: true });
  } catch {
    res.status(500).json({ error: 'Erreur' });
  }
});

// Admin: send notification to user
router.post('/api/notifications', authenticateToken, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const validation = validateNotification(createNotificationSchema, req.body);
    if (!validation.success) {
      return res.status(400).json({ error: validation.error });
    }
    const { userId, title, message, type } = validation.data;

    const notification = await prisma.notification.create({
      data: {
        userId,
        title: sanitizeString(title),
        message: sanitizeString(message),
        type: type || 'SYSTEM',
      },
    });
    res.status(201).json(notification);
  } catch {
    res.status(500).json({ error: 'Erreur lors de l\'envoi' });
  }
});

export default router;
