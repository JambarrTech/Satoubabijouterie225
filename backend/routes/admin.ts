import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../lib/prisma';
import { authenticateToken, requireAdmin, AuthRequest } from '../middleware/auth';

const router = Router();

// Admin: get customers with stats
router.get('/api/customers', authenticateToken, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const customers = await prisma.user.findMany({
      where: { role: 'CUSTOMER' },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        orders: {
          select: { totalAmount: true },
        },
      },
    });

    const result = customers.map((c) => ({
      id: c.id,
      name: c.name,
      email: c.email,
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
router.get('/api/users', authenticateToken, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        createdAt: true,
        _count: {
          select: { orders: true, likes: true, favorites: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const result = users.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      phone: u.phone,
      role: u.role,
      createdAt: u.createdAt,
      ordersCount: u._count.orders,
      likesCount: u._count.likes,
      favoritesCount: u._count.favorites,
    }));

    res.json(result);
  } catch {
    res.status(500).json({ error: 'Erreur' });
  }
});

  // Admin: create user with specific role
  router.post('/api/users', authenticateToken, requireAdmin, async (req: AuthRequest, res) => {
    try {
      const { name, email, password, phone, role = 'ARTISAN' } = req.body;

      if (!name || !email || !password) {
        return res.status(400).json({ error: 'Nom, email et mot de passe requis' });
      }
      if (!['ADMIN', 'ARTISAN'].includes(role)) {
        return res.status(400).json({ error: 'Rôle invalide (ADMIN ou ARTISAN uniquement)' });
      }
      if (typeof password !== 'string' || password.length < 8) {
        return res.status(400).json({ error: 'Le mot de passe doit contenir au moins 8 caractères' });
      }

      const existing = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
      if (existing) {
        return res.status(400).json({ error: 'Un compte existe déjà avec cet email' });
      }

      const hashedPassword = await bcrypt.hash(password, 12);
      const user = await prisma.user.create({
        data: {
          name: name.trim(),
          email: email.toLowerCase(),
          password: hashedPassword,
          phone: phone || null,
          role,
        },
        select: { id: true, name: true, email: true, phone: true, role: true, createdAt: true },
      });

      await prisma.cart.create({ data: { userId: user.id } });

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
    const user = await prisma.user.update({
      where: { id: req.params.id },
      data: { role },
      select: { id: true, name: true, email: true, role: true },
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
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: 'Erreur' });
  }
});

// Admin: get stats
router.get('/api/admin/stats', authenticateToken, requireAdmin, async (req: AuthRequest, res) => {
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
