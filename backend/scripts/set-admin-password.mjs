import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const identifier = process.argv[2] || process.env.ADMIN_IDENTIFIER || 'gerantSatoubaBijouterie6002';
const password = process.argv[3] || process.env.ADMIN_PASSWORD;

if (!password) {
  console.error('Usage: node set-admin-password.mjs [identifier] <password>');
  console.error('Or set ADMIN_PASSWORD env var');
  process.exit(1);
}

async function main() {
  const hash = bcrypt.hashSync(password, 12);
  const existing = await prisma.user.findUnique({ where: { identifier } });
  if (!existing) {
    await prisma.user.create({
      data: {
        name: 'Gérant',
        identifier,
        password: hash,
        role: 'ADMIN',
        failedLoginAttempts: 0,
        lockedUntil: null,
      },
    });
    console.log('Compte ADMIN créé pour:', identifier);
  } else {
    await prisma.user.update({
      where: { identifier },
      data: { password: hash, role: 'ADMIN', failedLoginAttempts: 0, lockedUntil: null },
    });
    console.log('Mot de passe mis a jour + rôle ADMIN + verrouillage réinitialisé pour:', identifier);
  }
  await prisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
