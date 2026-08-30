import { Router } from 'express';
import { authenticateToken, requireAdmin, AuthRequest } from '../middleware/auth';
import { registerPushToken, unregisterPushToken } from '../lib/notifications';
import { getFirebaseDiagnostics, sendMulticastPushNotification } from '../lib/push';
import { prisma } from '../lib/prisma';
import logger from '../lib/logger';

const router = Router();

router.post('/api/push/register', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { token } = req.body;
    if (!token) {
      return res.status(400).json({ error: 'Token FCM requis' });
    }
    await registerPushToken(req.userId!, token);
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: 'Erreur enregistrement token' });
  }
});

router.delete('/api/push/register', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { token } = req.body;
    if (!token) {
      return res.status(400).json({ error: 'Token FCM requis' });
    }
    await unregisterPushToken(req.userId!, token);
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: 'Erreur suppression token' });
  }
});

router.post('/api/push/unregister', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { token } = req.body;
    if (!token) {
      return res.status(400).json({ error: 'Token FCM requis' });
    }
    await unregisterPushToken(req.userId!, token);
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: 'Erreur suppression token' });
  }
});

// Diagnostic endpoint - check Firebase config and user tokens
router.get('/api/push/diagnostic', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const firebase = getFirebaseDiagnostics();

    const user = await prisma.user.findUnique({
      where: { id: req.userId! },
      select: { id: true, name: true, pushTokens: true },
    });

    let tokens: string[] = [];
    if (user?.pushTokens) {
      tokens = typeof user.pushTokens === 'string'
        ? JSON.parse(user.pushTokens || '[]')
        : Array.isArray(user.pushTokens) ? user.pushTokens : [];
    }

    res.json({
      firebase,
      user: {
        id: user?.id,
        name: user?.name,
        tokenCount: tokens.length,
        tokens: tokens.map((t: string) => t.substring(0, 30) + '...'),
      },
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Admin: send test push to a specific user
router.post('/api/push/test', authenticateToken, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const { userId } = req.body;
    if (!userId) {
      return res.status(400).json({ error: 'userId requis' });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, pushTokens: true },
    });

    if (!user) {
      return res.status(404).json({ error: 'Utilisateur non trouve' });
    }

    let tokens: string[] = [];
    if (user.pushTokens) {
      tokens = typeof user.pushTokens === 'string'
        ? JSON.parse(user.pushTokens || '[]')
        : Array.isArray(user.pushTokens) ? user.pushTokens : [];
    }

    if (tokens.length === 0) {
      return res.status(400).json({ error: 'Aucun token push pour cet utilisateur' });
    }

    const result = await sendMulticastPushNotification(
      tokens,
      'Test SaTouba',
      'Ceci est un test de notification push. Si vous voyez ce message, tout fonctionne !',
      { type: 'test', clickAction: '/' }
    );

    res.json({ success: true, result });
  } catch (error: any) {
    logger.error({ err: error }, 'Push test error');
    res.status(500).json({ error: error.message });
  }
});

// Admin: list all users with their push token counts
router.get('/api/push/tokens', authenticateToken, requireAdmin, async (_req: AuthRequest, res) => {
  try {
    const users = await prisma.user.findMany({
      where: { role: 'CUSTOMER' },
      select: { id: true, name: true, identifier: true, pushTokens: true },
    });

    const result = users.map((u) => {
      let tokenCount = 0;
      if (u.pushTokens) {
        const tokens = typeof u.pushTokens === 'string'
          ? JSON.parse(u.pushTokens || '[]')
          : Array.isArray(u.pushTokens) ? u.pushTokens : [];
        tokenCount = tokens.length;
      }
      return { id: u.id, name: u.name, identifier: u.identifier, tokenCount };
    });

    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;