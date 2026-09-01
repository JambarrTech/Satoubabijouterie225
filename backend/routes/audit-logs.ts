import { Router, Response } from 'express';
import { getAuditLogs } from '../lib/audit';
import { authenticateToken, requireAdmin, AuthRequest } from '../middleware/auth';

const router = Router();

// GET /api/audit-logs — list audit logs (admin only)
router.get('/', authenticateToken, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { userId, action, entity, limit, offset } = req.query;
    const result = await getAuditLogs({
      userId: userId as string,
      action: action as string,
      entity: entity as string,
      limit: limit ? parseInt(limit as string) : 50,
      offset: offset ? parseInt(offset as string) : 0,
    });
    res.json(result);
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des journaux.' });
  }
});

export default router;
