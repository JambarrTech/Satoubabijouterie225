import { Router } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { generateToken, generateRefreshToken, verifyRefreshToken, revokeRefreshToken, authenticateToken, rateLimit, AuthRequest } from '../middleware/auth';
import { sendOTPSMS } from '../lib/sms';
import logger from '../lib/logger';
import { logAction } from '../lib/audit';
import { sanitizeString } from '../lib/sanitize';

const router = Router();

const ALLOWED_PROFILE_FIELDS = ['name', 'phone', 'address', 'city', 'country', 'avatar'];
const MAX_FAILED_ATTEMPTS = 8;
const LOCKOUT_DURATION_MS = 10 * 60 * 1000; // 10 minutes
const PASSWORD_RESET_EXPIRY_MS = 10 * 60 * 1000; // 10 minutes (OTP par SMS)
const GERANT_IDENTIFIER = process.env.GERANT_IDENTIFIER || 'gerantSatoubaBijouterie6002';

// --- Zod schemas ---
const registerSchema = z.object({
  name: z.string().trim().min(2, 'Le nom doit contenir au moins 2 caractères').max(100),
  identifier: z.string().trim().min(3, "L'identifiant doit contenir au moins 3 caractères").max(50).regex(/^[a-zA-Z0-9_-]+$/, "L'identifiant ne peut contenir que des lettres, chiffres, tirets ou underscores"),
  password: z.string().min(8, 'Le mot de passe doit contenir au moins 8 caractères').regex(/[A-Z]/, 'Le mot de passe doit contenir au moins une majuscule').regex(/[a-z]/, 'Le mot de passe doit contenir au moins une minuscule').regex(/[0-9]/, 'Le mot de passe doit contenir au moins un chiffre'),
  phone: z.string().trim().optional(),
});

const loginSchema = z.object({
  identifier: z.string().trim().min(1, 'Identifiant requis'),
  password: z.string().min(1, 'Mot de passe requis'),
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Mot de passe actuel requis'),
  newPassword: z.string().min(8, 'Le mot de passe doit contenir au moins 8 caractères').regex(/[A-Z]/, 'Le mot de passe doit contenir au moins une majuscule').regex(/[a-z]/, 'Le mot de passe doit contenir au moins une minuscule').regex(/[0-9]/, 'Le mot de passe doit contenir au moins un chiffre'),
});

const forgotPasswordSchema = z.object({
  phone: z.string().trim().min(8, 'Numéro de téléphone valide requis').max(20),
});

const resetPasswordSchema = z.object({
  phone: z.string().trim().min(8, 'Numéro de téléphone valide requis').max(20),
  otp: z.string().length(6, 'Le code OTP doit contenir 6 chiffres').regex(/^\d{6}$/, 'Le code OTP doit contenir uniquement des chiffres'),
  newPassword: z.string().min(8, 'Le mot de passe doit contenir au moins 8 caractères').regex(/[A-Z]/, 'Le mot de passe doit contenir au moins une majuscule').regex(/[a-z]/, 'Le mot de passe doit contenir au moins une minuscule').regex(/[0-9]/, 'Le mot de passe doit contenir au moins un chiffre'),
});

function validate<T extends z.ZodTypeAny>(schema: T, data: unknown): { success: true; data: z.infer<T> } | { success: false; error: string } {
  const result = schema.safeParse(data);
  if (result.success) return { success: true, data: result.data };
  const firstError = result.error.issues[0];
  return { success: false, error: firstError?.message || 'Données invalides' };
}

