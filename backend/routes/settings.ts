import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { authenticateToken, requireAdmin, AuthRequest } from '../middleware/auth';

const router = Router();

// Public: get all store settings
router.get('/api/store-settings', async (_req, res) => {
  try {
    const settings = await prisma.storeSettings.findMany();
    const result: Record<string, string> = {};
    settings.forEach((s) => { result[s.key] = s.value; });
    res.json(result);
  } catch {
    res.status(500).json({ error: 'Erreur' });
  }
});

// Admin: update store settings
router.put('/api/store-settings', authenticateToken, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const updates = req.body as Record<string, string>;
    for (const [key, value] of Object.entries(updates)) {
      await prisma.storeSettings.upsert({
        where: { key },
        update: { value },
        create: { key, value },
      });
    }
    const settings = await prisma.storeSettings.findMany();
    const result: Record<string, string> = {};
    settings.forEach((s) => { result[s.key] = s.value; });
    res.json(result);
  } catch {
    res.status(500).json({ error: 'Erreur' });
  }
});

// Public: get all material pricing
router.get('/api/material-pricing', async (_req, res) => {
  try {
    const pricing = await prisma.materialPricing.findMany();
    res.json(pricing);
  } catch {
    res.status(500).json({ error: 'Erreur' });
  }
});

// Admin: create material pricing
router.post('/api/material-pricing', authenticateToken, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const { name, pricePerGram, type, description } = req.body;
    if (!name || !pricePerGram) {
      return res.status(400).json({ error: 'Nom et prix requis' });
    }
    const price = Number(pricePerGram);
    if (isNaN(price) || price < 0) {
      return res.status(400).json({ error: 'Prix invalide' });
    }
    const existing = await prisma.materialPricing.findFirst({ where: { name } });
    if (existing) {
      return res.status(400).json({ error: 'Ce matériau existe déjà' });
    }
    const pricing = await prisma.materialPricing.create({
      data: { name, pricePerGram: price, type: type || 'MATERIAL', description: description || '' },
    });
    res.status(201).json(pricing);
  } catch {
    res.status(500).json({ error: 'Erreur' });
  }
});

// Admin: update material pricing
router.put('/api/material-pricing/:id', authenticateToken, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const { pricePerGram, name, type, description } = req.body;
    const data: any = {};
    if (pricePerGram !== undefined) {
      const p = Number(pricePerGram);
      if (isNaN(p) || p < 0) return res.status(400).json({ error: 'Prix invalide' });
      data.pricePerGram = p;
    }
    if (name !== undefined) data.name = name;
    if (type !== undefined) data.type = type;
    if (description !== undefined) data.description = description;

    const pricing = await prisma.materialPricing.update({
      where: { id: req.params.id },
      data,
    });
    res.json(pricing);
  } catch {
    res.status(500).json({ error: 'Erreur' });
  }
});

// Admin: delete material pricing
router.delete('/api/material-pricing/:id', authenticateToken, requireAdmin, async (req: AuthRequest, res) => {
  try {
    await prisma.materialPricing.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: 'Erreur' });
  }
});

export default router;
