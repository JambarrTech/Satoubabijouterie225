import { rmSync } from 'fs';

const dirs = ['dist', 'client/dist', 'gerant/dist', 'backend/dist'];
for (const d of dirs) {
  try { rmSync(d, { recursive: true, force: true }); } catch {}
}
console.log('Cleaned build directories.');