// Register (rate limited: 5 per minute)
router.post('/api/auth/register', rateLimit(15, 60_000), async (req, res) => {
  try {
    const { name, identifier, password, phone } = req.body;

    const validation = validate(registerSchema, { name, identifier, password, phone });
    if (!validation.success) {
      return res.status(400).json({ error: validation.error });
    }
    const { name: validName, identifier: validIdentifier, password: validPassword } = validation.data;

    const existing = await prisma.user.findUnique({ where: { identifier: validIdentifier.toLowerCase() } });
    if (existing) {
      return res.status(400).json({ error: 'Un compte existe déjà avec cet identifiant' });
    }

    const hashedPassword = await bcrypt.hash(validPassword, 12);
    const user = await prisma.user.create({
      data: { name: validName, identifier: validIdentifier.toLowerCase(), password: hashedPassword, phone: validation.data.phone || null },
    });

    await prisma.cart.create({ data: { userId: user.id } });

    const token = generateToken(user.id, user.role);
    const refreshToken = await generateRefreshToken(user.id);
    const { password: _, ...userWithoutPassword } = user;

    logger.info({ userId: user.id, identifier: user.identifier }, 'User registered');
    res.status(201).json({ user: userWithoutPassword, token, refreshToken });
  } catch (error) {
    logger.error({ err: error }, 'Register error');
    res.status(500).json({ error: 'Erreur lors de l\'inscription' });
  }
});

// Shared authentication helper
async function authenticateUser(
  identifier: string,
  password: string,
  options?: { requireAdmin?: boolean }
): Promise<{ user: any; token: string; refreshToken: string }> {
  const user = await prisma.user.findUnique({ where: { identifier: identifier.toLowerCase() } });
  if (!user || (options?.requireAdmin && user.role !== 'ADMIN')) {
    throw Object.assign(new Error('Identifiant ou mot de passe incorrect'), { status: 401 });
  }

  // Check account lockout
  if (user.lockedUntil && user.lockedUntil > new Date()) {
    const remainingMin = Math.ceil((user.lockedUntil.getTime() - Date.now()) / 60_000);
    const err = Object.assign(new Error(`Compte temporairement verrouillé. Réessayez dans ${remainingMin} minute${remainingMin > 1 ? 's' : ''}.`), {
      status: 423,
      details: { lockedUntil: user.lockedUntil.toISOString() },
    });
    throw err;
  }

  // If lockout expired, reset counters
  if (user.lockedUntil && user.lockedUntil <= new Date()) {
    await prisma.user.update({
      where: { id: user.id },
      data: { failedLoginAttempts: 0, lockedUntil: null },
    });
  }

  const passwordMatch = await bcrypt.compare(password, user.password);
  if (!passwordMatch) {
    const newFailedCount = user.failedLoginAttempts + 1;
    const updateData: any = { failedLoginAttempts: newFailedCount };

    if (newFailedCount >= MAX_FAILED_ATTEMPTS) {
      updateData.lockedUntil = new Date(Date.now() + LOCKOUT_DURATION_MS);
      logger.warn({ userId: user.id, identifier: user.identifier }, 'Account locked after failed attempts');
    }

    await prisma.user.update({ where: { id: user.id }, data: updateData });

    const remaining = MAX_FAILED_ATTEMPTS - newFailedCount;
    if (remaining > 0) {
      throw Object.assign(new Error(`Identifiant ou mot de passe incorrect. ${remaining} tentative${remaining > 1 ? 's' : ''} restante${remaining > 1 ? 's' : ''}.`), { status: 401 });
    }
    throw Object.assign(new Error('Compte temporairement verrouillé après 8 tentatives échouées. Réessayez dans 10 minutes.'), {
      status: 423,
      details: { lockedUntil: updateData.lockedUntil.toISOString() },
    });
  }

  // Success — reset failed attempts and update lastLoginAt
  await prisma.user.update({
    where: { id: user.id },
    data: { failedLoginAttempts: 0, lockedUntil: null, lastLoginAt: new Date() },
  });

  const token = generateToken(user.id, user.role);
  const refreshToken = await generateRefreshToken(user.id);
  const { password: _, ...userWithoutPassword } = user;

  return { user: userWithoutPassword, token, refreshToken };
}

