import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../lib/prisma';
import { authenticateToken, requireAdmin, rateLimit, AuthRequest } from '../middleware/auth';
import { sanitizeString, isValidPhone } from '../lib/sanitize';
import { logAction } from '../lib/audit';

const router = Router();
const GERANT_IDENTIFIER = process.env.GERANT_IDENTIFIER || 'gerantSatoubaBijouterie6002';

// Admin: get customers with stats
router.get('/api/customers', authenticateToken, requireAdmin, async (_req: AuthRequest, res) => {
  try {
    const customers = await prisma.user.findMany({
      where: { role: 'CUSTOMER' },
      select: {
        id: true,
        name: true,
        identifier: true,
        phone: true,
        orders: {
          select: { totalAmount: true },
        },
      },
    });

    const result = customers.map((c) => ({
      id: c.id,
      name: c.name,
      identifier: c.identifier,
      phone: c.phone,
      totalSpent: c.orders.reduce((acc, o) => acc + o.totalAmount, 0),
      ordersCount: c.orders.length,
    }));

    res.json(result);
  } catch {
    res.status(500).json({ error: 'Erreur' });
  }
});

// Admin: get all users
router.get('/api/users', authenticateToken, requireAdmin, async (_req: AuthRequest, res) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        identifier: true,
        phone: true,
        role: true,
        createdAt: true,
        _count: {
          select: { orders: true, favorites: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const result = users.map((u) => ({
      id: u.id,
      name: u.name,
      identifier: u.identifier,
      phone: u.phone,
      role: u.role,
      createdAt: u.createdAt,
      ordersCount: u._count.orders,
      favoritesCount: u._count.favorites,
    }));

    res.json(result);
  } catch {
    res.status(500).json({ error: 'Erreur' });
  }
});

  // Admin: create user with specific role (rate limited)
  router.post('/api/users', authenticateToken, requireAdmin, rateLimit(10, 60_000), async (req: AuthRequest, res) => {
    try {
      const { name, identifier, password, phone, role = 'ARTISAN' } = req.body;

      if (!name || !identifier || !password) {
        return res.status(400).json({ error: 'Nom, identifiant et mot de passe requis' });
      }
      const sanitizedName = sanitizeString(name);
      if (sanitizedName.length < 2) {
        return res.status(400).json({ error: 'Le nom doit contenir au moins 2 caracteres' });
      }
      if (phone && !isValidPhone(phone)) {
        return res.status(400).json({ error: 'Numero de telephone invalide' });
      }
      if (!['ADMIN', 'ARTISAN'].includes(role)) {
        return res.status(400).json({ error: 'Rôle invalide (ADMIN ou ARTISAN uniquement)' });
      }
      // Only gerant can create other admins
      if (role === 'ADMIN') {
        const currentUser = await prisma.user.findUnique({ where: { id: req.userId! }, select: { identifier: true } });
        if (currentUser?.identifier !== GERANT_IDENTIFIER) {
          return res.status(403).json({ error: 'Seul le gérant principal peut créer des administrateurs' });
        }
      }
      if (typeof password !== 'string' || password.length < 8) {
        return res.status(400).json({ error: 'Le mot de passe doit contenir au moins 8 caractères' });
      }

      const existing = await prisma.user.findUnique({ where: { identifier: identifier.toLowerCase() } });
      if (existing) {
        return res.status(400).json({ error: 'Un compte existe déjà avec cet identifiant' });
      }

      const hashedPassword = await bcrypt.hash(password, 12);
      const user = await prisma.user.create({
        data: {
          name: sanitizedName,
          identifier: identifier.toLowerCase().trim(),
          password: hashedPassword,
          phone: phone || null,
          role,
        },
        select: { id: true, name: true, identifier: true, phone: true, role: true, createdAt: true },
      });

      await prisma.cart.create({ data: { userId: user.id } });

      await logAction({
        userId: req.userId!,
        action: 'USER_CREATE',
        entity: 'User',
        entityId: user.id,
        details: { name: user.name, role: user.role },
        ipAddress: req.ip,
      });

      res.status(201).json(user);
    } catch {
      res.status(500).json({ error: 'Erreur lors de la création' });
    }
  });

  // Admin: update user role
