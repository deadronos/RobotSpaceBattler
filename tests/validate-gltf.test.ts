import { existsSync, mkdirSync, rmSync, writeFileSync } from 'fs';
import { join } from 'path';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const { validateGltf } = require('../scripts/validate-assets.cjs');

const TMP = join(process.cwd(), 'tests', 'tmp', 'validate-gltf');

beforeAll(() => {
  if (!existsSync(TMP)) mkdirSync(TMP, { recursive: true });
});

afterAll(() => {
  try {
    rmSync(join(process.cwd(), 'tests', 'tmp'), { recursive: true, force: true });
  } catch {
    // ignore
  }
});

test('validateGltf returns missing for non-existent file', () => {
  const p = join(TMP, 'does-not-exist.gltf');
  const res = validateGltf(p);
  expect(res.ok).toBe(false);
  expect(res.messages.some(m => m.includes('Missing file'))).toBe(true);
});

test('validateGltf returns error for invalid JSON', () => {
  const p = join(TMP, 'invalid.gltf');
  writeFileSync(p, '{ not: valid json }', 'utf8');
  const res = validateGltf(p);
  expect(res.ok).toBe(false);
  expect(res.messages.some(m => m.includes('Invalid JSON'))).toBe(true);
});

test('validateGltf accepts minimal valid glTF', () => {
  const p = join(TMP, 'minimal.gltf');
  const minimal = {
    asset: { extras: { author: 'test', source: 'unit', version: '1.0' } },
    scenes: [0],
    nodes: [0]
  };
  writeFileSync(p, JSON.stringify(minimal), 'utf8');
  const res = validateGltf(p);
  expect(res.ok).toBe(true);
});
