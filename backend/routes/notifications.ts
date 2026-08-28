import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { authenticateToken, requireAdmin, AuthRequest } from '../middleware/auth';

const router = Router();

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
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: 'Erreur' });
  }
});

// Admin: send notification to user
router.post('/api/notifications', authenticateToken, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const { userId, title, message, type } = req.body;
    if (!userId || !title || !message) {
      return res.status(400).json({ error: 'Utilisateur, titre et message requis' });
    }

    const notification = await prisma.notification.create({
      data: {
        userId,
        title,
        message,
        type: type || 'SYSTEM',
      },
    });
    res.status(201).json(notification);
  } catch {
    res.status(500).json({ error: 'Erreur lors de l\'envoi' });
  }
});

export default router;
