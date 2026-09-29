import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const prisma = globalForPrisma.prisma || new PrismaClient({
  log: process.env.NODE_ENV === 'production' ? ['error', 'warn'] : ['error', 'warn'],
});

// Singleton y compris en production (serverless Vercel / Neon) :
// évite l'épuisement des connexions sur cold-starts multiples.
globalForPrisma.prisma = prisma;

// Warm up connection pool on startup (reduces Neon cold-start latency)
prisma.$connect().catch(() => {});

export async function disconnectPrisma() {
  try { await prisma.$disconnect(); } catch {}
}