router.put('/api/users/:id/role', authenticateToken, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const { role } = req.body;
    if (!['CUSTOMER', 'ADMIN', 'ARTISAN'].includes(role)) {
      return res.status(400).json({ error: 'Rôle invalide' });
    }
    if (req.params.id === req.userId) {
      return res.status(400).json({ error: 'Vous ne pouvez pas modifier votre propre rôle' });
    }

    // Prevent demoting the last admin
    if (role !== 'ADMIN') {
      const targetUser = await prisma.user.findUnique({ where: { id: req.params.id }, select: { role: true } });
      if (targetUser?.role === 'ADMIN') {
        const adminCount = await prisma.user.count({ where: { role: 'ADMIN' } });
        if (adminCount <= 1) {
          return res.status(400).json({ error: 'Impossible de rétrograder le dernier administrateur' });
        }
      }
    }

    const user = await prisma.user.update({
      where: { id: req.params.id },
      data: { role },
      select: { id: true, name: true, identifier: true, role: true },
    });

    await logAction({
      userId: req.userId!,
      action: 'USER_ROLE_UPDATE',
      entity: 'User',
      entityId: user.id,
      details: { name: user.name, newRole: role },
      ipAddress: req.ip,
    });

    res.json(user);
  } catch {
    res.status(500).json({ error: 'Erreur' });
  }
});

// Admin: delete user
router.delete('/api/users/:id', authenticateToken, requireAdmin, async (req: AuthRequest, res) => {
  try {
    if (req.params.id === req.userId) {
      return res.status(400).json({ error: 'Vous ne pouvez pas supprimer votre propre compte' });
    }

    // Prevent deleting other admins
    const targetUser = await prisma.user.findUnique({ where: { id: req.params.id }, select: { role: true } });
    if (!targetUser) return res.status(404).json({ error: 'Utilisateur non trouvé' });
    if (targetUser.role === 'ADMIN') {
      return res.status(400).json({ error: 'Impossible de supprimer un autre administrateur' });
    }

    // Prevent deleting users with active orders
    const activeOrders = await prisma.order.count({
      where: { userId: req.params.id, status: { notIn: ['DELIVERED', 'CANCELLED'] } },
    });
    if (activeOrders > 0) {
      return res.status(400).json({ error: 'Cet utilisateur a des commandes actives et ne peut pas être supprimé' });
    }

    await prisma.$transaction(async (tx) => {
      await tx.notification.deleteMany({ where: { userId: req.params.id } });
      await tx.like.deleteMany({ where: { userId: req.params.id } });
      await tx.favorite.deleteMany({ where: { userId: req.params.id } });
      await tx.customRequest.deleteMany({ where: { userId: req.params.id } });
      await tx.repairRequest.deleteMany({ where: { userId: req.params.id } });
      await tx.orderItem.deleteMany({ where: { order: { userId: req.params.id } } });
      await tx.order.deleteMany({ where: { userId: req.params.id } });
      await tx.cartItem.deleteMany({ where: { cart: { userId: req.params.id } } });
      await tx.cart.deleteMany({ where: { userId: req.params.id } });
      await tx.passwordResetToken.deleteMany({ where: { userId: req.params.id } });
      await tx.user.delete({ where: { id: req.params.id } });
    });

    await logAction({
      userId: req.userId!,
      action: 'USER_DELETE',
      entity: 'User',
      entityId: req.params.id,
      details: { targetUserId: req.params.id },
      ipAddress: req.ip,
    });

    res.json({ success: true });
  } catch {
    res.status(500).json({ error: 'Erreur' });
  }
});

// Admin: get stats
router.get('/api/admin/stats', authenticateToken, requireAdmin, async (_req: AuthRequest, res) => {
  try {
    const [totalRevenue, totalOrders, totalProducts, totalCustomers, pendingCustom, pendingRepairs] = await Promise.all([
      prisma.order.aggregate({ _sum: { totalAmount: true } }),
      prisma.order.count(),
      prisma.product.count(),
      prisma.user.count({ where: { role: 'CUSTOMER' } }),
      prisma.customRequest.count({ where: { status: 'PENDING' } }),
      prisma.repairRequest.count({ where: { status: 'RECEIVED' } }),
    ]);

    res.json({
      totalRevenue: totalRevenue._sum.totalAmount || 0,
      totalOrders,
      totalProducts,
      totalCustomers,
      pendingCustom,
      pendingRepairs,
    });
  } catch {
    res.status(500).json({ error: 'Erreur' });
  }
});

export default router;
