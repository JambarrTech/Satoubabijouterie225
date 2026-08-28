import { Router } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { prisma } from '../lib/prisma';
import { generateToken, authenticateToken, rateLimit, AuthRequest } from '../middleware/auth';
import logger from '../lib/logger';

const router = Router();

const ALLOWED_PROFILE_FIELDS = ['name', 'phone', 'address', 'city', 'country', 'avatar'];
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes
const PASSWORD_RESET_EXPIRY_MS = 60 * 60 * 1000; // 1 hour

function isValidEmail(email: string): boolean {
  return typeof email === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isStrongPassword(password: string): { valid: boolean; error?: string } {
  if (typeof password !== 'string') return { valid: false, error: 'Mot de passe invalide' };
  if (password.length < 8) return { valid: false, error: 'Le mot de passe doit contenir au moins 8 caractères' };
  if (!/[A-Z]/.test(password)) return { valid: false, error: 'Le mot de passe doit contenir au moins une majuscule' };
  if (!/[a-z]/.test(password)) return { valid: false, error: 'Le mot de passe doit contenir au moins une minuscule' };
  if (!/[0-9]/.test(password)) return { valid: false, error: 'Le mot de passe doit contenir au moins un chiffre' };
  return { valid: true };
}

// Register (rate limited: 5 per minute)
router.post('/api/auth/register', rateLimit(5, 60_000), async (req, res) => {
  try {
    const { name, email, password, phone } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Nom, email et mot de passe requis' });
    }
    if (typeof name !== 'string' || name.trim().length < 2) {
      return res.status(400).json({ error: 'Le nom doit contenir au moins 2 caractères' });
    }
    if (!isValidEmail(email)) {
      return res.status(400).json({ error: 'Format d\'email invalide' });
    }
    const pwdCheck = isStrongPassword(password);
    if (!pwdCheck.valid) {
      return res.status(400).json({ error: pwdCheck.error });
    }

    const existing = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (existing) {
      return res.status(400).json({ error: 'Un compte existe déjà avec cet email' });
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({
      data: { name: name.trim(), email: email.toLowerCase(), password: hashedPassword, phone: phone || null },
    });

    await prisma.cart.create({ data: { userId: user.id } });

    const token = generateToken(user.id, user.role);
    const { password: _, ...userWithoutPassword } = user;

    logger.info({ userId: user.id, email: user.email }, 'User registered');
    res.status(201).json({ user: userWithoutPassword, token });
  } catch (error) {
    logger.error({ err: error }, 'Register error');
    res.status(500).json({ error: 'Erreur lors de l\'inscription' });
  }
});

// Login (rate limited: 10 per minute, with account lockout)
router.post('/api/auth/login', rateLimit(10, 60_000), async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email et mot de passe requis' });
    }

    const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (!user) {
      return res.status(401).json({ error: 'Email ou mot de passe incorrect' });
    }

    // Check account lockout
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      const remainingMin = Math.ceil((user.lockedUntil.getTime() - Date.now()) / 60_000);
      return res.status(423).json({
        error: `Compte temporairement verrouillé. Réessayez dans ${remainingMin} minute${remainingMin > 1 ? 's' : ''}.`,
        lockedUntil: user.lockedUntil.toISOString(),
      });
    }

    // If lockout expired, reset counters
    if (user.lockedUntil && user.lockedUntil <= new Date()) {
      await prisma.user.update({
        where: { id: user.id },
        data: { failedLoginAttempts: 0, lockedUntil: null },
      });
    }

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      const newFailedCount = user.failedLoginAttempts + 1;
      const updateData: any = { failedLoginAttempts: newFailedCount };

      if (newFailedCount >= MAX_FAILED_ATTEMPTS) {
        updateData.lockedUntil = new Date(Date.now() + LOCKOUT_DURATION_MS);
        logger.warn({ userId: user.id, email: user.email }, 'Account locked after failed attempts');
      }

      await prisma.user.update({ where: { id: user.id }, data: updateData });

      const remaining = MAX_FAILED_ATTEMPTS - newFailedCount;
      if (remaining > 0) {
        return res.status(401).json({ error: `Email ou mot de passe incorrect. ${remaining} tentative${remaining > 1 ? 's' : ''} restante${remaining > 1 ? 's' : ''}.` });
      }
      return res.status(423).json({
        error: 'Compte temporairement verrouillé après 5 tentatives échouées. Réessayez dans 15 minutes.',
        lockedUntil: updateData.lockedUntil.toISOString(),
      });
    }

    // Success — reset failed attempts and update lastLoginAt
    await prisma.user.update({
      where: { id: user.id },
      data: { failedLoginAttempts: 0, lockedUntil: null, lastLoginAt: new Date() },
    });

    const token = generateToken(user.id, user.role);
    const { password: _, ...userWithoutPassword } = user;

    logger.info({ userId: user.id, email: user.email }, 'User logged in');
    res.json({ user: userWithoutPassword, token });
  } catch (error) {
    logger.error({ err: error }, 'Login error');
    res.status(500).json({ error: 'Erreur lors de la connexion' });
  }
});

