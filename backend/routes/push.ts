import { Router } from 'express';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { registerPushToken, unregisterPushToken } from '../lib/notifications';

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

export default router;