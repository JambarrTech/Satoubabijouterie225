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

// Bundle api/_index.ts → api/index.js (self-contained, tout le backend inclus)
// _index.ts est préfixé par _ pour que Vercel ne le détecte pas comme Serverless Function
console.log('Bundling api/_index.ts → api/index.js ...');
execSync(
  'npx esbuild api/_index.ts --bundle --platform=node --format=cjs --packages=external --outfile=api/index.js --log-level=warning',
  { stdio: 'inherit' }
);
console.log('api/index.js bundled');

const files = ['dist/index.html', 'dist/gerant/index.html'];
console.log('Vercel dist assemblé :');
console.log('  ' + files.join('  '));