// Get current user
router.get('/api/auth/me', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId! },
      select: { id: true, name: true, email: true, phone: true, avatar: true, role: true, address: true, city: true, country: true, createdAt: true, lastLoginAt: true },
    });

    if (!user) {
      return res.status(404).json({ error: 'Utilisateur non trouvé' });
    }

    res.json(user);
  } catch {
    res.status(500).json({ error: 'Erreur' });
  }
});

// Update current user (whitelisted fields only)
router.put('/api/auth/me', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const updateData: Record<string, any> = {};
    for (const key of ALLOWED_PROFILE_FIELDS) {
      if (req.body[key] !== undefined) {
        updateData[key] = req.body[key];
      }
    }

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ error: 'Aucun champ à modifier' });
    }

    const user = await prisma.user.update({
      where: { id: req.userId! },
      data: updateData,
      select: { id: true, name: true, email: true, phone: true, avatar: true, role: true, address: true, city: true, country: true, createdAt: true },
    });

    res.json(user);
  } catch {
    res.status(500).json({ error: 'Erreur lors de la mise à jour' });
  }
});

// Change password (logged in user)
router.post('/api/auth/change-password', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Mot de passe actuel et nouveau mot de passe requis' });
    }

    const pwdCheck = isStrongPassword(newPassword);
    if (!pwdCheck.valid) {
      return res.status(400).json({ error: pwdCheck.error });
    }

    const user = await prisma.user.findUnique({ where: { id: req.userId! } });
    if (!user) {
      return res.status(404).json({ error: 'Utilisateur non trouvé' });
    }

    const validPassword = await bcrypt.compare(currentPassword, user.password);
    if (!validPassword) {
      return res.status(401).json({ error: 'Mot de passe actuel incorrect' });
    }

    if (currentPassword === newPassword) {
      return res.status(400).json({ error: 'Le nouveau mot de passe doit être différent de l\'actuel' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 12);
    await prisma.user.update({
      where: { id: req.userId! },
      data: { password: hashedPassword },
    });

    logger.info({ userId: req.userId }, 'Password changed');
    res.json({ success: true, message: 'Mot de passe modifié avec succès' });
  } catch (error) {
    logger.error({ err: error }, 'Change password error');
    res.status(500).json({ error: 'Erreur lors du changement de mot de passe' });
  }
});

// Request password reset (sends token — in production, send by email)
router.post('/api/auth/forgot-password', rateLimit(3, 60_000), async (req, res) => {
  try {
    const { email } = req.body;

    if (!email || !isValidEmail(email)) {
      return res.status(400).json({ error: 'Email valide requis' });
    }

    const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });

    // Always return success to prevent email enumeration
    if (!user) {
      return res.json({ success: true, message: 'Si un compte existe avec cet email, un lien de réinitialisation a été envoyé.' });
    }

    // Invalidate any existing tokens for this user
    await prisma.passwordResetToken.updateMany({
      where: { userId: user.id, used: false },
      data: { used: true },
    });

    // Generate secure random token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');

    await prisma.passwordResetToken.create({
      data: {
        token: hashedToken,
        userId: user.id,
        expiresAt: new Date(Date.now() + PASSWORD_RESET_EXPIRY_MS),
      },
    });

    // In production: send email with resetToken
    // For now, log it (remove in production)
    if (process.env.NODE_ENV !== 'production') {
      logger.info({ userId: user.id, resetToken }, 'Password reset token generated (dev mode)');
    }

    res.json({ success: true, message: 'Si un compte existe avec cet email, un lien de réinitialisation a été envoyé.' });
  } catch (error) {
    logger.error({ err: error }, 'Forgot password error');
    res.status(500).json({ error: 'Erreur lors de la demande de réinitialisation' });
  }
});

// Reset password with token
router.post('/api/auth/reset-password', async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({ error: 'Token et nouveau mot de passe requis' });
    }

    const pwdCheck = isStrongPassword(newPassword);
    if (!pwdCheck.valid) {
      return res.status(400).json({ error: pwdCheck.error });
    }

    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    const resetRecord = await prisma.passwordResetToken.findFirst({
      where: {
        token: hashedToken,
        used: false,
        expiresAt: { gt: new Date() },
      },
    });

    if (!resetRecord) {
      return res.status(400).json({ error: 'Token invalide ou expiré' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 12);

    await prisma.$transaction([
      prisma.user.update({
        where: { id: resetRecord.userId },
        data: { password: hashedPassword, failedLoginAttempts: 0, lockedUntil: null },
      }),
      prisma.passwordResetToken.update({
        where: { id: resetRecord.id },
        data: { used: true },
      }),
    ]);

    logger.info({ userId: resetRecord.userId }, 'Password reset completed');
    res.json({ success: true, message: 'Mot de passe réinitialisé avec succès' });
  } catch (error) {
    logger.error({ err: error }, 'Reset password error');
    res.status(500).json({ error: 'Erreur lors de la réinitialisation du mot de passe' });
  }
});

export default router;
