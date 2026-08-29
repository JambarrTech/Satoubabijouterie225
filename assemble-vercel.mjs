import { cpSync, rmSync, mkdirSync, existsSync } from 'fs';
import { execSync } from 'child_process';

// Bundle api/_index.ts → api/index.cjs (CJS — require() works natively)
console.log('Bundling api/_index.ts → api/index.cjs (CJS) ...');
execSync(
  'npx esbuild api/_index.ts --bundle --format=cjs --platform=node --outfile=api/index.cjs --log-level=warning',
  { stdio: 'inherit' }
);
console.log('api/index.cjs bundled');

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

const files = ['dist/index.html', 'dist/gerant/index.html'];
console.log('Vercel dist assemblé :');
console.log('  ' + files.join('  '));