// Login (rate limited: 10 per minute, with account lockout)
router.post('/api/auth/login', rateLimit(30, 60_000), async (req, res) => {
  try {
    const { identifier, password } = req.body;

    const validation = validate(loginSchema, { identifier, password });
    if (!validation.success) {
      return res.status(400).json({ error: validation.error });
    }
    const { identifier: validIdentifier, password: validPassword } = validation.data;

    const result = await authenticateUser(validIdentifier, validPassword);

    logger.info({ userId: result.user.id, identifier: result.user.identifier }, 'User logged in');

    await logAction({
      userId: result.user.id,
      action: 'LOGIN',
      entity: 'User',
      entityId: result.user.id,
      details: { role: result.user.role },
      ipAddress: req.ip,
    });

    res.json(result);
  } catch (error: any) {
    if (error.status) {
      const body: any = { error: error.message };
      if (error.details) Object.assign(body, error.details);
      return res.status(error.status).json(body);
    }
    logger.error({ err: error }, 'Login error');
    res.status(500).json({ error: 'Erreur lors de la connexion' });
  }
});

// Gerant login (fixed identifier: gerantSatoubaBijouterie6002)
router.post('/api/auth/login-gerant', rateLimit(30, 60_000), async (req, res) => {
  try {
    const { identifier, password } = req.body;

    const validation = validate(loginSchema, { identifier: identifier || GERANT_IDENTIFIER, password });
    if (!validation.success) {
      return res.status(400).json({ error: validation.error });
    }
    const { identifier: loginId, password: validPassword } = validation.data;

    const result = await authenticateUser(loginId, validPassword, { requireAdmin: true });

    logger.info({ userId: result.user.id }, 'Gerant logged in');

    await logAction({
      userId: result.user.id,
      action: 'LOGIN_GERANT',
      entity: 'User',
      entityId: result.user.id,
      details: { role: result.user.role },
      ipAddress: req.ip,
    });

    res.json(result);
  } catch (error: any) {
    if (error.status) {
      const body: any = { error: error.message };
      if (error.details) Object.assign(body, error.details);
      return res.status(error.status).json(body);
    }
    logger.error({ err: error }, 'Gerant login error');
    res.status(500).json({ error: 'Erreur lors de la connexion' });
  }
});

