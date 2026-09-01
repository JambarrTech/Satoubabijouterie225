import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { authenticateToken, requireAdmin, AuthRequest } from '../middleware/auth';
import { safeJsonParse } from '../lib/helpers';
import logger from '../lib/logger';
import { notifyRepairRequest, notifyRepairStatusChange } from '../lib/notifications';
import { sanitizeString } from '../lib/sanitize';
import { logAction } from '../lib/audit';

const router = Router();

const createRepairSchema = z.object({
  jewelryType: z.string().trim().min(1, 'Type de bijou requis').max(200),
  problemType: z.string().trim().min(1, 'Type de problème requis').max(200),
  description: z.string().trim().max(2000).optional(),
  phone: z.string().trim().min(8, 'Numéro de téléphone valide requis').max(20),
  photos: z.array(z.string()).optional(),
});

const repairStatusSchema = z.object({
  status: z.enum(['RECEIVED', 'IN_PROGRESS', 'WAITING_PARTS', 'COMPLETED', 'DELIVERED', 'CANCELLED'] as const),
});

function validateRepair<T extends z.ZodTypeAny>(schema: T, data: unknown): { success: true; data: z.infer<T> } | { success: false; error: string } {
  const result = schema.safeParse(data);
  if (result.success) return { success: true, data: result.data };
  const firstError = result.error.issues[0];
  return { success: false, error: firstError?.message || 'Données invalides' };
}

// Get user's repair requests
router.get('/api/repairs', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const repairs = await prisma.repairRequest.findMany({
      where: { userId: req.userId! },
      orderBy: { createdAt: 'desc' },
    });

    const parsed = repairs.map((r) => ({
      ...r,
      photos: safeJsonParse(r.photos, []),
    }));

    res.json(parsed);
  } catch {
    res.status(500).json({ error: 'Erreur' });
  }
});

// Admin: get all repair requests
router.get('/api/repairs/all', authenticateToken, requireAdmin, async (_req: AuthRequest, res) => {
  try {
    const repairs = await prisma.repairRequest.findMany({
      include: { user: { select: { name: true, identifier: true, phone: true } } },
      orderBy: { createdAt: 'desc' },
    });

    const parsed = repairs.map((r) => ({
      ...r,
      photos: safeJsonParse(r.photos, []),
    }));

    res.json(parsed);
  } catch {
    res.status(500).json({ error: 'Erreur' });
  }
});

// Get single repair (owner or admin)
router.get('/api/repairs/:id', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const isAdmin = req.userRole === 'ADMIN';

    const repair = await prisma.repairRequest.findFirst({
      where: isAdmin
        ? { id: req.params.id }
        : { id: req.params.id, userId: req.userId! },
    });

    if (!repair) return res.status(404).json({ error: 'Demande non trouvée' });
    res.json({ ...repair, photos: safeJsonParse(repair.photos, []) });
  } catch {
    res.status(500).json({ error: 'Erreur' });
  }
});

// Create repair request
router.post('/api/repairs', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const validation = validateRepair(createRepairSchema, req.body);
    if (!validation.success) {
      return res.status(400).json({ error: validation.error });
    }
    const { jewelryType, problemType, description, photos, phone } = validation.data;

    const repair = await prisma.repairRequest.create({
      data: {
        userId: req.userId!,
        jewelryType: sanitizeString(jewelryType),
        problemType: sanitizeString(problemType),
        description: sanitizeString(description || ''),
        photos: photos ? JSON.stringify(photos) : null,
        phone: sanitizeString(phone),
      },
    });

    // Notify user
    await notifyRepairRequest(req.userId!, repair.id);

    res.status(201).json(repair);
  } catch {
    res.status(500).json({ error: 'Erreur' });
  }
});

// Admin: update repair status (+ notify client)
router.put('/api/repairs/:id/status', authenticateToken, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const validation = validateRepair(repairStatusSchema, req.body);
    if (!validation.success) {
      return res.status(400).json({ error: validation.error });
    }
    const { status } = validation.data;

    const repair = await prisma.repairRequest.update({
      where: { id: req.params.id },
      data: { status },
    });

    // Notify client of status change (async, non-blocking)
    notifyRepairStatusChange(req.params.id, status as any).catch((err) =>
      logger.error({ err, requestId: req.params.id }, 'Failed to send repair status notifications')
    );

    res.json(repair);
  } catch {
    res.status(500).json({ error: 'Erreur' });
  }
});

// Delete repair (owner or admin)
router.delete('/api/repairs/:id', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const repair = await prisma.repairRequest.findUnique({ where: { id: req.params.id } });
    if (!repair) return res.status(404).json({ error: 'Demande non trouvée' });

    const isAdmin = req.userRole === 'ADMIN';

    if (repair.userId !== req.userId && !isAdmin) {
      return res.status(403).json({ error: 'Accès refusé' });
    }

    await prisma.repairRequest.delete({ where: { id: req.params.id } });

    await logAction({
      userId: req.userId!,
      action: 'REPAIR_REQUEST_DELETE',
      entity: 'RepairRequest',
      entityId: req.params.id,
      ipAddress: req.ip,
    });

    res.json({ success: true });
  } catch {
    res.status(500).json({ error: 'Erreur' });
  }
});

export default router;
