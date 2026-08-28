import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const hash = bcrypt.hashSync('Satouba@123', 12);
  await prisma.user.update({
    where: { email: 'admin@satouba.com' },
    data: { password: hash }
  });
  console.log('Updated:', hash);
  await prisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });