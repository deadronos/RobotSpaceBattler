#!/usr/bin/env node
const { spawnSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const examplesDir = path.join(__dirname, '..', 'public', 'assets', 'examples');
const outDir = path.join(__dirname, '..', 'public', 'assets', 'optimized');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

const files = fs.readdirSync(examplesDir).filter(f => f.endsWith('.gltf') || f.endsWith('.glb'));
if (files.length === 0) {
  console.log('No glTF/GLB files to optimize in', examplesDir);
  process.exit(0);
}

for (const f of files) {
  const src = path.join(examplesDir, f);
  const dest = path.join(outDir, f.replace(/\.gltf$/, '.glb'));
  console.log('Optimizing', src, '->', dest);
  // Use gltf-transform CLI (if installed) to run a chain: prune, weld, dedup, reorder
  const args = [
    'copy', src, dest,
    '--prune',
    '--weld',
    '--dedup',
    '--reorder',
    '--quantize',
  ];
  const r = spawnSync('gltf-transform', args, { stdio: 'inherit' });
  if (r.status !== 0) {
    console.error('gltf-transform failed for', f);
    process.exit(r.status || 1);
  }
}

console.log('Optimized assets written to', outDir);
