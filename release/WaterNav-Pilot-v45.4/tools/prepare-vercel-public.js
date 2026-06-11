'use strict';

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const outDir = path.join(root, 'public');
const files = ['index.html', 'app.js', 'style.css', 'manifest.json', 'sw.js'];
const dirs = ['data'];

fs.rmSync(outDir, { recursive: true, force: true });
fs.mkdirSync(outDir, { recursive: true });

for (const file of files) {
  fs.copyFileSync(path.join(root, file), path.join(outDir, file));
}

for (const dir of dirs) {
  fs.cpSync(path.join(root, dir), path.join(outDir, dir), { recursive: true });
}

console.log(`Prepared Vercel public output in ${path.relative(root, outDir)}`);
