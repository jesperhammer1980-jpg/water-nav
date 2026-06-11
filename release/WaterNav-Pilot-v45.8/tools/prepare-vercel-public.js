'use strict';

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const outDir = path.join(root, 'public');
const files = ['index.html', 'app.js', 'style.css', 'manifest.json', 'sw.js'];
const dirs = ['data'];

function assertExists(target, label = target) {
  if (!fs.existsSync(target)) {
    throw new Error(`Missing required Vercel asset: ${label}`);
  }
}

function copyFile(rel) {
  const src = path.join(root, rel);
  const dst = path.join(outDir, rel);
  assertExists(src, rel);
  fs.mkdirSync(path.dirname(dst), { recursive: true });
  fs.copyFileSync(src, dst);
}

function copyDir(rel) {
  const src = path.join(root, rel);
  const dst = path.join(outDir, rel);
  assertExists(src, rel);
  fs.cpSync(src, dst, { recursive: true });
}

function validateDdmTiles() {
  const manifestRel = path.join('data', 'tiles', 'ddm-tile-manifest.json');
  const manifestPath = path.join(outDir, manifestRel);
  assertExists(manifestPath, manifestRel);
  let manifest;
  try {
    manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  } catch (error) {
    throw new Error(`Invalid ${manifestRel}: ${error.message}`);
  }
  if (!Array.isArray(manifest.tiles) || manifest.tiles.length === 0) {
    throw new Error(`${manifestRel} is empty or has no tiles array`);
  }
  let depthCount = 0;
  let contourCount = 0;
  for (const tile of manifest.tiles) {
    if (tile.depthFile) {
      depthCount += 1;
      assertExists(path.join(outDir, 'data', 'tiles', tile.depthFile), tile.depthFile);
    }
    if (tile.contourFile) {
      contourCount += 1;
      assertExists(path.join(outDir, 'data', 'tiles', tile.contourFile), tile.contourFile);
    }
  }
  assertExists(path.join(outDir, 'data', 'depth-grid-ddm.json'), 'data/depth-grid-ddm.json');
  assertExists(path.join(outDir, 'data', 'depth-grid-ddm-denmark-rle.json'), 'data/depth-grid-ddm-denmark-rle.json');
  return { depthCount, contourCount };
}

fs.rmSync(outDir, { recursive: true, force: true });
fs.mkdirSync(outDir, { recursive: true });

for (const file of files) {
  copyFile(file);
}

for (const dir of dirs) {
  copyDir(dir);
}

const counts = validateDdmTiles();
console.log(`Prepared Vercel public output in ${path.relative(root, outDir)} with ${counts.depthCount} depth tiles and ${counts.contourCount} contour tiles`);
