import { cpSync, rmSync, mkdirSync, existsSync } from 'fs';

// Assemble les builds client + gérant + API dans ./dist (format Vercel)
rmSync('dist', { recursive: true, force: true });
mkdirSync('dist', { recursive: true });

if (!existsSync('client/dist/index.html')) {
  throw new Error('client/dist/index.html introuvable — exécutez le build client d\'abord');
}
if (!existsSync('gerant/dist/index.html')) {
  throw new Error('gerant/dist/index.html introuvable — exécutez le build gérant d\'abord');
}

cpSync('client/dist', 'dist', { recursive: true });
mkdirSync('dist/gerant', { recursive: true });
cpSync('gerant/dist', 'dist/gerant', { recursive: true });

// Copy backend API dist for Vercel serverless function compatibility
const backendDistSrc = 'backend/dist/server.cjs';
if (existsSync(backendDistSrc)) {
  mkdirSync('dist/backend', { recursive: true });
  cpSync(backendDistSrc, 'dist/backend/server.cjs');
  console.log('  dist/backend/server.cjs (API backend)');
}

// Copy product/category images so /uploads/products/* URLs work in production
const uploadsSrc = 'backend/uploads';
if (existsSync(uploadsSrc)) {
  cpSync(uploadsSrc, 'dist/uploads', { recursive: true });
  console.log('  dist/uploads/ (images static)');
}

const files = ['dist/index.html', 'dist/gerant/index.html'];
console.log('Vercel dist assemblé :');
console.log('  ' + files.join('  '));
