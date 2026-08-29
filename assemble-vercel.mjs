import { cpSync, rmSync, mkdirSync, existsSync } from 'fs';
import { execSync } from 'child_process';

// Assemble les builds client + gérant dans ./dist (format Vercel)
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

// Compile backend/app.ts → backend/app.cjs pour que api/index.js puisse l'importer
console.log('Bundling backend/app.ts → backend/app.cjs ...');
execSync(
  'npx esbuild backend/app.ts --bundle --platform=node --format=cjs --packages=external --outfile=backend/app.cjs --log-level=warning',
  { stdio: 'inherit' }
);
console.log('backend/app.cjs bundled');

const files = ['dist/index.html', 'dist/gerant/index.html'];
console.log('Vercel dist assemblé :');
console.log('  ' + files.join('  '));