// Get current user
router.get('/api/auth/me', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId! },
      select: { id: true, name: true, identifier: true, phone: true, avatar: true, role: true, address: true, city: true, country: true, createdAt: true, lastLoginAt: true },
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
        updateData[key] = typeof req.body[key] === 'string' ? sanitizeString(req.body[key]) : req.body[key];
      }
    }

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ error: 'Aucun champ à modifier' });
    }

    const user = await prisma.user.update({
      where: { id: req.userId! },
      data: updateData,
      select: { id: true, name: true, identifier: true, phone: true, avatar: true, role: true, address: true, city: true, country: true, createdAt: true },
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

    const validation = validate(changePasswordSchema, { currentPassword, newPassword });
    if (!validation.success) {
      return res.status(400).json({ error: validation.error });
    }
    const { currentPassword: validCurrentPassword, newPassword: validNewPassword } = validation.data;

    const user = await prisma.user.findUnique({ where: { id: req.userId! } });
    if (!user) {
      return res.status(404).json({ error: 'Utilisateur non trouvé' });
    }

    const passwordMatch = await bcrypt.compare(validCurrentPassword, user.password);
    if (!passwordMatch) {
      return res.status(401).json({ error: 'Mot de passe actuel incorrect' });
    }

    if (validCurrentPassword === validNewPassword) {
      return res.status(400).json({ error: 'Le nouveau mot de passe doit être différent de l\'actuel' });
    }

    const hashedPassword = await bcrypt.hash(validNewPassword, 12);
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

// Request password reset — sends OTP by SMS
router.post('/api/auth/forgot-password', rateLimit(10, 60_000), async (req, res) => {
  try {
    const { phone } = req.body;

    const validation = validate(forgotPasswordSchema, { phone });
    if (!validation.success) {
      return res.status(400).json({ error: validation.error });
    }
    const { phone: validPhone } = validation.data;

    const user = await prisma.user.findFirst({ where: { phone: validPhone } });

    // Always return success to prevent phone enumeration
    if (!user) {
      return res.json({ success: true, message: 'Si un compte existe avec ce numéro, un code de réinitialisation a été envoyé par SMS.' });
    }

    // Invalidate any existing tokens for this user
    await prisma.passwordResetToken.updateMany({
      where: { userId: user.id, used: false },
      data: { used: true },
    });

    // Generate 6-digit OTP
    const otp = crypto.randomInt(100000, 999999).toString();
    const hashedToken = crypto.createHash('sha256').update(otp).digest('hex');

    await prisma.passwordResetToken.create({
      data: {
        token: hashedToken,
        userId: user.id,
        expiresAt: new Date(Date.now() + PASSWORD_RESET_EXPIRY_MS),
      },
    });

    // Send OTP by SMS
    if (user.phone) {
      await sendOTPSMS(user.phone, otp);
    }

    logger.info({ userId: user.id }, 'Password reset OTP sent via SMS');
    res.json({ success: true, message: 'Si un compte existe avec ce numéro, un code de réinitialisation a été envoyé par SMS.' });
  } catch (error) {
    logger.error({ err: error }, 'Forgot password error');
    res.status(500).json({ error: 'Erreur lors de la demande de réinitialisation' });
  }
});

// Reset password with OTP (rate limited: 5 per minute)
router.post('/api/auth/reset-password', rateLimit(15, 60_000), async (req, res) => {
  try {
    const { phone, otp, newPassword } = req.body;

    const validation = validate(resetPasswordSchema, { phone, otp, newPassword });
    if (!validation.success) {
      return res.status(400).json({ error: validation.error });
    }
    const { phone: validPhone, otp: validOtp, newPassword: validNewPassword } = validation.data;

    // Find user by phone
    const user = await prisma.user.findFirst({ where: { phone: validPhone } });
    if (!user) {
      return res.status(400).json({ error: 'Code invalide ou expiré' });
    }

    const hashedToken = crypto.createHash('sha256').update(validOtp).digest('hex');

    const resetRecord = await prisma.passwordResetToken.findFirst({
      where: {
        token: hashedToken,
        userId: user.id,
        used: false,
        expiresAt: { gt: new Date() },
      },
    });

    if (!resetRecord) {
      return res.status(400).json({ error: 'Code invalide ou expiré' });
    }

    const hashedPassword = await bcrypt.hash(validNewPassword, 12);

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

    logger.info({ userId: resetRecord.userId }, 'Password reset completed via OTP');
    res.json({ success: true, message: 'Mot de passe réinitialisé avec succès' });
  } catch (error) {
    logger.error({ err: error }, 'Reset password error');
    res.status(500).json({ error: 'Erreur lors de la réinitialisation du mot de passe' });
  }
});

// Refresh access token using refresh token
router.post('/api/auth/refresh', rateLimit(30, 60_000), async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken || typeof refreshToken !== 'string') {
      return res.status(400).json({ error: 'Refresh token requis' });
    }

    const payload = await verifyRefreshToken(refreshToken);
    if (!payload) {
      return res.status(401).json({ error: 'Refresh token invalide ou expiré' });
    }

    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { id: true, role: true },
    });

    if (!user) {
      return res.status(401).json({ error: 'Utilisateur non trouvé' });
    }

    // Rotate: revoke old refresh token, issue new pair
    await revokeRefreshToken(refreshToken);
    const newAccessToken = generateToken(user.id, user.role);
    const newRefreshToken = await generateRefreshToken(user.id);

    res.json({ token: newAccessToken, refreshToken: newRefreshToken });
  } catch (error) {
    logger.error({ err: error }, 'Refresh token error');
    res.status(500).json({ error: 'Erreur lors du rafraîchissement du token' });
  }
});

// Logout — revoke refresh token
router.post('/api/auth/logout', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { refreshToken } = req.body;
    if (refreshToken) {
      await revokeRefreshToken(refreshToken);
    }
    // Also revoke all refresh tokens for this user (full logout)
    await prisma.refreshToken.deleteMany({ where: { userId: req.userId! } }).catch(() => {});

    await logAction({
      userId: req.userId!,
      action: 'LOGOUT',
      entity: 'User',
      entityId: req.userId!,
      ipAddress: req.ip,
    });

    res.json({ success: true, message: 'Déconnexion réussie' });
  } catch (error) {
    logger.error({ err: error }, 'Logout error');
    res.status(500).json({ error: 'Erreur lors de la déconnexion' });
  }
});

export default router;
