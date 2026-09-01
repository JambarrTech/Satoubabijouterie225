import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { prisma } from '../lib/prisma';

function getJWTSecret(): string {
  const secret = process.env.JWT_SECRET || (process.env.NODE_ENV === 'test' ? 'test-jwt-secret-for-vitest-only' : '');
  if (!secret) {
    console.error('FATAL: JWT_SECRET is not set. Generate with: openssl rand -base64 64');
    process.exit(1);
  }
  if (process.env.NODE_ENV === 'production' && secret.length < 32) {
    console.error('FATAL: JWT_SECRET too short (min 32 chars) for production.');
    process.exit(1);
  }
  return secret;
}

export interface AuthRequest extends Request {
  userId?: string;
  userRole?: string;
}

export async function authenticateToken(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Token d\'authentification requis' });
  }

  let decoded: { userId: string; role: string };
  try {
    decoded = jwt.verify(token, getJWTSecret()) as { userId: string; role: string };
  } catch {
    return res.status(401).json({ error: 'Token invalide ou expiré' });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, role: true },
    });
    if (!user) {
      return res.status(401).json({ error: 'Session invalide — veuillez vous reconnecter' });
    }
    req.userId = user.id;
    req.userRole = user.role;
    next();
  } catch {
    return res.status(500).json({ error: 'Erreur lors de la vérification de la session' });
  }
}

export async function optionalAuth(req: AuthRequest, _res: Response, next: NextFunction) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (token) {
    try {
      const decoded = jwt.verify(token, getJWTSecret()) as { userId: string; role: string };
      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        select: { id: true, role: true },
      });
      if (user) {
        req.userId = user.id;
        req.userRole = user.role;
      }
    } catch {}
  }
  next();
}

export function requireAdmin(req: AuthRequest, res: Response, next: NextFunction) {
  if (req.userRole !== 'ADMIN') {
    return res.status(403).json({ error: 'Accès réservé aux administrateurs' });
  }
  next();
}

export function generateToken(userId: string, role: string): string {
  return jwt.sign({ userId, role }, getJWTSecret(), { expiresIn: '15m' });
}

export async function generateRefreshToken(userId: string): Promise<string> {
  const token = crypto.randomBytes(40).toString('hex');
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

  await prisma.refreshToken.create({
    data: {
      token,
      userId,
      expiresAt,
    },
  });

  return token;
}

export async function verifyRefreshToken(token: string): Promise<{ userId: string } | null> {
  const refreshToken = await prisma.refreshToken.findUnique({
    where: { token },
  });

  if (!refreshToken) return null;
  if (refreshToken.expiresAt < new Date()) {
    // Delete expired token
    await prisma.refreshToken.delete({ where: { id: refreshToken.id } }).catch(() => {});
    return null;
  }

  return { userId: refreshToken.userId };
}

export async function revokeRefreshToken(token: string): Promise<void> {
  await prisma.refreshToken.deleteMany({ where: { token } }).catch(() => {});
}

export { rateLimit } from '../lib/rateLimit';