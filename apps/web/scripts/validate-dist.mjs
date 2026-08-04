import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

const distDirectory = path.resolve('dist');
const assetsDirectory = path.join(distDirectory, 'assets');
const indexHtml = await readFile(path.join(distDirectory, 'index.html'), 'utf8');
const serviceWorker = await readFile(path.join(distDirectory, 'sw.js'), 'utf8');

assert.match(indexHtml, /<script src="\/boot-recovery\.js"><\/script>/);
assert.match(indexHtml, /<script src="\/registerSW\.js"><\/script>/);
assert.doesNotMatch(indexHtml, /<link[^>]+rel=["']manifest["']/i);
assert.doesNotMatch(indexHtml, /vite-plugin-pwa:register-sw/i);

assert.match(serviceWorker, /sw-device-policy\.js/);
assert.doesNotMatch(serviceWorker, /registerSW\.js/);
assert.doesNotMatch(serviceWorker, /boot-recovery\.js/);
assert.doesNotMatch(serviceWorker, /api-cache/);

const assetFiles = (await readdir(assetsDirectory)).filter((file) => file.endsWith('.js'));
const importGraph = new Map();

for (const file of assetFiles) {
  const source = await readFile(path.join(assetsDirectory, file), 'utf8');
  const dependencies = [];
  for (const match of source.matchAll(/(?:from|import)\s*["']\.\/([^"']+\.js)["']/g)) {
    if (assetFiles.includes(match[1])) dependencies.push(match[1]);
  }
  importGraph.set(file, dependencies);
}

const visited = new Set();
const active = new Set();

function visit(file, route = []) {
  if (active.has(file)) {
    throw new Error(`Dependência circular no build: ${[...route, file].join(' -> ')}`);
  }
  if (visited.has(file)) return;
  active.add(file);
  for (const dependency of importGraph.get(file) ?? []) {
    visit(dependency, [...route, file]);
  }
  active.delete(file);
  visited.add(file);
}

for (const file of assetFiles) visit(file);

console.log('Build web validado: sem PWA no desktop, sem cache de API e sem ciclos entre chunks.');
