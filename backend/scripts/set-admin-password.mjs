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
  await prisma.user.update({
    where: { identifier },
    data: { password: hash }
  });
  console.log('Mot de passe mis a jour pour:', identifier);
  await prisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
