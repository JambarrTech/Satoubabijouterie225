import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { authenticateToken, requireAdmin, AuthRequest } from '../middleware/auth';
import { notifyCustomRequest } from '../lib/notifications';

const router = Router();

const VALID_CUSTOM_STATUSES = ['PENDING', 'IN_PROGRESS', 'QUOTE_SENT', 'APPROVED', 'COMPLETED', 'CANCELLED'];

// Get user's custom requests
router.get('/api/custom-requests', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const requests = await prisma.customRequest.findMany({
      where: { userId: req.userId! },
      orderBy: { createdAt: 'desc' },
    });
    res.json(requests);
  } catch {
    res.status(500).json({ error: 'Erreur' });
  }
});

// Admin: get all custom requests
router.get('/api/custom-requests/all', authenticateToken, requireAdmin, async (_req: AuthRequest, res) => {
  try {
    const requests = await prisma.customRequest.findMany({
      include: { user: { select: { name: true, email: true, phone: true } } },
      orderBy: { createdAt: 'desc' },
    });
    res.json(requests);
  } catch {
    res.status(500).json({ error: 'Erreur' });
  }
});

// Get single custom request (owner or admin)
router.get('/api/custom-requests/:id', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const isAdmin = req.userRole === 'ADMIN';

    const request = await prisma.customRequest.findFirst({
      where: isAdmin
        ? { id: req.params.id }
        : { id: req.params.id, userId: req.userId! },
    });

    if (!request) return res.status(404).json({ error: 'Demande non trouvée' });
    res.json(request);
  } catch {
    res.status(500).json({ error: 'Erreur' });
  }
});

// Create custom request
router.post('/api/custom-requests', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { jewelryType, material, description, budget, referenceImageUrl, phone } = req.body;
    if (!jewelryType || !description || !phone) {
      return res.status(400).json({ error: 'Type de bijou, description et téléphone requis' });
    }
    const request = await prisma.customRequest.create({
      data: {
        userId: req.userId!,
        jewelryType,
        material,
        description,
        budget: budget ? String(budget) : null,
        referenceImageUrl,
        phone,
      },
    });

    // Notify user
    await notifyCustomRequest(req.userId!, request.id);

    res.status(201).json(request);
  } catch {
    res.status(500).json({ error: 'Erreur lors de la création' });
  }
});

// Admin: update custom request status
router.put('/api/custom-requests/:id/status', authenticateToken, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const { status } = req.body;
    if (!VALID_CUSTOM_STATUSES.includes(status)) {
      return res.status(400).json({ error: 'Statut invalide' });
    }
    const request = await prisma.customRequest.update({
      where: { id: req.params.id },
      data: { status },
    });
    res.json(request);
  } catch {
    res.status(500).json({ error: 'Erreur' });
  }
});

// Delete custom request (owner or admin)
router.delete('/api/custom-requests/:id', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const request = await prisma.customRequest.findUnique({ where: { id: req.params.id } });
    if (!request) return res.status(404).json({ error: 'Demande non trouvée' });

    const isAdmin = req.userRole === 'ADMIN';

    if (request.userId !== req.userId && !isAdmin) {
      return res.status(403).json({ error: 'Accès refusé' });
    }

    await prisma.customRequest.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: 'Erreur' });
  }
});

export default router;
